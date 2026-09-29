const express = require('express')
const validateRequest = require('../middleware/validateRequest')
const requireAdminAuth = require('../middleware/requireAdminAuth')
const {
  adminLoginSchema,
  refreshTokenSchema,
} = require('../validators/adminAuthSchemas')
const {
  loginAdmin,
  refreshAdminSession,
  logoutAdmin,
  getAdminProfile,
} = require('../controllers/adminAuthControllers')

const router = express.Router()

router.post('/login', validateRequest(adminLoginSchema), loginAdmin)
router.post('/refresh', validateRequest(refreshTokenSchema), refreshAdminSession)
router.post('/logout', validateRequest(refreshTokenSchema), logoutAdmin)
router.get('/me', requireAdminAuth, getAdminProfile)

module.exports = router
