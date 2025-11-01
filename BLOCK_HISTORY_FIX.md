# Block History Query Error - Fix

## Issue

Error: `Query failed. Errors: []` when calling `GetAllHistory` chaincode method.

## Root Cause

1. **Chaincode version mismatch**: The deployed chaincode (v1.0) may not have the `GetAllHistory` method, OR
2. **Method execution error**: The method exists but has an error in the implementation (likely with `getStateByRange('', '')`)

## Fixes Applied

### 1. Improved `GetAllHistory` Method (`chaincode/index.js`)

**Changes:**
- Fixed `getStateByRange` to use proper bounds: `''` to `'\uffff'` (Unicode end character)
- Added extensive logging for debugging
- Improved error handling with try-catch blocks
- Better timestamp conversion handling
- Added null checks for iterator values

**Key improvements:**
```javascript
// Before: getStateByRange('', '') - might not work
// After: getStateByRange('', '\uffff') - proper range
const startKey = '';
const endKey = '\uffff'; // Sorts after all other characters
const iterator = await ctx.stub.getStateByRange(startKey, endKey);
```

### 2. Backend Fallback (`cdms-backend/api.js`)

**Changes:**
- Added fallback logic if `GetAllHistory` method doesn't exist
- Falls back to `ListAllRecords` if `GetAllHistory` fails
- Better error messages with hints

### 3. Improved Logging

Added console.log statements throughout to help debug:
- When method starts/ends
- Record keys being processed
- History entries being collected
- Any errors encountered

## Solution Steps

### Step 1: Redeploy Chaincode

The chaincode needs to be redeployed with the updated `GetAllHistory` method:

```powershell
# Option 1: PowerShell
.\deploy-chaincode.ps1

# Option 2: WSL
bash deploy-chaincode.sh
```

**Note:** The version is already set to 1.1 in `deploy-chaincode.sh`, but you may need to increment it to 1.2 if 1.1 is already deployed.

### Step 2: Verify Deployment

Check that the chaincode container is running:
```powershell
docker ps | Select-String "dev-peer.*cdmscontract"
```

You should see containers with `cdmscontract_1.1` or `cdmscontract_1.2`.

### Step 3: Test

1. **Restart backend** (if needed):
   ```powershell
   cd cdms-backend
   npm start
   ```

2. **Try accessing Block History page** in the frontend

3. **Check logs**:
   - Backend logs: Should show `[BLOCK HISTORY]` messages
   - Chaincode logs: Should show `============= START : Get All History ===========`
   
   ```powershell
   # Backend logs
   # Check the terminal where npm start is running
   
   # Chaincode logs
   docker logs dev-peer0.org1.example.com-cdmscontract_1.1-<hash> --tail 50
   ```

## Debugging

If errors persist:

1. **Check chaincode container logs:**
   ```powershell
   docker logs dev-peer0.org1.example.com-cdmscontract_1.1-<hash> --tail 100 | Select-String -Pattern "Get All History|error|Error"
   ```

2. **Check backend logs:**
   Look for `[BLOCK HISTORY]` messages in the backend console

3. **Verify method exists:**
   The method should be visible in the chaincode container logs when it starts up

## Expected Behavior

After redeployment:
- ✅ `GetAllHistory` method is available in chaincode
- ✅ Method properly iterates through all records
- ✅ History entries are collected and sorted
- ✅ Backend successfully calls the method
- ✅ Frontend displays block history

## Fallback

If `GetAllHistory` still doesn't work after redeployment:
- The backend will automatically fall back to `ListAllRecords`
- This shows current state of records (not full history)
- Better than showing an error

## Files Modified

1. `chaincode/index.js` - Updated `GetAllHistory` method
2. `cdms-backend/api.js` - Added fallback logic and better error handling

## Status

✅ **Code fixes complete** - Ready for redeployment
⏳ **Action required** - Redeploy chaincode with updated version

