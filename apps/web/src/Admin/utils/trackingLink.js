export function getTrackingUrl(trackingId) {
  return `${window.location.origin}/tracking/${trackingId}`
}

// wa.me needs an international number without "+"; Nigerian local numbers start with 0.
function toWhatsAppPhone(phone = '') {
  const digits = phone.replace(/\D/g, '')

  if (digits.startsWith('0')) {
    return `234${digits.slice(1)}`
  }

  return digits
}

export function getWhatsAppShareUrl(order) {
  const receiverName = order.receiver?.name ? ` ${order.receiver.name}` : ''
  const message = `Hi${receiverName}, your MoveX delivery ${order.trackingId} is on the way. Track it live here: ${getTrackingUrl(order.trackingId)}`

  return `https://wa.me/${toWhatsAppPhone(order.receiver?.phone)}?text=${encodeURIComponent(message)}`
}

export async function copyTrackingUrl(trackingId) {
  const url = getTrackingUrl(trackingId)

  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch (_error) {
    window.prompt('Copy this tracking link:', url)
    return false
  }
}
