import { formatTimeAgo } from '@movex/shared'

export function describeRiderStatus(rider) {
  const updatedAgo = formatTimeAgo(rider?.lastLocation?.updatedAt)

  return rider?.isOnline ? `Online · updated ${updatedAgo}` : `Offline · last seen ${updatedAgo}`
}

function describeActiveOrders(count = 0) {
  if (!count) {
    return 'free'
  }

  return `${count} active order${count === 1 ? '' : 's'}`
}

// Dropdown text: online riders get a marker so dispatch can pick someone who is actually live.
export function getRiderOptionLabel(rider) {
  const marker = rider.isOnline ? '🟢' : '⚪'
  const status = rider.isOnline ? 'online' : 'offline'

  return `${marker} ${rider.name} (${rider.phone}) · ${status} · ${describeActiveOrders(rider.activeOrderCount)}`
}

// Online riders first, then the least busy, then by name.
export function sortRidersByAvailability(riders = []) {
  return [...riders].sort((left, right) => {
    if (Boolean(left.isOnline) !== Boolean(right.isOnline)) {
      return left.isOnline ? -1 : 1
    }

    if ((left.activeOrderCount || 0) !== (right.activeOrderCount || 0)) {
      return (left.activeOrderCount || 0) - (right.activeOrderCount || 0)
    }

    return left.name.localeCompare(right.name)
  })
}

export function getRiderAssignmentWarning(rider) {
  if (!rider) {
    return ''
  }

  const warnings = []

  if (!rider.isOnline) {
    warnings.push(`${rider.name} is not sharing a live location right now.`)
  }

  if (rider.activeOrderCount > 0) {
    warnings.push(`${rider.name} already has ${describeActiveOrders(rider.activeOrderCount)}.`)
  }

  return warnings.join(' ')
}
