/**
 * Calls the rider authentication endpoints and persists the signed-in session in secure device storage.
 */
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './apiConfig';

const SESSION_TOKEN_KEY = 'movex_rider_token';
const SESSION_RIDER_KEY = 'movex_rider_profile';
const LOGIN_REQUEST_TIMEOUT_MS = 30000;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function loginRider({ name, phone }) {
  const payload = {
    name: name.trim(),
    phone: phone.trim(),
  };

  try {
    const response = await apiClient.post('/api/riders/login', payload, {
      timeout: LOGIN_REQUEST_TIMEOUT_MS,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const isTransientNetworkError =
        error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK' || !error.response;

      if (isTransientNetworkError) {
        const retryResponse = await apiClient.post('/api/riders/login', payload, {
          timeout: LOGIN_REQUEST_TIMEOUT_MS,
        });

        return retryResponse.data;
      }
    }

    throw error;
  }
}

export async function getCurrentRider(token) {
  const response = await apiClient.get('/api/riders/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function sendRiderLocationUpdate({ token, location }) {
  const response = await apiClient.patch(
    '/api/riders/me/location',
    {
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      capturedAt: location.capturedAt,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

export async function getMyActiveOrders(token) {
  const response = await apiClient.get('/api/riders/me/orders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function markOrderPickedUp({ token, trackingId }) {
  const response = await apiClient.patch(`/api/orders/${trackingId}/picked-up`, null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}

export async function setSharingState({ token, isSharing }) {
  const response = await apiClient.patch(
    '/api/riders/me/sharing',
    { isSharing },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

async function isSecureStoreAvailable() {
  return await SecureStore.isAvailableAsync();
}

export async function saveSession({ token, rider }) {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
  await SecureStore.setItemAsync(SESSION_RIDER_KEY, JSON.stringify(rider));
}

export async function getStoredSession() {
  if (!(await isSecureStoreAvailable())) {
    return {
      token: null,
      rider: null,
    };
  }

  const [token, riderJson] = await Promise.all([
    SecureStore.getItemAsync(SESSION_TOKEN_KEY),
    SecureStore.getItemAsync(SESSION_RIDER_KEY),
  ]);

  return {
    token,
    rider: riderJson ? JSON.parse(riderJson) : null,
  };
}

export async function clearStoredSession() {
  if (!(await isSecureStoreAvailable())) {
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_RIDER_KEY),
  ]);
}

export function getApiErrorMessage(error) {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Server timeout. The backend took too long to respond. Please try again in a moment.';
    }

    if (!error.response) {
      return 'Network error. Unable to reach the Movex server. Check your internet and base URL.';
    }

    const status = error.response.status;
    const requestId =
      error.response?.headers?.['x-railway-request-id'] ||
      error.response?.headers?.['x-request-id'] ||
      '';
    const backendMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.details;

    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      if (status >= 500) {
        return requestId
          ? `Backend error (${status}): ${backendMessage}. Ref: ${requestId}`
          : `Backend error (${status}): ${backendMessage}`;
      }

      return backendMessage;
    }

    if (status === 401) {
      return 'Session expired or invalid credentials. Please log in again.';
    }

    if (status >= 500) {
      return requestId
        ? `Backend server error (${status}). Ref: ${requestId}`
        : `Backend server error (${status}). Please try again shortly.`;
    }

    return `Request failed (${status}). Please verify your input and try again.`;
  }

  return 'Something unexpected happened. Please try again.';
}