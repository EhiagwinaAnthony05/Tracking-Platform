# Phase 3 Background Location Tracking - Testing Guide

## Quick Start Testing

### Web (Expo Web Dev Server)
The web version does NOT support background location tracking (browser limitation), but you can still test:
1. Navigate to http://localhost:8081
2. Log in with test credentials
3. Verify Phase 3 UI loads (Start/Stop buttons visible)
4. Buttons may appear disabled on web (this is expected)

### Android Device/Emulator
1. **Prerequisite:** Android 8.0+ with GPS services enabled
2. Run: `npx expo start` → press `a` to open in Android emulator/device
3. Log in with test credentials
4. Navigate to HomeScreen
5. Verify info card shows:
   - Foreground Permission: granted
   - Background Permission: undetermined (initially)
   - Tracking Status: ⚪ Inactive
6. Tap "Start Tracking"
7. System permission dialog appears
8. Select "Allow all the time" (for background permission)
9. Tracking status changes to "🟢 Active"
10. Put app in background
11. Verify backend receives location PATCH every 60 seconds:
    - Check backend logs: `tail -f backend_logs.txt | grep /api/riders/me/location`
    - Location should have: lat, lng, accuracy, heading, speed, timestamp
12. Restart app → tracking automatically resumes
13. Tap "Stop Tracking" → status changes to ⚪ Inactive

### iOS Device (Physical Only - Not Simulator)
1. **Prerequisite:** iOS 11.0+ with GPS services enabled
2. Run: `npx expo start` → press `i` to open in iOS
3. First run may show "Expo Go not installed" → use Expo Go from App Store
4. In Expo Go, scan QR code from terminal
5. Follow same steps as Android above
6. iOS may show permission dialog multiple times - allow all
7. Background tracking works similarly to Android

## Detailed Test Scenarios

### Scenario 1: Normal Startup
**Expected Behavior:**
- App boots and checks saved session
- If no session, shows login screen
- After login, navigates to HomeScreen
- Background permission status is "undetermined"
- Tracking status is "⚪ Inactive"

**Test Steps:**
1. Restart app
2. Verify login screen appears
3. Log in with test credentials (name: "John", phone: "1234567890")
4. Verify HomeScreen loads with tracking disabled

**Pass Criteria:**
✓ Login works
✓ Tracking status shows inactive
✓ No console errors

---

### Scenario 2: Start Tracking - Permission Grant
**Expected Behavior:**
- Tapping "Start Tracking" requests background location permission
- User grants permission in system dialog
- Tracking starts successfully
- Status changes to "🟢 Active"

**Test Steps:**
1. On HomeScreen, tap "Start Tracking"
2. System permission dialog appears
3. Grant permission ("Allow all the time" on Android, "Always" on iOS)
4. Wait 2-3 seconds for tracking to start
5. Verify status shows "🟢 Active"
6. Check HomeScreen shows "Tracking Active" message

**Pass Criteria:**
✓ Permission dialog appears
✓ Status changes to active
✓ No error message shown
✓ Status message confirms tracking started

---

### Scenario 3: Start Tracking - Permission Denied
**Expected Behavior:**
- If user denies background location permission
- Error message displays
- Tracking does not start
- Status remains "⚪ Inactive"

**Test Steps:**
1. On HomeScreen, tap "Start Tracking"
2. System permission dialog appears
3. Tap "Deny" or "Don't Allow"
4. Error message displays
5. Verify status still shows "⚪ Inactive"

**Pass Criteria:**
✓ Error message shown
✓ Tracking remains inactive
✓ Start button re-enabled for retry

---

### Scenario 4: Background Location Sending
**Expected Behavior:**
- While tracking is active and app is backgrounded
- Every 60 seconds, location is sent to `/api/riders/me/location`
- Backend receives complete coordinate data
- Sending continues until app is killed or tracking stopped

