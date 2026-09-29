import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import './RiderPage.css'

const SEND_INTERVAL_MS = 5000

function RiderPage() {
  const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')

  const watchIdRef = useRef(null)
  const lastSentRef = useRef(0)

  function clearLocationWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  const [authForm, setAuthForm] = useState({ name: '', phone: '' })
  const [token, setToken] = useState(() => localStorage.getItem('riderToken') || '')
  const [rider, setRider] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(() => Boolean(localStorage.getItem('riderToken')))
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Login with your rider name and phone number provided by admin.')
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null)

  const loadRiderSession = useCallback(async (currentToken = token) => {
    const response = await fetch(`${apiBaseUrl}/api/riders/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Request failed.')
    }

    setRider(data)
    setIsSharing(Boolean(data.isSharing))
    setLastLocationUpdate(data.lastLocation?.updatedAt || null)
    setStatusMessage(`Welcome ${data.name}.`)

    return data
  }, [apiBaseUrl, token])

  useEffect(() => {
    return () => {
      clearLocationWatch()
    }
  }, [])

  useEffect(() => {
    // isCheckingSession starts true only when a saved token exists; the finally block clears it.
    if (!token) {
      return
    }

    let cancelled = false

    async function restoreRiderSession() {
      try {
        await loadRiderSession(token)

        if (cancelled) {
          return
        }
      } catch (error) {
        if (cancelled) {
          return
        }

        setStatusMessage(error.message)
        localStorage.removeItem('riderToken')
        setToken('')
        setRider(null)
      } finally {
        if (!cancelled) {
          setIsCheckingSession(false)
        }
      }
    }

    restoreRiderSession()

    return () => {
      cancelled = true
    }
  }, [loadRiderSession, token])

  async function riderFetch(path, options = {}, currentToken = token) {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
        ...(options.headers || {}),
      },
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.message || 'Request failed.')
    }

    return data
  }

  async function handleAuth() {
    if (!authForm.name.trim() || !authForm.phone.trim()) {
      setStatusMessage('Enter your rider name and phone number.')
      return
    }

    setIsSubmittingAuth(true)
    setStatusMessage('Signing in...')

    try {
      const response = await fetch(`${apiBaseUrl}/api/riders/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authForm.name.trim(),
          phone: authForm.phone.trim(),
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed.')
      }

      localStorage.setItem('riderToken', data.token)
      setToken(data.token)
      setRider(data.rider)
      setStatusMessage(`Welcome ${data.rider.name}.`)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsSubmittingAuth(false)
    }
  }

  async function sendLocation(position) {
    const now = Date.now()
    if (now - lastSentRef.current < SEND_INTERVAL_MS) {
      return
    }

    lastSentRef.current = now

    const payload = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: Number.isFinite(position.coords.heading) ? position.coords.heading : undefined,
      speed: Number.isFinite(position.coords.speed) ? position.coords.speed : undefined,
      capturedAt: new Date(position.timestamp).toISOString(),
    }

    const data = await riderFetch('/api/riders/me/location', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    setLastLocationUpdate(data.rider.lastLocation?.updatedAt || payload.capturedAt)
    setRider(data.rider)
    setStatusMessage('Location shared successfully.')
  }

  async function stopSharing() {
    clearLocationWatch()

    try {
      await riderFetch('/api/riders/me/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isSharing: false }),
      })
    } catch (_error) {
      // Keep local stop behavior even if network call fails.
    }

    setIsSharing(false)
    setStatusMessage('Location sharing stopped.')
  }

  async function handleLogout() {
    clearLocationWatch()

    try {
      await riderFetch('/api/riders/me/sharing', {
        method: 'PATCH',
        body: JSON.stringify({ isSharing: false }),
      })
    } catch (_error) {
      // Sign out locally even if the server cannot be reached.
    }

    localStorage.removeItem('riderToken')
    setToken('')
    setRider(null)
    setIsSharing(false)
    setStatusMessage('You have signed out.')
  }

  function startSharing() {
    if (!token) {
      setStatusMessage('Login before sharing location.')
      return
    }

    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by this browser.')
      return
    }

    clearLocationWatch()
    setStatusMessage('Requesting location permission...')

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await sendLocation(position)
          setIsSharing(true)
        } catch (error) {
          setStatusMessage(error.message)
        }
      },
      (positionError) => {
        setStatusMessage(positionError.message || 'Unable to access GPS location.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 10000,
      }
    )
  }

  async function handleRefresh() {
    if (!token) {
      setStatusMessage('Login before refreshing your rider status.')
      return
    }

    setIsRefreshing(true)

    try {
      await loadRiderSession(token)
      setStatusMessage('Rider status refreshed.')
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className='rider-page'>
      <Header />
      <main className='rider-dashboard'>
        <section className='rider-dashboard__header'>
          <div>
            <h2>Rider Dashboard</h2>
            <p className='rider-status'>{statusMessage}</p>
          </div>
          {rider ? (
            <div className='rider-kpi'>
              <span className='rider-kpi__label'>Logged in rider</span>
              <strong className='rider-kpi__value'>{rider.name} ({rider.phone})</strong>
            </div>
          ) : null}
        </section>

        {isCheckingSession ? (
          <section className='rider-toolbar'>
            <p className='rider-status'>Restoring session...</p>
          </section>
        ) : !rider ? (
          <section className='rider-toolbar'>
            <form className='rider-add-form' onSubmit={(event) => event.preventDefault()}>
              <p className='rider-admin-note'>Contact admin to create your rider profile before login.</p>
              <label htmlFor='riderName'>Name</label>
              <div className='rider-add-form__controls'>
                <input
                  id='riderName'
                  value={authForm.name}
                  onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder='e.g. John Rider'
                  autoComplete='name'
                />
              </div>
              <label htmlFor='riderPhone'>Phone</label>
              <div className='rider-add-form__controls'>
                <input
                  id='riderPhone'
                  value={authForm.phone}
                  onChange={(event) => setAuthForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder='e.g. 08012345678'
                  autoComplete='tel'
                />
              </div>
            </form>

            <div className='rider-actions'>
              <button type='button' className='rider-btn primary' onClick={handleAuth} disabled={isSubmittingAuth}>
                {isSubmittingAuth ? 'Please wait...' : 'Login'}
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className='rider-toolbar'>
              <div className='rider-actions'>
                <button type='button' className='rider-btn primary' onClick={startSharing} disabled={isSharing}>
                  Start Sharing
                </button>
                <button type='button' className='rider-btn secondary' onClick={stopSharing} disabled={!isSharing}>
                  Stop Sharing
                </button>
                <button type='button' className='rider-btn secondary' onClick={handleRefresh} disabled={isRefreshing}>
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <button type='button' className='rider-btn secondary' onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </section>

            <div className='rider-footer-note'>
              <p>Last update: {lastLocationUpdate ? new Date(lastLocationUpdate).toLocaleString() : 'No live update yet'}</p>
              <p>Current place: {rider.lastLocation?.placeName || 'Waiting for location sharing...'}</p>
            </div>
          </>
        )}

      </main>
    </div>
  )
}

export default RiderPage
