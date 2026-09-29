const express = require('express')
const validateRequest = require('../middleware/validateRequest')
const requireAdminAuth = require('../middleware/requireAdminAuth')
const requireRiderAuth = require('../middleware/requireRiderAuth')
const { createOrderSchema, updateOrderSchema, riderLocationSchema } = require('../validators/orderSchemas')
const { getAllOrders, getOrderSummary, getOrderById, createOrder, updateOrderStatus, updateRiderLocation, deleteOrder, assignOrder, unassignOrder, markOrderPickedUp } = require('../controllers/orderControllers')

const router = express.Router()

router.get('/', requireAdminAuth, getAllOrders)
router.get('/summary', requireAdminAuth, getOrderSummary)
router.get('/:id', requireAdminAuth, getOrderById)
router.post('/', requireAdminAuth, validateRequest(createOrderSchema), createOrder)
router.put('/:id', requireAdminAuth, validateRequest(updateOrderSchema), updateOrderStatus)
router.patch('/:id/rider-location', requireRiderAuth, validateRequest(riderLocationSchema), updateRiderLocation)
router.patch('/:id/picked-up', requireRiderAuth, markOrderPickedUp)
router.patch('/:id/assign', requireAdminAuth, assignOrder)
router.patch('/:id/unassign', requireAdminAuth, unassignOrder)
router.delete('/:id', requireAdminAuth, deleteOrder)

module.exports = router