**Test Steps:**
1. Ensure tracking is active ("🟢 Active" status)
2. Put app in background
3. Monitor backend logs:
   ```bash
   # In a separate terminal monitoring your backend
   tail -f your_backend_logs.txt | grep "riders/me/location"
   ```
4. Wait 60+ seconds
5. Verify location PATCH appears in logs
6. Check location data includes:
   - lat
   - lng
   - accuracy (±XX meters)
   - heading
   - speed
   - timestamp
7. Wait another 60 seconds, verify another location appears

**Pass Criteria:**
✓ Backend receives location PATCH every 60 seconds
✓ All coordinate fields populated
✓ Timestamps are current
✓ Multiple consecutive sends appear in logs

---

### Scenario 5: Stop Tracking
**Expected Behavior:**
- Tapping "Stop Tracking" immediately stops background updates
- Status changes to "⚪ Inactive"
- No more location sends to backend
- Backend stops receiving location updates

**Test Steps:**
1. Ensure tracking is active ("🟢 Active")
2. Monitor backend logs (in separate terminal)
3. Verify locations are being sent (see Scenario 4)
4. Bring app to foreground
5. Tap "Stop Tracking"
6. Verify status changes to "⚪ Inactive"
7. Note the time
8. Wait 120+ seconds (2 send cycles)
9. Verify NO location PATCH requests appear in backend logs after stop time

**Pass Criteria:**
✓ Status changes immediately
✓ Success message shown
✓ No location sends after stop
✓ Locations from before stop are still in logs

---

### Scenario 6: App Restart During Tracking
**Expected Behavior:**
- If app is killed while tracking is active
- Background task continues running (OS-managed)
- When app restarts, it detects tracking is still active
- HomeScreen shows "🟢 Active" status
- Tracking resumes normally

**Test Steps:**
1. Start tracking ("🟢 Active")
2. Put app in background
3. Note current time
4. Kill app (swipe up from multitask menu or use `adb shell kill`)
5. Monitor backend logs - locations should still arrive
6. After 60+ seconds, locations should still be in logs
7. Reopen app
8. App navigates to HomeScreen
9. Verify status shows "🟢 Active"
10. Put app in background again
11. Verify locations continue in backend logs

**Pass Criteria:**
✓ App detects tracking was active on restart
✓ Status shows active immediately
✓ Location sends continue uninterrupted
✓ No gap in backend logs when app was closed

---

### Scenario 7: Manual Location + Automatic Tracking
**Expected Behavior:**
- Phase 2 (manual) and Phase 3 (automatic) can run together
- Manual captures show in "Current Coordinates" card
- Automatic sends to backend every 60 seconds
- Both features work independently

**Test Steps:**
1. Start tracking ("🟢 Active")
2. Tap "Capture Location" (Phase 2)
3. Wait for capture to complete
4. Verify coordinates show in "Current Coordinates" card
5. Tap "Send Location" (Phase 2)
6. Verify "Last Sent" timestamp updates
7. Monitor backend logs - should see:
   - Manual location send from "Send Location" tap
   - Automatic location send every 60s from Phase 3
8. Both endpoints are `/api/riders/me/location` but timing differs

**Pass Criteria:**
✓ Both manual and automatic sends reach backend
✓ Manual sends on-demand, automatic on 60s interval
✓ Coordinates correct in both cases
✓ No conflicts between phases

---

### Scenario 8: Logout During Active Tracking
**Expected Behavior:**
- When user taps "Logout"
- Session is cleared
- App navigates to login screen
- Background tracking is stopped
- No more locations sent to backend

**Test Steps:**
1. Start tracking ("🟢 Active")
2. Put app in background
3. Note time in backend logs of last location
4. Bring app to foreground
5. Tap "Logout" button (top right)
6. Wait ~2 seconds
7. Verify app shows login screen
8. Wait 120+ seconds
9. Check backend logs - NO new locations should appear after logout time

**Pass Criteria:**
✓ Logout button works
✓ Session cleared (redirects to login)
✓ Tracking stops after logout
✓ No background locations after logout

