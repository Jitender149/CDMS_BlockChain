# Docker Issues Analysis

## Issues Identified from Logs

### Issue 1: "too_many_pings" Error (CRITICAL)

**Symptoms:**
- Repeated errors in peer logs:
  ```
  ERRO [grpc] Errorf -> [transport] Client received GoAway with error code ENHANCE_YOUR_CALM 
  and debug data equal to ASCII "too_many_pings"
  ```
- Peers keep disconnecting and reconnecting to orderer
- This prevents stable connection for block delivery

**Root Cause:**
- Peers are sending too many keepalive pings to orderer
- Orderer is rejecting the connection due to excessive pings
- This is a gRPC connection issue

**Impact:**
- Blocks may not be delivered reliably
- Peers may miss block updates
- Transactions may not be committed consistently

### Issue 2: ACL Writers Policy Error (FIXED)

**Symptoms:**
```
WARN [policy] CheckPolicyBySignedData -> Failed evaluating policy on signed data 
error="implicit policy evaluation failed - 0 sub-policies were satisfied, 
but this policy requires 1 of the 'Writers' sub-policies to be satisfied" 
policyName=/Channel/Application/Writers
```

**Status:**
- ✅ **FIXED** in `api.js` - Now uses `AdminOrg1`/`AdminOrg2` for blockchain operations

### Issue 3: Block Creation Status

**Current Blocks:**
- Block [0]: Genesis block
- Block [1]: Channel configuration
- Block [2]: Initial chaincode deployment
- Block [3]: Chaincode approval (20:17:22)
- Block [4]: Chaincode check (20:17:37)
- Block [5]: Chaincode commit v1.5 (20:17:50)

**Missing:**
- No transaction blocks (Block [6]+) created yet
- This suggests transactions aren't reaching orderer after the ACL fix

## Solutions

### Solution 1: Fix "too_many_pings" Error

This is likely a gRPC keepalive configuration issue. Need to:

1. **Check gRPC keepalive settings** in docker-compose
2. **Increase orderer ping timeout** or reduce peer ping frequency
3. **Verify network stability**

**Quick Check:**
```powershell
# Check orderer environment variables for keepalive settings
docker exec orderer.example.com env | Select-String -Pattern "KEEPALIVE|PING"
```

### Solution 2: Verify Transaction Submission

After the ACL fix, transactions should work. Need to:

1. **Upload a file** through frontend
2. **Monitor backend logs** for: `[UPLOAD] ✅ Record ... created on blockchain`
3. **Watch orderer logs** for: `Created block [6]` (or higher)
4. **Check peer logs** for: `Committed block [6]`

### Solution 3: Network Stability

Ensure network is stable:
```powershell
# Check all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check network connectivity
docker network inspect test-network_default
```

## Next Steps

1. **Restart backend** to apply ACL fix
2. **Test upload** and monitor all logs
3. **If "too_many_pings" persists**, check gRPC configuration
4. **Verify blocks are created** after transactions

