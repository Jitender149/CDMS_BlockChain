# Debug Guide: "Failed to fetch" Upload Error

## Quick Diagnostic Steps

### 1. Check if Request Reaches Backend

**When you try to upload, check your backend terminal:**

✅ **If you see:**
```
[UPLOAD] User ... uploading file ...
```

→ Request reached backend, issue is in backend processing

❌ **If you DON'T see this log:**
→ Request never reached backend (network/CORS/frontend issue)

### 2. Check Backend Health

Test if backend is responding:
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health -Method GET
```

Should return: `{"status":"healthy",...}`

### 3. Check Browser Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to upload file
4. Look for `/record/upload` request:
   - **Status:** What HTTP status code?
   - **Type:** Is it "xhr" or "fetch"?
   - **Time:** How long does it take?
   - **Headers:** Check request/response headers

### 4. Common Issues and Fixes

#### Issue A: Request Timeout
**Symptoms:**
- Request shows "pending" then fails
- Takes >30 seconds before failing

**Fix:**
- Increase backend timeout
- Check if blockchain operation is hanging

#### Issue B: CORS Error
**Symptoms:**
- Browser console shows CORS error
- Network tab shows OPTIONS request failing

**Fix:**
- CORS is enabled, but check if preflight fails
- Ensure `app.use(cors())` is before routes

#### Issue C: Backend Crash
**Symptoms:**
- Backend logs show error then stops
- Backend terminal shows crash

**Fix:**
- Check backend logs for the actual error
- Fix the underlying issue

#### Issue D: Network Error
**Symptoms:**
- No request appears in Network tab
- Immediate "Failed to fetch"

**Fix:**
- Check if backend is actually running
- Verify API_URL in frontend matches backend port

## Expected Backend Logs on Upload

When upload works, you should see:

```
[UPLOAD] User ... uploading file ... for case ...
[UPLOAD] 💾 Upload metadata saved locally as fallback
[UPLOAD] Using AdminOrg1 identity for blockchain operation (user: ...)
[UPLOAD] ✅ Record REC_... created on blockchain
[UPLOAD] ✅ Successfully uploaded ...
```

If any of these logs are missing, that's where the issue is!

