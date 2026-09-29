const express = require('express')
const validateRequest = require('../middleware/validateRequest')
const requireRiderAuth = require('../middleware/requireRiderAuth')
const requireAdminAuth = require('../middleware/requireAdminAuth')
const {
  riderIdentitySchema,
  riderLocationSchema,
  sharingStateSchema,
} = require('../validators/riderSchemas')
const {
  signupRider,
  loginRider,
  getRiders,
  getAuthenticatedRider,
  updateMyLocation,
  updateSharingState,
  deleteRiderProfile,
} = require('../controllers/riderControllers')
const { getMyActiveOrders } = require('../controllers/orderControllers')

const router = express.Router()

router.get('/', requireAdminAuth, getRiders)
router.post('/signup', requireAdminAuth, validateRequest(riderIdentitySchema), signupRider)
router.delete('/:id', requireAdminAuth, deleteRiderProfile)
router.post('/login', validateRequest(riderIdentitySchema), loginRider)
router.get('/me', requireRiderAuth, getAuthenticatedRider)
router.get('/me/orders', requireRiderAuth, getMyActiveOrders)
router.patch('/me/location', requireRiderAuth, validateRequest(riderLocationSchema), updateMyLocation)
router.patch('/me/sharing', requireRiderAuth, validateRequest(sharingStateSchema), updateSharingState)

module.exports = router
