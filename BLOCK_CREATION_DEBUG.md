# Block Creation Issue - Debug Guide

## Problem Analysis from Orderer Logs

### What the Logs Show:
1. ✅ **Block [2] created at 18:47:27** - This is a configuration block (channel config or chaincode deployment)
2. ⚠️ **Warnings about nil config metadata** - Orderer detected a config change but metadata is missing
3. ❌ **No transaction blocks after block 2** - No actual transaction blocks are being created
4. ⚠️ **Connection errors** - Peers are disconnecting/timeout after 20+ minutes

### Root Cause Analysis:

#### Issue 1: Transactions Not Reaching Orderer
The orderer logs show **no Broadcast transactions** after block 2. This means:
- Transactions are being submitted to peers (endorsement)
- But the endorsed transactions are **NOT being submitted to the orderer**
- Or transactions are failing before reaching the orderer

#### Issue 2: Self-Commit Configuration
The self-commit mode requires:
1. **Immediate block creation**: `ORDERER_GENERAL_BATCHTIMEOUT=0s` ✓
2. **One transaction per block**: `ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1` ✓
3. **Transactions actually being submitted**: ❌ **THIS IS THE PROBLEM**

### Why Transactions Aren't Creating Blocks:

1. **Transactions are failing during endorsement**:
   - Chaincode errors (RBAC failures - we just fixed this)
   - Endorsement policy not met
   - Chaincode not deployed properly

2. **Transactions are submitted but not broadcast to orderer**:
   - SDK `submitTransaction` should automatically send to orderer
   - But if endorsement fails, it never reaches orderer
   - Or gateway configuration is incorrect

3. **Orderer batch timeout too short**:
   - Even with `BATCHTIMEOUT=0s`, if no transactions arrive, no blocks are created
   - Need to ensure transactions actually reach orderer

## Debugging Steps:

### Step 1: Check if Chaincode is Deployed
```bash
# Check peer logs for chaincode errors
docker logs peer0.org1.example.com | grep -i "chaincode\|cdmscontract\|error"
```

### Step 2: Check if Transactions are Being Endorsed
```bash
# Check for endorsement responses
docker logs peer0.org1.example.com | grep -i "endors\|proposal"
```

### Step 3: Check if Transactions Reach Orderer
```bash
# Check for Broadcast calls
docker logs orderer.example.com | grep -i "broadcast\|envelope"
```

### Step 4: Try Uploading a File
- Upload a file through the frontend
- Watch backend logs for blockchain transaction errors
- Watch orderer logs for new blocks
- Watch peer logs for endorsement/commit

### Step 5: Verify Self-Commit Configuration
```bash
# Check orderer environment variables
docker exec orderer.example.com env | grep BATCH
```

Expected:
```
ORDERER_GENERAL_BATCHTIMEOUT=0s
ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1
```

## Solution:

### Option 1: Redeploy Chaincode (Most Likely Fix)
The chaincode RBAC fixes need to be deployed:
```bash
cd fabric-samples/test-network
./network.sh deployCC -ccn cdmscontract -ccp ../../chaincode -ccl javascript -ccv 1.5
```

### Option 2: Check Transaction Submission
Ensure `submitTransaction` is actually being called and succeeding:
- Check backend logs for `[UPLOAD] ✅ Record ... created on blockchain`
- If this log doesn't appear, the transaction is failing before reaching orderer

### Option 3: Verify Network Configuration
Ensure self-commit configuration is applied:
- Orderer docker-compose should have `ORDERER_GENERAL_BATCHTIMEOUT=0s`
- Or use the modified `compose-test-net-selfcommit.yaml`

## Expected Behavior After Fix:

1. **Upload a file** → Backend logs show: `[UPLOAD] ✅ Record ... created on blockchain`
2. **Orderer logs show**: `Created block [3]` immediately after upload
3. **Peer logs show**: `Committed block [3]` immediately after orderer creates it
4. **Block appears in `/block-history`** endpoint

## Next Steps:

1. **Redeploy chaincode** with RBAC fixes
2. **Try uploading a file** 
3. **Watch all logs** (backend, peer, orderer) simultaneously
4. **Report any errors** you see in the logs

