// Normalize user input before validation and route lookups.
export function normalizeTrackingId(id = '') {
  return id.trim().toUpperCase()
}

export function isTrackingIdFormatValid(id = '') {
  return /^(MX\d{5}|MXX\d{3})$/.test(normalizeTrackingId(id))
}
