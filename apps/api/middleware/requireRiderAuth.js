const jwt = require('jsonwebtoken')
const Rider = require('../models/Rider')

async function requireRiderAuth(req, res, next) {
  try {
    if (!process.env.RIDER_JWT_SECRET) {
      return res.status(500).json({ message: 'Rider auth is not configured on the server.' })
    }

    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required.' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.RIDER_JWT_SECRET)
    } catch (_err) {
      return res.status(401).json({ message: 'Invalid rider token.' })
    }

    const rider = await Rider.findById(payload.riderId)

    if (!rider) {
      return res.status(401).json({ message: 'Rider not found.' })
    }

    req.rider = rider
    return next()
  } catch (_error) {
    return res.status(500).json({ message: 'Server error' })
  }
}

module.exports = requireRiderAuth
