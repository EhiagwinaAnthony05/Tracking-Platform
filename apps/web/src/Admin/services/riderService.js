import { adminAuthFetch } from './adminAuthService'

export async function getRiders() {
  try {
    const response = await adminAuthFetch('/api/riders', { method: 'GET' })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        data: [],
        error: data.message || 'Failed to load riders.',
      }
    }

    return {
      success: true,
      data,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: [],
      error: 'Network error while loading riders.',
    }
  }
}

export async function createRiderProfile(payload) {
  try {
    const response = await adminAuthFetch('/api/riders/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: data.message || 'Failed to create rider profile.',
      }
    }

    return {
      success: true,
      data: data.rider,
      error: null,
    }
  } catch (_error) {
    return {
      success: false,
      data: null,
      error: 'Network error while creating rider profile.',
    }
  }
}

export async function deleteRiderProfile(riderId) {
  try {
    const response = await adminAuthFetch(`/api/riders/${riderId}`, {
      method: 'DELETE',
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to delete rider profile.' }
    }

    return { success: true, error: null }
  } catch (_error) {
    return { success: false, error: 'Network error while deleting rider profile.' }
  }
}

export async function assignOrderToRider(orderId, riderId) {
  try {
    const response = await adminAuthFetch(`/api/orders/${orderId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ riderId }),
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, data: null, error: data.message || 'Failed to assign order.' }
    }

    return { success: true, data, error: null }
  } catch (_error) {
    return { success: false, data: null, error: 'Network error while assigning order.' }
  }
}

export async function unassignOrder(orderId) {
  try {
    const response = await adminAuthFetch(`/api/orders/${orderId}/unassign`, {
      method: 'PATCH',
    })
    const data = await response.json()

    if (!response.ok) {
      return { success: false, data: null, error: data.message || 'Failed to unassign order.' }
    }

    return { success: true, data, error: null }
  } catch (_error) {
    return { success: false, data: null, error: 'Network error while unassigning order.' }
  }
}
