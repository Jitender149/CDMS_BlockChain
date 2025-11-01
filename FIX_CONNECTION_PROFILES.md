# Fix Missing Connection Profiles

## Problem
- ✅ Docker containers are running
- ❌ Connection profile files don't exist
- This causes Fabric connection to fail

## Root Cause
Connection profiles are generated when you create a channel, not just when you start containers.

## Quick Fix

Run this in your **WSL terminal**:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Create the channel (this will generate connection profiles)
./network.sh createChannel
```

**This command will:**
1. Create the channel `mychannel`
2. Generate connection profiles automatically:
   - `organizations/peerOrganizations/org1.example.com/connection-org1.json`
   - `organizations/peerOrganizations/org2.example.com/connection-org2.json`

## After Running

After `./network.sh createChannel` completes successfully:

1. ✅ Verify connection profiles exist:
   ```bash
   ls organizations/peerOrganizations/org1.example.com/connection-org1.json
   ls organizations/peerOrganizations/org2.example.com/connection-org2.json
   ```

2. ✅ Verify channel exists:
   ```bash
   docker exec peer0.org1.example.com peer channel list
   ```
   Should show `mychannel`

3. ✅ Try login again - should work now!

## What to Expect

When you run `./network.sh createChannel`, you should see:
```
Creating channel 'mychannel'
✅ Channel 'mychannel' created
✅ Connection profiles generated
```

Then verify files exist and try login again!

