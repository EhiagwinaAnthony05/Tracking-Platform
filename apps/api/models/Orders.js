const mongoose = require('mongoose')

// Each order stores a full tracking timeline entry for the frontend.
const stepSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    date: { type: String, default: '' },
    time: { type: String, default: '' },
    location: { type: String, required: true },
    description: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
)

const contactPartySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
  },
  { _id: false }
)

const packageSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
  },
  { _id: false }
)

const deliverySchema = new mongoose.Schema(
  {
    status: { type: String, default: 'pending' },
    deliveredMarkedAt: { type: Date, default: null },
    deliveredMarkedBy: {
      id: { type: String, default: '' },
      email: { type: String, default: '' },
    },
  },
  { _id: false }
)

const riderSchema = new mongoose.Schema(
  {
    riderId: { type: String, default: '' },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    currentLocation: { type: String, default: '' },
    estimatedDelivery: { type: String, default: '' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      heading: { type: Number, default: null },
      speed: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
    deliveredSnapshot: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      currentLocation: { type: String, default: '' },
      location: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        updatedAt: { type: Date, default: null },
      },
      deliveredAt: { type: Date, default: null },
    },
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, default: null },
    trackingId: { type: String, required: true, unique: true },
    sender: { type: contactPartySchema, required: true },
    receiver: { type: contactPartySchema, required: true },
    package: { type: packageSchema, required: true },
    delivery: { type: deliverySchema, default: () => ({ status: 'pending' }) },
    rider: { type: riderSchema, default: () => ({}) },
    deliveredAt: { type: Date, default: null },
    steps: { type: [stepSchema], default: [] },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Order', orderSchema)