# Debugging the 404 Location Error

## Quick Checklist

- [ ] Check Railway logs for PATCH requests to `/api/riders/me/location`
- [ ] Verify the request is reaching the backend at all
- [ ] Check if requests are returning 404 from backend
- [ ] Verify the endpoint path matches your backend route
- [ ] Check token is valid and not expired

---

## Method 1: Check Railway Logs (RECOMMENDED)

### Access Railway Dashboard

1. Go to https://railway.app
2. Login with your credentials
3. Select your project (likely named "move-x-xpress" or "MOVE-X")
4. Click on your backend service (server/api/backend)
5. Click the **Logs** tab

### Find Location Requests

Look for these patterns in the logs:

**When tracking starts, you should see:**
```
PATCH /api/riders/me/location
```

**Successful request (what you want to see):**
```
PATCH /api/riders/me/location 200 OK
{ "id": "...", "timestamp": "..." }
```

**Failed request (404 error):**
```
PATCH /api/riders/me/location 404 Not Found
Cannot PATCH /api/riders/me/location
```

### Filter Logs

Most Railway log viewers have a search box:
1. Type `location` to find location endpoint requests
2. Type `404` to find error requests
3. Look for timestamps around when you enabled tracking

---

## Method 2: Check App Console Logs

### For Web (Expo Web Dev Server)

1. Open http://localhost:8081 in your browser
2. Open DevTools: `F12` or `Cmd+Option+J`
3. Click the **Console** tab
4. Trigger background tracking:
   - Log in
   - Navigate to HomeScreen
   - Tap "Start Tracking"
5. Watch the console for logs like:
   ```
   [LocationTracker] Sending location: {"lat": ...}
   [LocationTracker] Token: eyJhbG...
   [LocationTracker] Error sending location: {status: 404, statusText: "Not Found"}
   ```

### For Mobile (Expo Go or Device)

If testing on a device:
1. In terminal where you ran `npm start`, you'll see logs
2. Look for `[LocationTracker]` prefix
3. Messages will show:
   - When location is being sent
   - Token (first 20 chars)
   - Success or error response

---

## What to Look For

### Scenario 1: Request Not Reaching Backend ❌

**Symptom:**
- No PATCH requests in Railway logs
- App shows error but backend logs are silent

**Cause:**
- Network connectivity issue
- Wrong API URL
- Token being rejected before request sent

**Solution:**
1. Verify API URL in code: `https://move-x-xpress-production.up.railway.app`
2. Check if internet connection is working
3. Verify token is being set correctly in logs

---

### Scenario 2: Request Reaching Backend with 404 ❌

**Symptom:**
- Railway logs show `PATCH /api/riders/me/location 404`
- Console shows: `{"status": 404, "statusText": "Not Found"}`

**Cause:**
- Endpoint doesn't exist on backend
- Wrong path (e.g., `/api/riders/me/locations` instead of `/api/riders/me/location`)
- Endpoint handler not registered

**Solution:**
1. Check your backend routes file (e.g., `routes/riders.js`)
2. Verify `PATCH /api/riders/me/location` route exists
3. Check the exact path - spacing and spelling matter!
4. Ensure the route is exported/registered

---

### Scenario 3: Request Successful with 200 ✅

**Symptom:**
- Railway logs show `PATCH /api/riders/me/location 200`
- Console shows success message

**What's Next:**
- Verify data is being saved in your database
- Check if location is appearing in rider records
- Verify timestamp and coordinates are correct

---

## Common 404 Causes

### 1. Wrong Endpoint Path

**What the app sends:**
```
PATCH /api/riders/me/location
Authorization: Bearer <token>
```

**Check your backend has this route:**
```javascript
// Example - your backend should have something like:
router.patch('/me/location', (req, res) => {
  // Handle location update
});
```

### 2. Missing Route Registration

Check that your route file is imported in your main app:
```javascript
// In main app file (e.g., server.js, index.js)
const ridersRouter = require('./routes/riders');
app.use('/api/riders', ridersRouter); // Must include this!
```

### 3. Wrong HTTP Method

The app sends a **PATCH** request. Check your backend:
```javascript
// ❌ WRONG - uses GET instead of PATCH
router.get('/me/location', (req, res) => { ... });

// ✅ CORRECT - uses PATCH
router.patch('/me/location', (req, res) => { ... });
```

