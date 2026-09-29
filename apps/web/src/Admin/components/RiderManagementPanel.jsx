import { describeRiderStatus } from '../utils/riderStatus'

function RiderManagementPanel({
  riders,
  isLoading,
  isRefreshing,
  form,
  onChange,
  onSubmit,
  onRefresh,
  onDelete,
  deletingRiderId,
  isSubmitting,
  result,
}) {
  return (
    <div>
      <form onSubmit={onSubmit} className='admin-form'>
        <input name='name' placeholder='Rider name' value={form.name} onChange={onChange} required />
        <input name='phone' placeholder='Rider phone number' value={form.phone} onChange={onChange} required />
        <button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Rider'}</button>
      </form>

      {result ? <p className='admin-result'>{result}</p> : null}

      <div className='admin-rider-list'>
        <div className='admin-rider-list__header'>
          <h4>Registered Riders</h4>
          <button type='button' className='admin-refresh-btn' onClick={onRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        {isLoading ? <p className='admin-result'>Loading riders...</p> : null}
        {!isLoading && riders.length === 0 ? <p className='admin-result'>No riders yet.</p> : null}
        {riders.map((rider) => (
          <article key={rider.id} className='admin-rider-item'>
            <p><strong>{rider.name}</strong> ({rider.phone})</p>
            <p>Status: {describeRiderStatus(rider)}</p>
            <p>Active orders: {rider.activeOrderCount || 0}</p>
            <p>Last location: {rider.lastLocation?.placeName || 'No location yet'}</p>
            <button
              type='button'
              className='admin-delete-rider-btn'
              disabled={deletingRiderId === rider.id}
              onClick={() => onDelete(rider.id, rider.name)}
            >
              {deletingRiderId === rider.id ? 'Deleting...' : 'Delete Rider'}
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export default RiderManagementPanel
