const { z } = require('zod')

const riderIdentitySchema = z.object({
  name: z.string().trim().min(2, 'name is required'),
  phone: z.string().trim().min(5, 'phone is required'),
})

// Phones report null or -1 when accuracy/heading/speed are unknown. Treat those
// as missing instead of rejecting the whole location update.
function optionalReading(max = Infinity) {
  return z
    .number()
    .nullish()
    .transform((value) => (Number.isFinite(value) && value >= 0 && value <= max ? value : undefined))
}

const riderLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: optionalReading(),
  heading: optionalReading(360),
  speed: optionalReading(),
  capturedAt: z.string().datetime().nullish(),
})

const sharingStateSchema = z.object({
  isSharing: z.boolean(),
})

module.exports = {
  riderIdentitySchema,
  riderLocationSchema,
  sharingStateSchema,
}
