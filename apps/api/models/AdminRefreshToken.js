const mongoose = require('mongoose')

const adminRefreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    adminId: { type: String, required: true },
    adminEmail: { type: String, required: true },
    role: { type: String, required: true, default: 'admin' },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model('AdminRefreshToken', adminRefreshTokenSchema)
