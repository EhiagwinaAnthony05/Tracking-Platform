import { useState } from 'react'
import './SearchBar.css'
import { isTrackingIdFormatValid, normalizeTrackingId } from '../data/trackingData'

function SearchBar({
  placeholder = 'Enter tracking ID...',
  buttonText = 'Track',
  onSubmit,
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [trackingId, setTrackingId] = useState('')
  const [error, setError] = useState('')

  // Fallback validation keeps the component usable outside the main tracking flow.
  const defaultSearch = async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 400))
    return isTrackingIdFormatValid(id)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!trackingId.trim()) {
      setError('Please enter a tracking ID.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const normalizedId = normalizeTrackingId(trackingId)
      const result = onSubmit
        ? await onSubmit(normalizedId)
        : await defaultSearch(normalizedId)

      if (result === false) {
        setError('Use a valid tracking ID like MX00001 and try again.')
      }
    } catch (submitError) {
      console.error(submitError)
      setError('Unable to verify tracking ID. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <form className='search-container' onSubmit={handleSubmit}>
        <input
          type='text'
          className='search-bar'
          placeholder={placeholder}
          aria-label='Search shipments'
          value={trackingId}
          onChange={(e) => {
            setTrackingId(e.target.value.toUpperCase())
            setError('')
          }}
          disabled={isLoading}
        />
        <button
          className='search-btn'
          type='submit'
          aria-label='Track shipment'
          disabled={isLoading}
        >
          {isLoading ? (
            <span className='loader-spinner'></span>
          ) : (
            buttonText
          )}
        </button>
      </form>
      {error && (
        <p className='search-error' role='alert' aria-live='polite'>
          <span className='search-error-icon' aria-hidden='true'>⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export default SearchBar


