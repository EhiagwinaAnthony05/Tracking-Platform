// CommonJS so the Express API can require() it; Vite and Metro import it as well.

// The delivery flow, in timeline order.
const DELIVERY_STATUSES = [
  'pending',
  'assigned',
  'rider has picked up your item',
  'your rider is on his way',
  'delivered',
]

// Until pickup, the rider still has to reach the sender.
const BEFORE_PICKUP_STATUSES = ['pending', 'assigned']

// Android sends a location every minute; iOS only after movement, so a parked rider goes quiet
// for a while. After this long without an update a rider counts as offline and customers see a warning.
const LOCATION_STALE_AFTER_MS = 10 * 60 * 1000

function formatTimeAgo(value) {
  if (!value) {
    return 'never'
  }

  const elapsedMs = Date.now() - new Date(value).getTime()

  if (!Number.isFinite(elapsedMs)) {
    return 'never'
  }

  const minutes = Math.floor(elapsedMs / 60000)

  if (minutes < 1) {
    return 'just now'
  }

  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} h ago`
  }

  return `${Math.floor(hours / 24)} d ago`
}

module.exports = {
  DELIVERY_STATUSES,
  BEFORE_PICKUP_STATUSES,
  LOCATION_STALE_AFTER_MS,
  formatTimeAgo,
}
