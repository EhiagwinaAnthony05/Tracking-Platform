/**
 * Order Service
 * Encapsulates all order-related API calls and business logic
 */

import { adminAuthFetch } from './adminAuthService'

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDateValue() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Fetch all orders from the backend
 * @returns {Object} { success: boolean, data: Order[], error: string|null }
 */
export async function getAllOrders() {
  try {
    const response = await adminAuthFetch('/api/orders', { method: 'GET' })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        data: [],
        error: data.message || 'Failed to load orders.',
      }
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: [],
      error: 'Network error while loading orders.',
    }
  }
}

/**
 * Fetch order summary for a given period and date
 * @param {string} period - 'daily', 'weekly', 'monthly', or 'yearly'
 * @param {string} date - Reference date in YYYY-MM-DD format
 * @returns {Object} { success: boolean, summary: {...}, range: {...}, error: string|null }
 */
export async function getOrderSummary(period = 'daily', date) {
  try {
    const response = await adminAuthFetch(`/api/orders/summary?period=${period}&date=${date}`, { method: 'GET' })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        summary: {
          totalOrdersInDatabase: 0,
          ordersCreated: 0,
          pendingDeliveries: 0,
          ordersDelivered: 0,
        },
        range: { period, start: null, end: null },
        error: data.message || 'Failed to load order summary.',
      }
    }

    return {
      success: true,
      summary: {
        totalOrdersInDatabase: data.totalOrdersInDatabase || 0,
        ordersCreated: data.ordersCreated || 0,
        pendingDeliveries: data.pendingDeliveries || 0,
        ordersDelivered: data.ordersDelivered || 0,
      },
      range: {
        period: data.period || period,
        start: data.start || null,
        end: data.end || null,
      },
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      summary: {
        totalOrdersInDatabase: 0,
        ordersCreated: 0,
        pendingDeliveries: 0,
        ordersDelivered: 0,
      },
      range: { period, start: null, end: null },
      error: 'Network error while loading order summary.',
    }
  }
}

/**
 * Fetch a single order by ID
 * @param {string} id - Order ID
 * @returns {Object} { success: boolean, data: Order|null, error: string|null }
 */
export async function getOrderById(id) {
  const normalizedId = id.trim().toUpperCase()

  try {
    const response = await adminAuthFetch(`/api/orders/${normalizedId}`, { method: 'GET' })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: data.message || 'Order not found.',
      }
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: null,
      error: 'Network error while fetching order.',
    }
  }
}

/**
 * Create a new order
 * @param {Object} orderData - Order data to create
 * @returns {Object} { success: boolean, data: Order|null, error: string|null }
 */
export async function createOrder(orderData) {
  try {
    const receiverLatRaw = orderData?.receiver?.location?.lat
    const receiverLngRaw = orderData?.receiver?.location?.lng
    const receiverLat = receiverLatRaw === '' || receiverLatRaw === undefined ? null : Number(receiverLatRaw)
    const receiverLng = receiverLngRaw === '' || receiverLngRaw === undefined ? null : Number(receiverLngRaw)
    const hasReceiverCoordinates = Number.isFinite(receiverLat) && Number.isFinite(receiverLng)

    // Destructure location out so we never accidentally forward an empty string to the API
    const { location: _receiverLocation, ...receiverWithoutLocation } = orderData.receiver || {}

    const payload = {
      ...orderData,
      trackingId: orderData.trackingId.trim().toUpperCase(),
      receiver: {
        ...receiverWithoutLocation,
        ...(hasReceiverCoordinates
          ? {
              location: {
                lat: receiverLat,
                lng: receiverLng,
              },
            }
          : {}),
      },
    }

    const response = await adminAuthFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      const fieldError = Array.isArray(data.errors) && data.errors.length > 0
        ? `${data.errors[0].field}: ${data.errors[0].message}`
        : null
      return {
        success: false,
        data: null,
        error: fieldError || data.message || 'Failed to create order.',
      }
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: null,
      error: 'Network error while creating order.',
    }
  }
}

/**
 * Update an existing order's status
 * @param {string} id - Order ID
 * @param {Object} updateData - Data to update (delivery, rider)
 * @returns {Object} { success: boolean, data: Order|null, error: string|null }
 */
export async function updateOrderStatus(id, updateData) {
  try {
    const receiverLatRaw = updateData?.receiver?.location?.lat
    const receiverLngRaw = updateData?.receiver?.location?.lng
    const receiverLat = receiverLatRaw === '' || receiverLatRaw === undefined ? null : Number(receiverLatRaw)
    const receiverLng = receiverLngRaw === '' || receiverLngRaw === undefined ? null : Number(receiverLngRaw)
    const hasReceiverCoordinates = Number.isFinite(receiverLat) && Number.isFinite(receiverLng)

    const payload = {
      delivery: updateData.delivery,
      rider: updateData.rider,
      ...(hasReceiverCoordinates
        ? {
            receiver: {
              location: {
                lat: receiverLat,
                lng: receiverLng,
              },
            },
          }
        : {}),
    }

    const response = await adminAuthFetch(`/api/orders/${id.trim().toUpperCase()}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: data.message || 'Failed to update order.',
      }
    }

    return {
      success: true,
      data: data,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: null,
      error: 'Network error while updating order.',
    }
  }
}

/**
 * Delete an order by ID
 * @param {string} id - Order ID
 * @returns {Object} { success: boolean, message: string, error: string|null }
 */
export async function deleteOrder(id) {
  try {
    const normalizedId = id.trim().toUpperCase()

    const response = await adminAuthFetch(`/api/orders/${normalizedId}`, {
      method: 'DELETE',
    })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        message: '',
        error: data.message || 'Failed to delete order.',
      }
    }

    return {
      success: true,
      message: data.message || 'Order deleted successfully.',
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      message: '',
      error: 'Network error while deleting order.',
    }
  }
}
