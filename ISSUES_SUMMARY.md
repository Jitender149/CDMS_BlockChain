# Docker Issues Summary

## Critical Issues

### ✅ Issue 1: ACL Writers Policy (FIXED)
**Status:** Fixed in code, needs testing

**Fix Applied:**
- Modified `api.js` to use `AdminOrg1`/`AdminOrg2` for blockchain operations
- User authentication still maintained via `req.auth.userId`

**Next Step:**
1. **Restart backend** to apply fix
2. **Upload a file** through frontend
3. **Monitor for Block [6]** in orderer logs

### ⚠️ Issue 2: No Transaction Blocks Created
**Status:** Need to test after ACL fix

**Current Blocks:**
- Block [0]: Genesis
- Block [1]: Channel config
- Block [2]: Initial chaincode
- Block [3]: Chaincode approval
- Block [4]: Chaincode check  
- Block [5]: Chaincode commit v1.5

**Missing:**
- Block [6]+: User transaction blocks (uploads, etc.)

**Expected After Fix:**
- Upload → Backend submits transaction
- Orderer → `Created block [6]`
- Peer → `Committed block [6]`

## Non-Critical Issues

### Issue 3: "too_many_pings" Warning
**Status:** Cosmetic issue, doesn't prevent functionality

**Symptoms:**
- Orderer logs: `got too many pings from the client`
- Peer logs: `too_many_pings` errors
- Peers disconnect/reconnect repeatedly

**Impact:**
- ❌ Does NOT prevent block creation
- ❌ Does NOT prevent transactions
- ✅ Blocks are still delivered successfully
- ⚠️ More log noise than actual problem

**Root Cause:**
- gRPC keepalive configuration
- Peers send pings too frequently
- Orderer rejects excessive pings

**Solution (Optional):**
- Configure gRPC keepalive in docker-compose
- Not critical for functionality

## Next Steps

1. **Restart Backend**
   ```powershell
   cd cdms-backend
   npm start
   ```

2. **Test Upload**
   - Upload a file through frontend
   - Watch backend logs for: `[UPLOAD] ✅ Record ... created on blockchain`

3. **Monitor Blocks**
   ```powershell
   # Watch orderer for new blocks
   docker logs -f orderer.example.com | Select-String -Pattern "Created block"
   ```
   
   Expected: `Created block [6]` (or higher)

4. **Verify Peer Commit**
   ```powershell
   # Watch peer for committed blocks
   docker logs -f peer0.org1.example.com | Select-String -Pattern "Committed block"
   ```
   
   Expected: `Committed block [6]` (or higher)

## Expected Flow After Fix

1. ✅ User uploads file
2. ✅ Backend uses `AdminOrg1` for blockchain operation
3. ✅ Transaction succeeds (no ACL error)
4. ✅ Transaction sent to orderer
5. ✅ Orderer creates block [6]
6. ✅ Peer commits block [6]
7. ✅ Block appears in `/block-history`

## Current Status

- ✅ **Chaincode v1.5 deployed** (Block [5])
- ✅ **ACL fix applied** (code updated)
- ⏳ **Needs testing** (restart backend and upload)
- ⚠️ **"too_many_pings"** (cosmetic, can ignore)

