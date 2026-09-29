const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, '')

const ACCESS_TOKEN_KEY = 'adminAccessToken'
const REFRESH_TOKEN_KEY = 'adminRefreshToken'
const ADMIN_PROFILE_KEY = 'adminProfile'

export function getAdminAccessToken() {
  return (localStorage.getItem(ACCESS_TOKEN_KEY) || '').trim()
}

export function getAdminRefreshToken() {
  return (localStorage.getItem(REFRESH_TOKEN_KEY) || '').trim()
}

export function getStoredAdminProfile() {
  const raw = localStorage.getItem(ADMIN_PROFILE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

export function clearAdminSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(ADMIN_PROFILE_KEY)
}

function persistAdminSession({ accessToken, refreshToken, admin }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin))
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}))
}

export async function loginAdmin(payload) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await parseJsonSafe(response)

    if (!response.ok) {
      return { success: false, error: data.message || 'Admin login failed.', data: null }
    }

    persistAdminSession(data)
    return { success: true, error: null, data: data.admin }
  } catch (_error) {
    return { success: false, error: 'Network error while signing in.', data: null }
  }
}

export async function refreshAdminSession() {
  const refreshToken = getAdminRefreshToken()

  if (!refreshToken) {
    return { success: false, error: 'No refresh token available.', data: null }
  }

  try {
    const response = await fetch(`${apiBaseUrl}/api/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    const data = await parseJsonSafe(response)

    if (!response.ok) {
      clearAdminSession()
      return { success: false, error: data.message || 'Admin session expired.', data: null }
    }

    persistAdminSession(data)
    return { success: true, error: null, data: data.admin }
  } catch (_error) {
    return { success: false, error: 'Network error while refreshing admin session.', data: null }
  }
}

export async function logoutAdmin() {
  const refreshToken = getAdminRefreshToken()

  try {
    if (refreshToken) {
      await fetch(`${apiBaseUrl}/api/admin/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
    }
  } catch (_error) {
    // Always clear local session even if logout request fails.
  } finally {
    clearAdminSession()
  }
}

export async function getAdminProfile() {
  try {
    const response = await adminAuthFetch('/api/admin/auth/me', { method: 'GET' })
    const data = await parseJsonSafe(response)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAdminSession()
      }

      return { success: false, error: data.message || 'Admin authentication required.', data: null }
    }

    localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(data))
    return { success: true, error: null, data }
  } catch (_error) {
    return { success: false, error: 'Network error while restoring admin session.', data: null }
  }
}

export async function adminAuthFetch(path, options = {}, hasRetried = false) {
  const refreshToken = getAdminRefreshToken()
  let accessToken = getAdminAccessToken()

  // If access token is missing but refresh token exists, refresh first so the
  // first protected request is sent with Authorization instead of guaranteed 401.
  if (!accessToken && refreshToken && !hasRetried) {
    const refreshResult = await refreshAdminSession()

    if (refreshResult.success) {
      accessToken = getAdminAccessToken()
    }
  }

  const requestHeaders = {
    ...(options.headers || {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: requestHeaders,
  })

  if (response.status === 401 && !hasRetried) {
    const refreshResult = await refreshAdminSession()

    if (refreshResult.success) {
      return adminAuthFetch(path, options, true)
    }
  }

  return response
}
