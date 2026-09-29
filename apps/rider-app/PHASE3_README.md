# Phase 3: Automatic Background Location Tracking

## Implementation Summary

This document outlines the Phase 3 feature for automatic background location tracking in the Movex Rider app.

## What's New

### Automatic Location Tracking
The rider can now enable automatic location tracking which:
- Runs in the background even when the app is not in focus
- Captures GPS coordinates at regular intervals (default: 60 seconds)
- Automatically sends locations to the backend API
- Requires background location permission from the user
- Continues tracking even if the app is closed (on supported platforms)

### New Screen Elements
The HomeScreen now includes:
1. **Phase 3 Section** - New "Automatic Background Tracking" controls
2. **Start Tracking Button** - Initiates automatic background location updates
3. **Stop Tracking Button** - Terminates automatic tracking
4. **Tracking Status** - Shows "🟢 Active" or "⚪ Inactive" status
5. **Logout Button** - Quick logout from top-right header
6. **Background Permission Display** - Shows permission status in info card

### Files Created/Modified

**New Files:**
- `src/services/locationTracker.js` - Background task manager and location handler

**Modified Files:**
- `src/screens/HomeScreen.jsx` - Added Phase 3 UI and tracking controls
- `app.json` - Added background location permission configuration

### Key Functions

#### locationTracker.js Exports

```javascript
// Start automatic tracking
startBackgroundLocationTracking(intervalMs = 60000)
// Returns: Promise<boolean>

// Stop automatic tracking
stopBackgroundLocationTracking()
// Returns: Promise<boolean>

// Check if tracking is currently active
isBackgroundLocationTrackingActive()
// Returns: Promise<boolean>

// Request background location permission
requestBackgroundLocationPermission()
// Returns: Promise<boolean>

// Check if background location is available/permitted
isBackgroundLocationAvailable()
// Returns: Promise<boolean>
```

#### Background Task Handler

The `background-location-task` runs at configured intervals and:
1. Receives GPS location updates from expo-location
2. Extracts the latest location coordinates
3. Retrieves the stored rider session token
4. Sends location to `PATCH /api/riders/me/location`
5. Logs success/failure and errors

### Permission Requirements

**iOS:**
- Requires `NSLocationAlwaysAndWhenInUseUsageDescription` in app permissions
- User must grant "Always Allow" for background tracking to work

**Android:**
- Requires `ACCESS_FINE_LOCATION` (foreground)
- Requires `ACCESS_BACKGROUND_LOCATION` (background)
- Background service notification displayed while tracking

### How to Use

1. **Start Tracking:**
   - Tap "Start Tracking" button in Phase 3 section
   - Grant background location permission if prompted
   - Status indicator changes to "🟢 Active"

2. **Stop Tracking:**
   - Tap "Stop Tracking" button
   - Tracking stops immediately
   - Status indicator changes to "⚪ Inactive"

3. **Restore Tracking:**
   - If the app is killed while tracking, the background task continues
   - When app restarts, the tracking status is restored automatically

### API Endpoint

Location updates are sent to:
```
PATCH /api/riders/me/location
```

**Payload:**
```json
{
  "lat": 6.5244,
  "lng": 3.3792,
  "accuracy": 12.5,
  "altitude": 45.2,
  "heading": 120.5,
  "speed": 2.3,
  "capturedAt": "2026-07-13T17:50:31.490Z"
}
```

**Headers:**
```
Authorization: Bearer <session_token>
Content-Type: application/json
```

### Configuration

**Send Interval:**
Default: 60 seconds (configurable in code)
- Lower values (e.g., 30s) increase accuracy but battery drain
- Higher values (e.g., 120s) reduce battery drain but lower update frequency

**Accuracy:**
Default: High
- Uses GPS for precise coordinates
- May take longer to acquire initial fix

### Error Handling

The app gracefully handles:
- Missing location permissions → displays permission request dialog
- Location services disabled → shows warning
- No active session → skips location send
- Network errors → logged, doesn't interrupt background task
- Permission denied → shows clear error message

### Testing on Physical Device

1. Build and install on iOS/Android device
2. Open app and login
3. Navigate to HomeScreen
4. Tap "Start Tracking"
5. Grant background location permission when prompted
6. Put app in background
7. Verify locations are sent to backend every 60 seconds
8. Kill app and restart to verify tracking resumes
9. Tap "Stop Tracking" to disable

### Known Limitations

- iOS: Background location tracking only works on physical devices, not simulator
- iOS: May require special entitlements and testing through TestFlight
- Android: Background tracking requires Android 8.0+
- Web: Background tracking is not supported (feature is disabled on web)

### Future Enhancements

- Configurable send intervals via UI slider
- Tracking history display
- Pause/Resume without full stop
- Geofence-based auto-start/stop
- Multiple accuracy levels selectable

### Support

For issues or questions about Phase 3 background tracking:
1. Check app logs for any error messages
2. Verify location permissions are granted
3. Ensure GPS services are enabled on device
4. Review backend API logs for location receive errors
