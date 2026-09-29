const jwt = require('jsonwebtoken')
const Rider = require('../models/Rider')
const { LOCATION_STALE_AFTER_MS } = require('@movex/shared')
const Order = require('../models/Orders')
const { syncActiveOrdersForRider } = require('./orderControllers')
const { calculateDistanceKm, resolveLocationName } = require('../utils/location')

// A rider counts as online only while sharing and sending fresh locations.
// Reuse the previous place name for small, recent moves instead of calling the geocoder on every update.
const PLACE_NAME_REUSE_DISTANCE_KM = 0.15
const PLACE_NAME_REUSE_MS = 2 * 60 * 1000

function isRiderOnline(riderObj) {
  const updatedAt = riderObj.lastLocation?.updatedAt ? new Date(riderObj.lastLocation.updatedAt).getTime() : 0
  return Boolean(riderObj.isSharing) && Date.now() - updatedAt <= LOCATION_STALE_AFTER_MS
}

function toPublicRiderShape(rider, activeOrderCount = 0) {
  const riderObj = rider.toObject ? rider.toObject() : rider

  return {
    id: String(riderObj._id),
    name: riderObj.name,
    phone: riderObj.phone,
    isSharing: Boolean(riderObj.isSharing),
    isOnline: isRiderOnline(riderObj),
    activeOrderCount,
    lastLocation: {
      lat: riderObj.lastLocation?.lat ?? null,
      lng: riderObj.lastLocation?.lng ?? null,
      placeName: riderObj.lastLocation?.placeName || '',
      accuracy: riderObj.lastLocation?.accuracy ?? null,
      heading: riderObj.lastLocation?.heading ?? null,
      speed: riderObj.lastLocation?.speed ?? null,
      updatedAt: riderObj.lastLocation?.updatedAt ?? null,
    },
    createdAt: riderObj.createdAt,
    updatedAt: riderObj.updatedAt,
  }
}

function getRiderJwtSecret() {
  const secret = process.env.RIDER_JWT_SECRET

  if (!secret) {
    throw new Error('RIDER_JWT_SECRET is required')
  }

  return secret
}

function createRiderToken(riderId) {
  return jwt.sign({ riderId: String(riderId) }, getRiderJwtSecret())
}

async function ensureRiderAuthToken(rider) {
  if (rider.authToken) {
    return rider.authToken
  }

  rider.authToken = createRiderToken(rider._id)
  await rider.save()
  return rider.authToken
}

async function getPlaceName(previousLocation, lat, lng) {
  const previousUpdatedAt = previousLocation?.updatedAt ? new Date(previousLocation.updatedAt).getTime() : 0
  const canReuse =
    previousLocation?.placeName &&
    Number.isFinite(previousLocation.lat) &&
    Number.isFinite(previousLocation.lng) &&
    Date.now() - previousUpdatedAt <= PLACE_NAME_REUSE_MS &&
    calculateDistanceKm(previousLocation, { lat, lng }) <= PLACE_NAME_REUSE_DISTANCE_KM

  return canReuse ? previousLocation.placeName : resolveLocationName(lat, lng)
}

async function signupRider(req, res) {
  try {
    const normalizedPhone = req.validatedBody.phone.trim()
    const normalizedName = req.validatedBody.name.trim()

    let rider = await Rider.findOne({ phone: normalizedPhone })

    if (rider) {
      rider.name = normalizedName
      await rider.save()
    } else {
      rider = new Rider({
        name: normalizedName,
        phone: normalizedPhone,
      })
      rider.authToken = createRiderToken(rider._id)
      await rider.save()
    }

    const authToken = await ensureRiderAuthToken(rider)

    return res.status(201).json({
      rider: toPublicRiderShape(rider),
      token: authToken,
    })
  } catch (error) {
    if (error.message === 'RIDER_JWT_SECRET is required') {
      return res.status(500).json({ message: 'Rider auth is not configured on the server.' })
    }

    return res.status(500).json({ message: 'Server error' })
  }
}

