import { useEffect, useState } from 'react'
import Header from '../components/Header'
import Map from '../components/Map'
import AdminSectionTabs from './components/AdminSectionTabs'
import RiderManagementPanel from './components/RiderManagementPanel'
import {
  createRiderProfile,
  getRiders,
  deleteRiderProfile,
} from './services/riderService'
import { getAdminProfile, loginAdmin, logoutAdmin } from './services/adminAuthService'
import { describeRiderStatus, sortRidersByAvailability } from './utils/riderStatus'
import './AdminPage.css'
import './AdminRidersPage.css'

function AdminRidersPage() {
  const [riders, setRiders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [riderForm, setRiderForm] = useState({ name: '', phone: '' })
  const [resultMessage, setResultMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [deletingRiderId, setDeletingRiderId] = useState(null)
  const [authForm, setAuthForm] = useState(() => {
    const storedProfileRaw = localStorage.getItem('adminProfile')

    if (!storedProfileRaw) {
      return { email: '', password: '' }
    }

    try {
      const storedProfile = JSON.parse(storedProfileRaw)

      return {
        email: storedProfile?.email || '',
        password: '',
      }
    } catch (_error) {
      return { email: '', password: '' }
    }
  })
  const [authMessage, setAuthMessage] = useState('')
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)

  async function loadRiders(showLoader = true) {
    if (showLoader) {
      setIsLoading(true)
    }

    const result = await getRiders()
    if (result.success) {
      setRiders(result.data)

      setSelectedRiderId((currentSelectedId) => {
        if (result.data.length === 0) {
          return ''
        }

        const selectedStillExists = result.data.some((rider) => rider.id === currentSelectedId)
        if (selectedStillExists) {
          return currentSelectedId
        }

        return result.data[0].id
      })
    } else if (showLoader) {
      setResultMessage(result.error)
    }

    if (showLoader) {
      setIsLoading(false)
    }
  }

  async function handleRefreshRiders() {
    setIsRefreshing(true)
    setResultMessage('Refreshing rider list...')

    try {
      await loadRiders(false)
      setResultMessage('Rider list refreshed.')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function restoreSession() {
      const result = await getAdminProfile()

      if (cancelled) {
        return
      }

      if (!result.success) {
        setIsAdminAuthenticated(false)
        setAdminProfile(null)
        setAuthMessage('Admin sign-in required.')
        setIsAuthChecking(false)
        return
      }

      setIsAdminAuthenticated(true)
      setAdminProfile(result.data)
      setAuthForm((current) => ({
        ...current,
        email: result.data.email,
      }))
      setAuthMessage('')
      setIsAuthChecking(false)
    }

    restoreSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isAdminAuthenticated) {
      return
    }

    let cancelled = false

    async function loadRidersForEffect(showLoader = true) {
      if (showLoader) {
        setIsLoading(true)
      }

      const result = await getRiders()

      if (cancelled) {
        return
      }

      if (result.success) {
        setRiders(result.data)
        setSelectedRiderId((currentSelectedId) => {
          if (result.data.length === 0) {
            return ''
          }

          const selectedStillExists = result.data.some((rider) => rider.id === currentSelectedId)
          if (selectedStillExists) {
            return currentSelectedId
          }

          return result.data[0].id
        })
      } else if (showLoader) {
        setResultMessage(result.error)
      }

      if (showLoader) {
        setIsLoading(false)
      }
    }

    loadRidersForEffect()

    const intervalId = setInterval(() => {
      loadRidersForEffect(false)
    }, 5000)

    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [isAdminAuthenticated])

  async function handleAdminLogin(event) {
    event.preventDefault()

    if (!authForm.email.trim() || !authForm.password.trim()) {
      setAuthMessage('Enter your admin email and password.')
      return
    }

    setIsAuthenticating(true)
    setAuthMessage('Signing in...')

    const result = await loginAdmin({
      email: authForm.email.trim(),
      password: authForm.password,
    })

    if (!result.success) {
      setAuthMessage(result.error)
      setIsAuthenticating(false)
      return
    }

    setIsAdminAuthenticated(true)
    setAdminProfile(result.data)
    setAuthForm((current) => ({
      ...current,
      password: '',
    }))
    setAuthMessage('')
    setIsAuthenticating(false)
  }

  async function handleAdminLogout() {
    await logoutAdmin()
    setIsAdminAuthenticated(false)
    setAdminProfile(null)
    setAuthForm((current) => ({
      ...current,
      password: '',
    }))
    setAuthMessage('You have been signed out.')
  }


  function handleRiderInputChange(event) {
    const { name, value } = event.target
    setRiderForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleRiderSubmit(event) {
    event.preventDefault()
    setResultMessage('')
    setIsSubmitting(true)

    const result = await createRiderProfile(riderForm)

    if (!result.success) {
      setResultMessage(result.error)
      setIsSubmitting(false)
      return
    }

    setResultMessage(`${result.data.name} is ready for rider login.`)
    setRiderForm({ name: '', phone: '' })
    await loadRiders(false)
    setSelectedRiderId(result.data.id)
    setIsSubmitting(false)
  }

  async function handleDeleteRider(riderId, riderName) {
    const confirmed = window.confirm(`Delete rider profile for ${riderName}? This will unassign their active orders.`)
    if (!confirmed) {
      return
    }

    setDeletingRiderId(riderId)
    const result = await deleteRiderProfile(riderId)

    if (!result.success) {
      setResultMessage(result.error)
      setDeletingRiderId(null)
      return
    }

    setResultMessage(`${riderName} profile deleted.`)
    await loadRiders(false)
    setDeletingRiderId(null)
  }

  const selectedRider = riders.find((rider) => rider.id === selectedRiderId) || null

  return (
    <div className='admin-page'>
      <Header />
      <div className='admin-layout'>
        {isAuthChecking ? (
          <section className='admin-loader-wrap' aria-live='polite' aria-busy='true'>
            <div className='admin-loader-spinner' />
            <p>Restoring admin session...</p>
          </section>
        ) : !isAdminAuthenticated ? (
          <section className='admin-card admin-auth-card'>
            <h3>Admin Sign In</h3>
            <p className='admin-auth-note'>Use your admin credentials configured on the backend.</p>
            <form className='admin-form' onSubmit={handleAdminLogin}>
              <input
                type='email'
                name='email'
                placeholder='Admin email'
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                autoComplete='email'
              />
              <input
                type='password'
                name='password'
                placeholder='Password'
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                autoComplete='current-password'
              />
              <button type='submit' disabled={isAuthenticating}>
                {isAuthenticating ? 'Please wait...' : 'Sign In'}
              </button>
            </form>
            {authMessage ? <p className='admin-result'>{authMessage}</p> : null}
          </section>
        ) : (
          <>
        <div className='admin-title-row'>
          <h2>Admin Rider Page</h2>
          <div className='admin-title-actions'>
            <span className='admin-auth-pill'>Signed in as {adminProfile?.email || 'admin'}</span>
            {/* <button type='button' className='admin-back-btn' onClick={() => navigate('/admin')}>
              Back to Customer Page
            </button> */}
            <button type='button' className='admin-back-btn' onClick={handleAdminLogout}>
              Logout
            </button>
          </div>
        </div>

        <AdminSectionTabs />

        <section className='admin-rider-layout'>
          <section className='admin-card'>
            <RiderManagementPanel
              riders={riders}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              form={riderForm}
              onChange={handleRiderInputChange}
              onSubmit={handleRiderSubmit}
              onRefresh={handleRefreshRiders}
              onDelete={handleDeleteRider}
              deletingRiderId={deletingRiderId}
              isSubmitting={isSubmitting}
              result={resultMessage}
            />
          </section>

          <section className='admin-card'>
            <div className='admin-rider-map-toolbar'>
              <label htmlFor='selectedRider'>Live Rider Map</label>
              <select
                id='selectedRider'
                value={selectedRiderId}
                onChange={(event) => setSelectedRiderId(event.target.value)}
              >
                {riders.length === 0 ? <option value=''>No riders available</option> : null}
                {sortRidersByAvailability(riders).map((rider) => (
                  <option key={rider.id} value={rider.id}>
                    {rider.isOnline ? '🟢' : '⚪'} {rider.name} ({rider.phone})
                  </option>
                ))}
              </select>
            </div>

            <Map
              title={selectedRider ? `${selectedRider.name} live location` : 'Rider live location'}
              locationLabel={selectedRider?.lastLocation?.placeName || 'Waiting for rider to share location...'}
              latitude={selectedRider?.lastLocation?.lat}
              longitude={selectedRider?.lastLocation?.lng}
            />

            <div className='admin-rider-meta'>
              <p>Status: {selectedRider ? describeRiderStatus(selectedRider) : 'Offline'}</p>
              <p>
                Last update:{' '}
                {selectedRider?.lastLocation?.updatedAt
                  ? new Date(selectedRider.lastLocation.updatedAt).toLocaleString()
                  : 'No live location yet'}
              </p>
            </div>
          </section>
        </section>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminRidersPage
