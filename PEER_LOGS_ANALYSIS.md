# Peer Logs Analysis - gRPC Connection Closures

## What You're Seeing (Normal)

The logs show:
```
INFO [grpc] Infof -> [transport] [server-transport 0xc003fd64e0] Closing: EOF
INFO [grpc] Infof -> [transport] [server-transport 0xc003fd6340] Closing: EOF
INFO [grpc] Infof -> [transport] loopyWriter exiting with error: transport closed by client
```

**This is NORMAL behavior:**
- ✅ **INFO level** (not ERROR) - just informational logs
- ✅ **"transport closed by client"** - clients disconnect after operations complete
- ✅ **Clean connection closure** - no errors, just connections closing normally

## What This Means

When a client (like your backend) connects to a peer:
1. Client opens connection → Peer accepts
2. Client performs operation (query/transaction)
3. Client receives response
4. Client closes connection → Peer logs "transport closed by client"

**This is expected and healthy behavior!**

## Actual Issues Found

### 1. TLS Handshake Error (Minor)
```
ERRO [core.comm] ServerHandshake -> Server TLS handshake failed with error EOF
```

**When:** 20:49:51 UTC
**What:** A client tried to connect but connection was interrupted during TLS handshake
**Impact:** Low - might be a retry attempt or transient network issue
**Action:** No action needed if it only happened once

### 2. Writers Policy Warning (FIXED)
```
WARN [policy] CheckPolicyBySignedData -> Failed evaluating policy on signed data
policyName=/Channel/Application/Writers
```

**When:** 20:24:45 UTC (before our fix)
**Status:** ✅ **FIXED** - We updated all endpoints to use admin identities
**Action:** None - this was before the fix was applied

## Real Issue: "Failed to fetch" Error

**The peer logs are NOT the problem.** The "Failed to fetch" error is happening **BEFORE** the request reaches the blockchain.

### Possible Causes:

1. **Backend Not Responding**
   - Backend might have crashed or timed out
   - Check backend terminal logs

2. **Request Timeout**
   - Upload request takes too long
   - Browser times out before backend responds

3. **CORS Preflight Failure**
   - Browser sends OPTIONS request
   - Backend doesn't handle OPTIONS properly

4. **Network Connectivity**
   - Frontend can't reach backend
   - Firewall or proxy blocking request

## How to Debug

### Step 1: Check Backend Logs
When you try to upload, check your backend terminal:
- Do you see `[UPLOAD] User ... uploading file ...` log?
- If NO → Request never reached backend (network/CORS issue)
- If YES → Backend received request but processing failed

### Step 2: Check Browser Console
Look for:
- Network tab → See if request is sent
- Console tab → See if there are CORS errors
- Error details → Check full error message

### Step 3: Test Backend Directly
```powershell
# Test upload endpoint with curl/Postman
# This will tell us if it's a frontend issue or backend issue
```

## Conclusion

**The peer logs you're seeing are NORMAL and HEALTHY.**

The "Failed to fetch" error is unrelated to the peer connection closures. It's likely a:
- Backend crash/timeout
- CORS issue
- Network connectivity issue
- Request timeout

**Next step:** Check backend terminal logs when uploading to see what's actually happening.

