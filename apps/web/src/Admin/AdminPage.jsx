import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import AdminSectionTabs from './components/AdminSectionTabs'
import CreateOrderForm from './components/CreateOrderForm'
import UpdateOrderStatusForm from './components/UpdateOrderStatusForm'
import TrackOrderPreview from './components/TrackOrderPreview'
import useAdminOrdersDashboard from './hooks/useAdminOrdersDashboard'
import useOrderManagementForms from './hooks/useOrderManagementForms'
import { getAdminProfile, loginAdmin, logoutAdmin } from './services/adminAuthService'
import './AdminPage.css'

function AdminPage() {
  const navigate = useNavigate()
  const [isManagerOpen, setIsManagerOpen] = useState(false)
  const [managerMode, setManagerMode] = useState('create')
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

  const {
    previewId,
    setPreviewId,
    orders,
    summaryPeriod,
    summaryDate,
    summary,
    summaryRange,
    activeOrderId,
    isSummaryLoading,
    storageMessage,
    isStorageLoading,
    isInitialLoading,
    refreshDashboardData,
    handleSummaryPeriodChange,
    handleSummaryDateChange,
    handlePreviewSubmit,
    handleDeleteOrder,
    handleAssignOrder,
    handleUnassignOrder,
    handleEndTrip,
  } = useAdminOrdersDashboard({ enabled: isAdminAuthenticated })

  const {
    createForm,
    updateForm,
    createResult,
    updateResult,
    isCreating,
    isUpdating,
    handleCreateChange,
    handleUpdateChange,
    preloadUpdateForm,
    handleCreateSubmit,
    handleUpdateSubmit,
    deliveryStatusOptions,
    riders,
    isRidersLoading,
    refreshRiders,
  } = useOrderManagementForms({
    enabled: isAdminAuthenticated,
    onMutationSuccess: refreshDashboardData,
  })

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

  // Assigning or ending a trip changes each rider's active order count.
  async function withRiderRefresh(action) {
    const succeeded = await action()

    if (succeeded) {
      await refreshRiders()
    }

    return succeeded
  }

  function handleEditShortcut(order) {
    setManagerMode('update')
    setIsManagerOpen(true)
    preloadUpdateForm(order)
  }

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
        ) : isInitialLoading ? (
          <section className='admin-loader-wrap' aria-live='polite' aria-busy='true'>
            <div className='admin-loader-spinner' />
            <p>Loading admin dashboard...</p>
          </section>
        ) : (
          <>
        <div className='admin-title-row'>
          <h2>Admin Customer Page</h2>
          <div className='admin-title-actions'>
            <span className='admin-auth-pill'>Signed in as {adminProfile?.email || 'admin'}</span>
            <button type='button' className='admin-back-btn' onClick={() => navigate('/')}>
              Back to Home
            </button>
            <button type='button' className='admin-back-btn' onClick={handleAdminLogout}>
              Logout
            </button>
            <button
              type='button'
              className='admin-open-btn'
              onClick={() => {
                setManagerMode('create')
                setIsManagerOpen(true)
                refreshRiders()
              }}
            >
              Create Order
            </button>
            <button
              type='button'
              className='admin-open-btn'
              onClick={() => {
                setManagerMode('update')
                setIsManagerOpen(true)
              }}
            >
              Update Order Status
            </button>
          </div>
        </div>

        <AdminSectionTabs />

        <TrackOrderPreview
          previewId={previewId}
          setPreviewId={setPreviewId}
          onSubmit={handlePreviewSubmit}
          isLoading={isStorageLoading}
          summaryPeriod={summaryPeriod}
          summaryDate={summaryDate}
          onSummaryPeriodChange={handleSummaryPeriodChange}
          onSummaryDateChange={handleSummaryDateChange}
          summary={summary}
          summaryRange={summaryRange}
          activeOrderId={activeOrderId}
          isSummaryLoading={isSummaryLoading}
          storageMessage={storageMessage}
          orders={orders}
          onEdit={handleEditShortcut}
          onDelete={handleDeleteOrder}
          riders={riders}
          onRefreshRiders={refreshRiders}
          onAssign={(trackingId, riderId) => withRiderRefresh(() => handleAssignOrder(trackingId, riderId))}
          onUnassign={(trackingId) => withRiderRefresh(() => handleUnassignOrder(trackingId))}
          onEndTrip={(trackingId) => withRiderRefresh(() => handleEndTrip(trackingId))}
        />

        {isManagerOpen && (
          <div className='admin-modal-overlay' onClick={() => setIsManagerOpen(false)}>
            <section className='admin-card admin-manager-card admin-modal' onClick={(event) => event.stopPropagation()}>
              <div className='admin-manager-header'>
                <h3>{managerMode === 'create' ? 'Create Order' : 'Update Order Status'}</h3>
                <button type='button' className='admin-close-btn' onClick={() => setIsManagerOpen(false)}>
                  Close
                </button>
              </div>
              {managerMode === 'create' ? (
                <CreateOrderForm
                  form={createForm}
                  onChange={handleCreateChange}
                  onSubmit={handleCreateSubmit}
                  isSubmitting={isCreating}
                  result={createResult}
                  statusOptions={deliveryStatusOptions}
                  riders={riders}
                  isRidersLoading={isRidersLoading}
                />
              ) : (
                <UpdateOrderStatusForm
                  form={updateForm}
                  onChange={handleUpdateChange}
                  onSubmit={handleUpdateSubmit}
                  isSubmitting={isUpdating}
                  result={updateResult}
                  statusOptions={deliveryStatusOptions}
                />
              )}
            </section>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  )
}

export default AdminPage