# Fix: "No valid responses from any peers" Error

## Root Cause

The error "No valid responses from any peers. Errors:" was occurring because:

1. **Discovery was disabled** in the Gateway configuration (`discovery: { enabled: false }`)
2. When discovery is disabled, the Fabric Gateway SDK can only use the peer directly specified in the connection profile
3. The chaincode's endorsement policy requires endorsements from **multiple peers** (likely Org1 and Org2)
4. With discovery disabled, the SDK can't find the other peers needed for endorsement
5. Result: The SDK sends the transaction proposal but can't collect enough endorsements

## The Fix

**File:** `cdms-backend/backend.js`

**Changed:**
```javascript
// BEFORE (WRONG):
discovery: { enabled: false, asLocalhost: true }

// AFTER (CORRECT):
discovery: { enabled: true, asLocalhost: true }
```

**What this does:**
- Enables the Fabric discovery service
- Allows the Gateway to automatically discover all peers in the network
- Finds peers from both Org1 and Org2
- Collects endorsements from all required peers based on the endorsement policy
- Successfully submits transactions to the blockchain

## Why This Works

1. **Discovery Service:** When enabled, the Gateway queries the peer's discovery service to find:
   - All peers in the network
   - Their endorsement capabilities
   - The endorsement policy requirements

2. **Automatic Endorsement:** The Gateway automatically:
   - Identifies which peers need to endorse based on the policy
   - Sends the transaction proposal to all required peers
   - Collects endorsements
   - Submits to the orderer

3. **Endorsement Policy:** The default endorsement policy for the test network typically requires:
   - At least one peer from Org1 **AND**
   - At least one peer from Org2

   With discovery disabled, only the peer from the connection profile was used, causing the policy check to fail.

## Next Steps

1. **Restart the backend** to apply the changes
2. **Try uploading a file** - it should now successfully submit to the blockchain
3. **Check backend logs** - you should see:
   - Successful endorsement collection
   - Transaction submission to orderer
   - Block creation confirmation

## Verification

After the fix, when you upload a file, you should see:

```
[UPLOAD] Using AdminOrg1 identity for blockchain operation (user: ...)
[UPLOAD] ✅ Record REC_... created on blockchain
```

Instead of:
```
[UPLOAD] Blockchain recording failed: No valid responses from any peers. Errors:
```

