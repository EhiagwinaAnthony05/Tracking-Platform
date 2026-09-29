function UpdateOrderStatusForm({ form, onChange, onSubmit, isSubmitting, result, statusOptions }) {
  return (
    <div>
      <form onSubmit={onSubmit} className='admin-form'>
        <input name='trackingId' placeholder='Tracking ID (MX00001)' value={form.trackingId} onChange={onChange} required />
        <select name='delivery.status' value={form.delivery.status} onChange={onChange}>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
        <input name='receiver.location.lat' placeholder='Receiver latitude (optional)' value={form.receiver.location.lat} onChange={onChange} />
        <input name='receiver.location.lng' placeholder='Receiver longitude (optional)' value={form.receiver.location.lng} onChange={onChange} />
        <input name='rider.name' placeholder='Rider name (optional)' value={form.rider.name} onChange={onChange} />
        <input name='rider.phone' placeholder='Rider phone (optional)' value={form.rider.phone} onChange={onChange} />
        <button type='submit' disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Status'}</button>
      </form>
      {result && <p className='admin-result'>{result}</p>}
    </div>
  )
}

export default UpdateOrderStatusForm