---

### Scenario 9: Location Permission Changes
**Expected Behavior:**
- If user changes permission settings via device Settings app
- App should detect and show current status in info card

**Test Steps:**
1. Go to device Settings → Permissions → Location
2. For Movex Rider app: Change from "Always" to "While Using"
3. Return to app (bring to foreground)
4. Verify info card shows "Background Permission: denied"
5. If tracking was active, it should stop
6. "Start Tracking" should fail until permission restored

**Pass Criteria:**
✓ Permission change detected
✓ UI updates to show new permission status
✓ Tracking disabled if permission revoked

---

## Troubleshooting

### Issue: "Start Tracking" button is disabled
**Causes:**
- Tracking is already active
- App is still starting tracking (loading state)
- No foreground location permission

**Solutions:**
1. Check info card - is "Foreground Permission" granted?
2. Wait 2-3 seconds - may be loading
3. If already active, tap "Stop Tracking" first

### Issue: Tracking starts but locations don't reach backend
**Causes:**
- No internet connection
- Session token expired
- Wrong API URL configured

**Solutions:**
1. Verify internet connection working (open web browser)
2. Logout and log back in to refresh token
3. Check backend logs for HTTP errors
4. Verify API endpoint: `https://move-x-xpress-production.up.railway.app`

### Issue: Permission dialog doesn't appear
**Causes:**
- Permission already granted in previous test
- Permission permanently denied

**Solutions:**
1. Go to device Settings → Permissions → Location
2. Reset permission to "Not Set" or "Ask"
3. Force-close and reopen app
4. Tap "Start Tracking" again

### Issue: Locations not sent every 60 seconds
**Causes:**
- App was killed by OS (memory pressure)
- Background task wasn't fully registered
- Wrong interval configured

**Solutions:**
1. Restart app
2. Start tracking again
3. Monitor for full 120+ seconds (multiple cycles)
4. Check device settings haven't blocked background activity

### Issue: Web version shows "Tracking not supported"
**Expected behavior** - web doesn't support background processes
- This is normal
- Test on physical device instead
- Web is mainly for login/manual location testing

---

## Performance Benchmarks

### Expected Metrics
- **Location capture time:** < 5 seconds (High accuracy)
- **Network send time:** < 2 seconds (on 4G/WiFi)
- **Battery drain:** ~5-10% per hour at 60s interval
- **Data usage:** ~1-2 KB per location send
- **Background task startup:** Immediate when interval expires
- **App size increase:** ~50KB (locationTracker.js + exports)

### Optimization Tips
- Increase interval to 120s for lower battery drain
- Use "Balanced" accuracy instead of "High" to reduce battery
- Only enable tracking when rider is on active delivery
- Disable tracking during breaks/downtime

---

## Logs to Check

### Console Logs
```javascript
// Look for these logs in browser DevTools or `npx expo start` terminal output
[LocationTracker] Background location tracking started
[LocationTracker] Location sent successfully
[LocationTracker] Background task error: ...
[LocationTracker] No stored session token, skipping location update
```

### Backend Logs
```
PATCH /api/riders/me/location - 200 OK
Received location: lat=6.5244 lng=3.3792 accuracy=12.5m
```

---

## Test Completion Checklist

- [ ] Scenario 1: Normal Startup ✓
- [ ] Scenario 2: Start Tracking - Permission Grant ✓
- [ ] Scenario 3: Start Tracking - Permission Denied ✓
- [ ] Scenario 4: Background Location Sending ✓
- [ ] Scenario 5: Stop Tracking ✓
- [ ] Scenario 6: App Restart During Tracking ✓
- [ ] Scenario 7: Manual Location + Automatic Tracking ✓
- [ ] Scenario 8: Logout During Active Tracking ✓
- [ ] Scenario 9: Location Permission Changes ✓
- [ ] All troubleshooting steps verified ✓

Once all scenarios pass, Phase 3 is production-ready!