async function loginRider(req, res) {
  try {
    const normalizedPhone = req.validatedBody.phone.trim()
    const normalizedName = req.validatedBody.name.trim().toLowerCase()

    const rider = await Rider.findOne({ phone: normalizedPhone })

    if (!rider || rider.name.trim().toLowerCase() !== normalizedName) {
      return res.status(401).json({ message: 'Invalid rider name or phone.' })
    }

    const authToken = await ensureRiderAuthToken(rider)

    return res.json({
      rider: toPublicRiderShape(rider),
      token: authToken,
    })
  } catch (error) {
    if (error.message === 'RIDER_JWT_SECRET is required') {
      return res.status(500).json({ message: 'Rider auth is not configured on the server.' })
    }

    return res.status(500).json({ message: 'Server error' })
  }
}

async function getRiders(_req, res) {
  try {
    const [riders, activeOrderCounts] = await Promise.all([
      Rider.find().sort({ createdAt: -1 }),
      Order.aggregate([
        { $match: { 'rider.riderId': { $nin: ['', null] }, 'delivery.status': { $ne: 'delivered' } } },
        { $group: { _id: '$rider.riderId', count: { $sum: 1 } } },
      ]),
    ])
    const countByRiderId = new Map(activeOrderCounts.map((entry) => [entry._id, entry.count]))

    return res.json(riders.map((rider) => toPublicRiderShape(rider, countByRiderId.get(String(rider._id)) || 0)))
  } catch (_error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

async function getAuthenticatedRider(req, res) {
  return res.json(toPublicRiderShape(req.rider))
}

async function updateMyLocation(req, res) {
  try {
    const rider = req.rider
    const { lat, lng, accuracy, heading, speed, capturedAt } = req.validatedBody
    const locationTimestamp = capturedAt ? new Date(capturedAt) : new Date()
    const placeName = await getPlaceName(rider.lastLocation, lat, lng)

    rider.set('lastLocation', {
      lat,
      lng,
      placeName,
      accuracy: accuracy ?? null,
      heading: heading ?? null,
      speed: speed ?? null,
      updatedAt: locationTimestamp,
    })
    rider.isSharing = true
    await rider.save()

    try {
      await syncActiveOrdersForRider(rider)
    } catch (error) {
      // The rider's own location is saved; order ETAs catch up on the next update.
      console.error('syncActiveOrdersForRider error:', error)
    }

    return res.json({
      rider: toPublicRiderShape(rider),
    })
  } catch (_error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

async function updateSharingState(req, res) {
  try {
    const rider = req.rider
    rider.isSharing = req.validatedBody.isSharing
    await rider.save()

    return res.json(toPublicRiderShape(rider))
  } catch (_error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

async function deleteRiderProfile(req, res) {
  try {
    const riderId = req.params.id
    const rider = await Rider.findById(riderId)

    if (!rider) {
      return res.status(404).json({ message: 'Rider not found.' })
    }

    await Order.updateMany(
      {
        $or: [
          { 'rider.riderId': String(rider._id) },
          { 'rider.phone': rider.phone },
        ],
        'delivery.status': { $ne: 'delivered' },
      },
      {
        $set: {
          'rider.riderId': '',
          'rider.name': '',
          'rider.phone': '',
          'rider.currentLocation': '',
          'rider.estimatedDelivery': '',
          'rider.location.lat': null,
          'rider.location.lng': null,
          'rider.location.accuracy': null,
          'rider.location.heading': null,
          'rider.location.speed': null,
          'rider.location.updatedAt': null,
        },
      }
    )

    await Rider.deleteOne({ _id: rider._id })

    return res.json({ message: 'Rider profile deleted.' })
  } catch (_error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

module.exports = {
  signupRider,
  loginRider,
  getRiders,
  getAuthenticatedRider,
  updateMyLocation,
  updateSharingState,
  deleteRiderProfile,
}
