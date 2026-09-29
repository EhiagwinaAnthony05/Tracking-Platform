import './TrackingPage.css'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import WhatsAppButton from './components/WhatsAppButton'
import Map from './components/Map'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { isTrackingIdFormatValid, normalizeTrackingId } from './data/trackingData'
import { formatTimeAgo, LOCATION_STALE_AFTER_MS } from '@movex/shared'

function hasAssignedRider(shipment) {
  return Boolean(shipment?.rider?.name) && shipment.rider.name !== 'Unassigned'
}

function describeEta(shipment) {
  if (shipment?.delivery?.status === 'delivered') {
    return shipment.deliveredAt ? `Delivered ${new Date(shipment.deliveredAt).toLocaleString()}` : 'Delivered'
  }

  if (!hasAssignedRider(shipment)) {
    return 'A rider will be assigned soon.'
  }

  if (shipment.rider.estimatedDelivery) {
    return `Arriving in about ${shipment.rider.estimatedDelivery}`
  }

  return 'Calculating once your rider shares their location...'
}

function describeMapLocation(shipment) {
  if (!shipment) {
    return 'Tracking details update once a valid shipment is selected.'
  }

  const place = shipment.rider?.currentLocation || 'Waiting for rider location'
  const updatedAt = shipment.rider?.location?.updatedAt

  return updatedAt ? `${place} · updated ${formatTimeAgo(updatedAt)}` : place
}

function isLocationStale(shipment) {
  const updatedAt = shipment?.rider?.location?.updatedAt

  if (!updatedAt || shipment?.delivery?.status === 'delivered') {
    return false
  }

  return Date.now() - new Date(updatedAt).getTime() > LOCATION_STALE_AFTER_MS
}

function TrackingPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')

  const trackingId = normalizeTrackingId(id)
  const [shipment, setShipment] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let ignore = false
    let intervalId = null

    async function loadShipment({ silent = false } = {}) {
      if (!isTrackingIdFormatValid(trackingId)) {
        setShipment(null)
        setIsLoading(false)
        setErrorMessage('')
        return
      }

      try {
        if (!ignore && !silent) {
          setIsLoading(true)
        }

        if (!ignore) {
          setErrorMessage('')
        }

        const response = await fetch(`${apiBaseUrl}/api/tracking/${trackingId}`)

        if (!response.ok) {
          if (!ignore) {
            setShipment(null)
            setErrorMessage(response.status >= 500 ? 'Unable to load tracking details right now. Please try again.' : '')
          }
          return
        }

        const data = await response.json()

        if (!ignore) {
          setShipment(data)
        }

        // Nothing moves after delivery, so stop polling.
        if (data?.delivery?.status === 'delivered' && intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      } catch {
        if (!ignore) {
          setShipment(null)
          setErrorMessage('Network error while loading tracking details. Check your connection and try again.')
        }
      } finally {
        if (!ignore && !silent) {
          setIsLoading(false)
        }
      }
    }

    loadShipment()

    intervalId = setInterval(() => {
      loadShipment({ silent: true })
    }, 10000)

    return () => {
      ignore = true
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [apiBaseUrl, retryKey, trackingId])

  const handleSearch = async (value) => {
    const nextId = normalizeTrackingId(value)

    if (!isTrackingIdFormatValid(nextId)) {
      return false
    }

    navigate(`/tracking/${nextId}`)
    return true
  }

  function handleGoHome() {
    navigate('/')
  }

  return (
    <div className='tracking-page'>
      <Header />
      <div className='tracking-top-actions'>
        <SearchBar placeholder='Search another tracking ID' onSubmit={handleSearch} />
        <button type='button' className='go-home-button' onClick={handleGoHome}>
          Go Back Home
        </button>
      </div>
      <Map
        title='Live Tracking'
        locationLabel={describeMapLocation(shipment)}
        latitude={shipment?.rider?.location?.lat}
        longitude={shipment?.rider?.location?.lng}
      />
      <WhatsAppButton />
      <div className='status-container'>
        {isLoading ? (
          <div className='tracking-empty'>
            <h2>Loading tracking details...</h2>
            <p>Please wait.</p>
          </div>
        ) : errorMessage ? (
          <div className='tracking-empty'>
            <h2>Unable to load tracking details</h2>
            <p>{errorMessage}</p>
            <button type='button' className='retry-button' onClick={() => setRetryKey((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : shipment ? (
          <>
            <div className='tracking-info'>
              <h2>Tracking ID: {trackingId}</h2>
              <p>Sender: {shipment.sender?.name || '-'}</p>
              <p>Receiver: {shipment.receiver?.name || '-'}</p>
              <p>Package: {shipment.package?.description || '-'}</p>
              <p>Delivery Status: {shipment.delivery?.status || '-'}</p>
              <p>Rider&apos;s Name: {shipment.rider?.name || '-'}</p>
              <p>Rider&apos;s Phone: {shipment.rider?.phone || '-'}</p>
              <p>ETA: {describeEta(shipment)}</p>
              {isLocationStale(shipment) ? (
                <p className='tracking-stale-note'>
                  Your rider&apos;s location last updated {formatTimeAgo(shipment.rider.location.updatedAt)}. It will refresh
                  automatically when they are back online.
                </p>
              ) : null}
            </div>
            <div className='tracking-status'>
              <h3>Shipment Progress</h3>
              <div className='tracking-timeline'>
                {shipment.steps.map((step, index) => (
                  <div key={`${step.status}-${index}`} className={`timeline-step ${step.completed ? 'completed' : 'pending'}`}>
                    <div className='timeline-marker'>
                      <div className='timeline-dot'>
                        {step.completed && <Check size={12} className='timeline-check' />}
                      </div>
                      {index < shipment.steps.length - 1 && <div className='timeline-line'></div>}
                    </div>
                    <div className='timeline-content'>
                      <div className='timeline-header'>
                        <h4>{step.status}</h4>
                        {step.completed && step.date && step.time ? (
                          <span className='timeline-date'>{step.date} {step.time}</span>
                        ) : null}
                      </div>
                      <p className='timeline-description'>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className='tracking-empty'>
            <h2>Tracking ID not found</h2>
            <p>
              {isTrackingIdFormatValid(trackingId)
                ? `No shipment was found for ${trackingId}.`
                : 'Use a valid tracking ID and try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackingPage
