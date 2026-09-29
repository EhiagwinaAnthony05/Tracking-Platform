import './SearchOrderForm.css'

function SearchOrderForm({ previewId, setPreviewId, onSubmit, isLoading }) {
  return (
    <form onSubmit={onSubmit} className='admin-form admin-preview-form'>
      <input
        name='previewId'
        placeholder='Tracking ID (MX00001)'
        value={previewId}
        onChange={(event) => setPreviewId(event.target.value)}
        required
      />
      <button type='submit' disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Search Order'}
      </button>
    </form>
  )
}

export default SearchOrderForm