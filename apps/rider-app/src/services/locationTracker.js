/**
 * Phase 3: Background location tracking service
 * Handles automatic periodic location updates using expo-task-manager
 */

import axios from 'axios';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { API_BASE_URL } from './apiConfig';

const LOCATION_TASK_NAME = 'background-location-task';
const BACKGROUND_TRACKING_SUPPORTED =
  Platform.OS !== 'web' &&
  typeof TaskManager?.defineTask === 'function' &&
  typeof TaskManager?.isTaskRegisteredAsync === 'function';

function isTaskDefinedLocally() {
  return typeof TaskManager?.isTaskDefined === 'function'
    ? TaskManager.isTaskDefined(LOCATION_TASK_NAME)
    : false;
}

/**
 * Background task that runs periodically and sends location to the server
 */
if (BACKGROUND_TRACKING_SUPPORTED && !isTaskDefinedLocally()) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('[LocationTracker] Background task error:', error);
      return;
    }

    if (data) {
      const { locations } = data;

      if (locations && locations.length > 0) {
        const location = locations[locations.length - 1];

        try {
          // Get the stored token
          const { getStoredSession } = require('./authService');
          const session = await getStoredSession();

          if (!session?.token) {
            console.warn('[LocationTracker] No stored session token, skipping location update');
            return;
          }

          // Prepare location in the format your backend expects (lat, lng, not latitude, longitude)
          const locationData = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            capturedAt: new Date(location.timestamp).toISOString(),
          };

          console.log('[LocationTracker] Sending location:', JSON.stringify(locationData));
          console.log(
            '[LocationTracker] Token:',
            session.token ? session.token.substring(0, 20) + '...' : 'NO TOKEN'
          );

          // Use PATCH /me/location endpoint (matches backend route)
          const response = await axios.patch(`${API_BASE_URL}/api/riders/me/location`, locationData, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.token}`,
            },
            timeout: 10000,
          });

          console.log('[LocationTracker] Location sent successfully:', response.status, response.data);
        } catch (err) {
          // The rider was deleted or signed out elsewhere; stop sending from this phone.
          if (err.response?.status === 401) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
          }

          // Log detailed error information
          console.error('[LocationTracker] Error sending location:', {
            message: err.message,
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            errorType: err.name,
            url: err.config?.url,
            method: err.config?.method,
            baseURL: err.config?.baseURL,
          });
        }
      }
    }
  });
}

/**
 * Check if background location tracking is available
 */
export async function isBackgroundLocationAvailable() {
  if (!BACKGROUND_TRACKING_SUPPORTED) {
    return false;
  }

  const permission = await Location.getBackgroundPermissionsAsync();
  return permission.status === 'granted';
}

/**
 * Request background location permission
 */
export async function requestBackgroundLocationPermission() {
  if (!BACKGROUND_TRACKING_SUPPORTED) {
    return false;
  }

  try {
    const permission = await Location.requestBackgroundPermissionsAsync();
    return permission.status === 'granted';
  } catch (err) {
    console.error('[LocationTracker] Error requesting background permission:', err);
    return false;
  }
}

/**
 * Start background location tracking
 * @param {number} intervalMs - How often to send location (default: 60000 = 60 seconds)
 */
export async function startBackgroundLocationTracking(intervalMs = 60000) {
  if (!BACKGROUND_TRACKING_SUPPORTED) {
    console.warn('[LocationTracker] Background tracking is not supported on this platform');
    return false;
  }

  try {
    // Check if background task is already running
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

    if (isTaskDefined) {
      console.log('[LocationTracker] Background task already running');
      return true;
    }

    // Request permissions
    const foregroundPerm = await Location.getForegroundPermissionsAsync();
    if (foregroundPerm.status !== 'granted') {
      console.warn('[LocationTracker] Foreground location permission not granted');
      return false;
    }

    const backgroundPerm = await Location.getBackgroundPermissionsAsync();
    if (backgroundPerm.status !== 'granted') {
      console.warn('[LocationTracker] Background location permission not granted');
      const granted = await requestBackgroundLocationPermission();
      if (!granted) {
        return false;
      }
    }

    // Start background location updates
    // Android honours timeInterval. iOS ignores it and reports on movement, so use a
    // distance filter there to avoid sending a request every second.
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: intervalMs,
      distanceInterval: Platform.OS === 'ios' ? 25 : 0,
      activityType: Location.ActivityType.OtherNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Movex Rider - Location Tracking Active',
        notificationBody: 'Your location is being tracked for dispatch.',
        notificationColor: '#208AEF',
      },
    });

    console.log('[LocationTracker] Background location tracking started');
    return true;
  } catch (err) {
    console.error('[LocationTracker] Error starting background tracking:', err);
    return false;
  }
}

/**
 * Stop background location tracking
 */
export async function stopBackgroundLocationTracking() {
  if (!BACKGROUND_TRACKING_SUPPORTED) {
    return false;
  }

  try {
    const isTaskDefined = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

    if (isTaskDefined) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('[LocationTracker] Background location tracking stopped');
    }

    return true;
  } catch (err) {
    console.error('[LocationTracker] Error stopping background tracking:', err);
    return false;
  }
}

/**
 * Check if background location tracking is currently active
 */
export async function isBackgroundLocationTrackingActive() {
  if (!BACKGROUND_TRACKING_SUPPORTED) {
    return false;
  }

  try {
    return await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  } catch (err) {
    console.error('[LocationTracker] Error checking tracking status:', err);
    return false;
  }
}

/**
 * Test the API endpoint connectivity (diagnostic function)
 */
export async function testLocationEndpoint() {
  try {
    const { getStoredSession } = require('./authService');
    const session = await getStoredSession();

    if (!session?.token) {
      return {
        success: false,
        error: 'No stored session token',
      };
    }

    // Test with mock data in the correct format for backend
    const testPayload = {
      lat: 6.5244,
      lng: 3.3792,
      accuracy: 10.5,
      heading: 120.0,
      speed: 2.0,
      capturedAt: new Date().toISOString(),
    };

    console.log('[LocationTracker] Testing endpoint with payload:', testPayload);
    console.log('[LocationTracker] API Base URL:', API_BASE_URL);
    console.log('[LocationTracker] Full URL:', `${API_BASE_URL}/api/riders/me/location`);

    const response = await axios.patch(`${API_BASE_URL}/api/riders/me/location`, testPayload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.token}`,
      },
      timeout: 10000,
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return {
        success: false,
        error: 'Axios error',
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.message,
        responseData: err.response?.data,
        config: {
          url: err.config?.url,
          baseURL: err.config?.baseURL,
          fullURL: `${err.config?.baseURL}${err.config?.url}`,
        },
      };
    }
    return {
      success: false,
      error: err.message || String(err),
    };
  }
}