### 4. Trailing Slash Mismatch

```javascript
// ❌ WRONG - trailing slash
router.patch('/me/location/', (req, res) => { ... });

// ✅ CORRECT - no trailing slash (unless app sends it)
router.patch('/me/location', (req, res) => { ... });
```

---

## Detailed Error Analysis

When you see the error, check these fields in the console:

```
[LocationTracker] Error sending location: {
  status: 404,                    // HTTP status code
  statusText: "Not Found",        // HTTP status message
  data: {...},                    // Backend response body
  url: "/api/riders/me/location",    // Path being called
  method: "PATCH",                 // HTTP method
  baseURL: "https://..."          // Full URL
}
```

**Each tells you something:**

| Field | Meaning | Solution |
|-------|---------|----------|
| `status: 404` | Route not found | Check backend route definition |
| `status: 401` | Unauthorized | Token invalid or expired, re-login |
| `status: 500` | Server error | Check backend logs for crash |
| `url` | Wrong path? | Verify path in backend matches app |
| `data: {...}` | Error from backend | Read error message from backend |

---

## Quick Debug Workflow

### Step 1: Enable Tracking
```
1. Log into app
2. Navigate to HomeScreen
3. Check console: [LocationTracker] logs appearing?
4. Tap "Start Tracking"
5. Watch for sending location logs
```

### Step 2: Check App Console
```
Look for:
✓ "[LocationTracker] Sending location: {...}"
✓ "[LocationTracker] Token: eyJ..."
✓ "[LocationTracker] Location sent successfully: {...}"
  OR
✗ "[LocationTracker] Error sending location: {...}"
```

### Step 3: Check Railway Logs
```
1. Open https://railway.app
2. Navigate to project → service → Logs
3. Search for "location" or "riders"
4. Look for PATCH requests around the time you started tracking
5. Note the status code (200, 404, 500, etc.)
```

### Step 4: Compare

| App Console | Railway Logs | Interpretation |
|-------------|--------------|-----------------|
| Error 404 | No requests | Request not reaching backend |
| Error 404 | `404 Not Found` | Route doesn't exist |
| Error 401 | `401 Unauthorized` | Token invalid |
| Success 200 | `200 OK` | Everything working! |

---

## Next Steps Based on What You Find

### If no requests appear in Railway logs:
1. Verify internet connection
2. Check if token is being set
3. Try manual location send (Phase 2) - does that work?
4. Check if server is actually running

### If requests appear with 404:
1. Check exact endpoint path on backend
2. Verify route is registered/exported
3. Check HTTP method is PATCH, not GET
4. Look for typos in route definition

### If requests succeed (200) but no data:
1. Check if the location payload has all required fields
2. Verify backend is saving to database
3. Check if there are database constraints or errors

---

## Example: Complete Debug Session

**Terminal 1: Run Expo App**
```bash
npm start
# Watch for [LocationTracker] logs
```

**Terminal 2: Monitor Backend Logs**
```bash
# In Railway dashboard, watch Logs tab in real-time
# Filter for "location"
```

**Browser: Open App**
1. Go to http://localhost:8081
2. Log in
3. Look at console (F12) and terminal
4. Tap "Start Tracking"
5. Watch BOTH:
   - Browser console for app logs
   - Terminal for any other output
   - Railway dashboard for backend logs

**Expected Output:**
```
# App console:
[LocationTracker] Sending location: {"lat": 6.5244, "lng": 3.3792...}
[LocationTracker] Token: eyJhbGciOiJIUzI1NiIs...
[LocationTracker] Location sent successfully: {...}

# Railway logs:
PATCH /api/riders/me/location 200 OK
{
  "success": true,
  "message": "Location updated"
}
```

---

## Questions to Answer

When debugging, gather answers to:

1. **Does the app send the request?**
   - Check console for `[LocationTracker] Sending location` message

2. **Does the backend receive it?**
   - Check Railway logs for `PATCH /api/riders/me/location` entry

3. **Does the backend accept it?**
   - Check HTTP status: 200=yes, 404/500=no

4. **Is the token valid?**
   - Check console for `Error sending location` with status 401

5. **Is the endpoint path correct?**
   - Check if `/api/riders/me/location` matches your backend route

Once you answer these, we can narrow down the issue!
