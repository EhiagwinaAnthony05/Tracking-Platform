const express = require('express')
const { getPublicTrackingOrderById } = require('../controllers/orderControllers')

const router = express.Router()

router.get('/:id', getPublicTrackingOrderById)

module.exports = router