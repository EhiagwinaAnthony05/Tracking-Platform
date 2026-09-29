const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org'
const NOMINATIM_HEADERS = { 'User-Agent': 'move-x/1.0 (delivery-tracking)' }
const NOMINATIM_TIMEOUT_MS = 4000

// Bias address searches towards Lagos without excluding the rest of Nigeria.
const LAGOS_VIEWBOX = '2.70,6.75,4.35,6.35'

// Straight-line distance undercounts real road distance in a city.
const ROAD_DISTANCE_FACTOR = 1.3
// Average dispatch-bike speed in Lagos traffic (20 km/h). Instant GPS speed is too noisy to use.
const AVERAGE_SPEED_MPS = 20000 / 3600

async function fetchNominatim(path) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NOMINATIM_TIMEOUT_MS)

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}${path}`, {
      headers: NOMINATIM_HEADERS,
      signal: controller.signal,
    })

    if (!response.ok) {
      return null
    }

    return await response.json().catch(() => null)
  } catch (_error) {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function resolveLocationName(lat, lng) {
  const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  const data = await fetchNominatim(`/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`)
  const name = data?.name || data?.display_name

  return typeof name === 'string' && name ? name : fallback
}

async function geocodeAddress(address) {
  if (!address || typeof address !== 'string') {
    return null
  }

  const query = new URLSearchParams({
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'ng',
    viewbox: LAGOS_VIEWBOX,
    q: address,
  })
  const results = await fetchNominatim(`/search?${query}`)
  const match = Array.isArray(results) ? results[0] : null
  const lat = Number(match?.lat)
  const lng = Number(match?.lon)

  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

function hasCoordinates(point) {
  return Number.isFinite(point?.lat) && Number.isFinite(point?.lng)
}

function calculateDistanceKm(from, to) {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Returns minutes along the given stops (e.g. rider -> pickup -> drop-off), or null if any stop is unknown.
function estimateTravelMinutes(stops) {
  if (stops.length < 2 || !stops.every(hasCoordinates)) {
    return null
  }

  let distanceKm = 0
  for (let index = 1; index < stops.length; index += 1) {
    distanceKm += calculateDistanceKm(stops[index - 1], stops[index])
  }

  const roadDistanceMeters = distanceKm * 1000 * ROAD_DISTANCE_FACTOR
  return Math.max(1, Math.ceil(roadDistanceMeters / AVERAGE_SPEED_MPS / 60))
}

module.exports = {
  resolveLocationName,
  geocodeAddress,
  hasCoordinates,
  calculateDistanceKm,
  estimateTravelMinutes,
}
