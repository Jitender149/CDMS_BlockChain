# Fix Fabric Connection Failure - Step by Step

## Current Issue

Based on diagnostics:
- ✅ Docker containers ARE running (peer0.org1, peer0.org2, orderer)
- ❌ Connection profile files are MISSING
- ✅ Wallet identities exist (AdminOrg1, AdminOrg2)
- ✅ User is in approved_users.json

## Root Cause

The connection profile files (`connection-org1.json` and `connection-org2.json`) are **NOT generated** when you just run `./network.sh up`. They are only generated when:
1. You run `./network.sh createChannel` (creates channel AND generates profiles)
2. OR manually generate them using `organizations/ccp-generate.sh`

## Solution: Generate Connection Profiles

### Step 1: Check Channel Exists

In WSL terminal, run:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Check if channel exists
docker exec peer0.org1.example.com peer channel list
```

If you see `mychannel` listed, channel exists. If not, create it.

### Step 2: Create Channel (If Missing)

If channel doesn't exist:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Create the channel
./network.sh createChannel
```

This will:
- Create the channel `mychannel`
- Generate connection profiles automatically

### Step 3: Generate Connection Profiles Manually (If Needed)

If channel exists but profiles are still missing, generate them manually:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Generate connection profiles
./organizations/ccp-generate.sh

# Or manually for each org:
cd organizations/peerOrganizations/org1.example.com/
cp connection-org1.template connection-org1.json
# Edit connection-org1.json with correct paths and values
```

### Step 4: Verify Connection Profiles Exist

After generation, verify:

```bash
ls organizations/peerOrganizations/org1.example.com/connection-org1.json
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

Both files should exist and contain JSON.

## Complete Fix (One Command)

Run this in WSL terminal:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Since containers are already running, just create the channel
# This will generate the connection profiles
./network.sh createChannel
```

## What Should Happen

After running `./network.sh createChannel`, you should see:

```
Creating channel 'mychannel'...
✅ Channel 'mychannel' created
✅ Connection profiles generated
```

And the connection profile files will be created at:
- `organizations/peerOrganizations/org1.example.com/connection-org1.json`
- `organizations/peerOrganizations/org2.example.com/connection-org2.json`

## After Fix

Once connection profiles are generated:

1. ✅ Verify they exist:
   ```bash
   ls organizations/peerOrganizations/org1.example.com/connection-org1.json
   ```

2. ✅ Try login again - should work now!

3. ✅ Check backend logs for detailed debug info

## Common Scenarios

### Scenario 1: Containers running, no channel
**Fix**: Run `./network.sh createChannel`

### Scenario 2: Channel exists, no profiles
**Fix**: Run `./organizations/ccp-generate.sh`

### Scenario 3: Everything missing
**Fix**: Run `./network.sh down` then `./network.sh up createChannel`

## Debug After Fix

After fixing, run verification:

```bash
cd cdms-backend
npm run verify-setup
```

All checks should pass now!

