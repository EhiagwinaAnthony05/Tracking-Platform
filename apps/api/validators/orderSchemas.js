const { z } = require('zod')
const { DELIVERY_STATUSES } = require('@movex/shared')
const { riderLocationSchema } = require('./riderSchemas')

const coordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const contactPartySchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  phone: z.string().trim().min(1, 'phone is required'),
  address: z.string().trim().min(1, 'address is required'),
  location: coordinateSchema.optional(),
})

const riderSchema = z.object({
  riderId: z.string().trim().optional(),
  name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  currentLocation: z.string().trim().optional(),
  estimatedDelivery: z.string().trim().optional(),
})

const stepInputSchema = z.object({
  status: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  completed: z.boolean().optional(),
})

const createOrderSchema = z.object({
  // Blank means "generate one for me".
  trackingId: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().toUpperCase().regex(/^MX\d{5}$/, 'trackingId must be in the format MX00000 (MX followed by 5 digits)').optional()
  ),
  sender: contactPartySchema,
  receiver: contactPartySchema,
  package: z.object({
    description: z.string().trim().min(1, 'package description is required'),
  }),
  delivery: z.object({
    status: z.enum(DELIVERY_STATUSES).optional(),
  }).optional(),
  rider: riderSchema.optional(),
  steps: z.array(stepInputSchema).optional(),
})

const updateOrderSchema = z.object({
  delivery: z.object({
    status: z.enum(DELIVERY_STATUSES),
  }),
  receiver: z.object({
    location: coordinateSchema,
  }).optional(),
  rider: riderSchema.optional(),
})

module.exports = {
  createOrderSchema,
  updateOrderSchema,
  riderLocationSchema,
}