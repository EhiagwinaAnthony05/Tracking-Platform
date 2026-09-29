const jwt = require('jsonwebtoken')

function requireAdminAuth(req, res, next) {
  const jwtSecret = process.env.ADMIN_ACCESS_JWT_SECRET

  if (!jwtSecret) {
    return res.status(500).json({ message: 'Admin auth is not configured on the server.' })
  }

  const authHeader = req.headers.authorization || ''
  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Admin authentication required.' })
  }

  try {
    const payload = jwt.verify(token, jwtSecret)

    if (!payload || payload.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' })
    }

    req.admin = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    }

    return next()
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired admin token.' })
  }
}

module.exports = requireAdminAuth
