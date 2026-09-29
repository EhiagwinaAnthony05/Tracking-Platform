const mongoose = require('mongoose')

const riderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    authToken: { type: String, trim: true },
    isSharing: { type: Boolean, default: false },
    lastLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeName: { type: String, default: '' },
      accuracy: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
)

riderSchema.index({ authToken: 1 }, { unique: true, sparse: true })

module.exports = mongoose.model('Rider', riderSchema)
