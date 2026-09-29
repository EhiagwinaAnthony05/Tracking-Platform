const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const AdminRefreshToken = require('../models/AdminRefreshToken')

const ACCESS_TOKEN_EXPIRES_IN = '15m'
const REFRESH_TOKEN_TTL_DAYS = 7

function getAdminCredentials() {
  return {
    email: (process.env.ADMIN_EMAIL || 'admin@movex.local').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString('hex')
}

function getRefreshExpiryDate() {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS)
  return expiresAt
}

function signAccessToken(admin) {
  const jwtSecret = process.env.ADMIN_ACCESS_JWT_SECRET

  if (!jwtSecret) {
    throw new Error('ADMIN_ACCESS_JWT_SECRET is required')
  }

  return jwt.sign(
    {
      role: 'admin',
      email: admin.email,
    },
    jwtSecret,
    {
      subject: admin.id,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  )
}

async function issueSessionTokens(admin) {
  const accessToken = signAccessToken(admin)
  const refreshToken = createRefreshToken()
  const tokenHash = hashToken(refreshToken)

  await AdminRefreshToken.create({
    tokenHash,
    adminId: admin.id,
    adminEmail: admin.email,
    role: 'admin',
    expiresAt: getRefreshExpiryDate(),
  })

  return {
    accessToken,
    refreshToken,
  }
}

function getAdminIdentity() {
  const credentials = getAdminCredentials()

  return {
    id: 'default-admin',
    email: credentials.email,
    role: 'admin',
  }
}

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1
}

async function loginAdmin(req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' })
    }

    const { email, password } = req.validatedBody
    const normalizedEmail = email.trim().toLowerCase()
    const credentials = getAdminCredentials()

    if (!credentials.password) {
      return res.status(500).json({ message: 'Admin credentials are not configured on the server.' })
    }

    if (normalizedEmail !== credentials.email || password !== credentials.password) {
      return res.status(401).json({ message: 'Invalid admin email or password.' })
    }

    const admin = getAdminIdentity()

    const { accessToken, refreshToken } = await issueSessionTokens(admin)

    return res.json({
      accessToken,
      refreshToken,
      admin,
    })
  } catch (error) {
    const message = error?.message || 'Server error'

    if (message.includes('ADMIN_ACCESS_JWT_SECRET')) {
      return res.status(500).json({ message: 'Admin auth is misconfigured. Set ADMIN_ACCESS_JWT_SECRET on the server.' })
    }

    console.error('loginAdmin error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

async function refreshAdminSession(req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' })
    }

    const { refreshToken } = req.validatedBody
    const tokenHash = hashToken(refreshToken)

    const existing = await AdminRefreshToken.findOne({ tokenHash })

    if (!existing || existing.revokedAt || existing.expiresAt <= new Date()) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' })
    }

    existing.revokedAt = new Date()
    await existing.save()

    const admin = {
      id: existing.adminId,
      email: existing.adminEmail,
      role: existing.role,
    }

    const tokens = await issueSessionTokens(admin)

    return res.json({
      ...tokens,
      admin,
    })
  } catch (error) {
    if (error?.message?.includes('ADMIN_ACCESS_JWT_SECRET')) {
      return res.status(500).json({ message: 'Admin auth is misconfigured. Set ADMIN_ACCESS_JWT_SECRET on the server.' })
    }

    console.error('refreshAdminSession error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

async function logoutAdmin(req, res) {
  try {
    if (!isDatabaseConnected()) {
      return res.status(503).json({ message: 'Database is temporarily unavailable. Please try again shortly.' })
    }

    const { refreshToken } = req.validatedBody
    const tokenHash = hashToken(refreshToken)

    const existing = await AdminRefreshToken.findOne({ tokenHash })
    if (existing && !existing.revokedAt) {
      existing.revokedAt = new Date()
      await existing.save()
    }

    return res.json({ message: 'Logged out successfully.' })
  } catch (error) {
    console.error('logoutAdmin error:', error)
    return res.status(500).json({ message: 'Server error' })
  }
}

function getAdminProfile(req, res) {
  return res.json({
    id: req.admin.id,
    email: req.admin.email,
    role: req.admin.role,
  })
}

module.exports = {
  loginAdmin,
  refreshAdminSession,
  logoutAdmin,
  getAdminProfile,
}
