const { z } = require('zod')

const adminLoginSchema = z.object({
  email: z.string().trim().email('A valid admin email is required.'),
  password: z.string().min(1, 'password is required'),
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'refreshToken is required'),
})

module.exports = {
  adminLoginSchema,
  refreshTokenSchema,
}
