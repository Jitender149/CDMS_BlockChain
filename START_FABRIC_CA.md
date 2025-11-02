# Fix: Fabric CA Not Running

## Problem

The error `ECONNREFUSED` when approving users means the Fabric Certificate Authority (CA) is not running. The CA is required to enroll new users into the blockchain network.

## Root Cause

The test network was started without the CA servers. The chaincode deployment only starts peer and orderer containers, but not the CAs needed for user enrollment.

## Solution

You need to start the Fabric test network **with CA enabled**.

### Option 1: Restart Network with CA (Recommended)

#### Step 1: Stop Current Network
```powershell
cd C:\CDMS_Blockchain\fabric-samples\test-network

# In WSL (recommended)
wsl
./network.sh down
```

#### Step 2: Start Network with CA
```bash
# In WSL
./network.sh up createChannel -ca
```

This will:
- Start the network
- Create the channel (`mychannel`)
- **Start CA servers** for Org1 and Org2

#### Step 3: Deploy Chaincode
```bash
# Still in WSL, in test-network directory
./network.sh deployCC -ccn cdmscontract -ccp ../../chaincode -ccl javascript
```

### Option 2: Start Only CA Containers

If you don't want to restart everything, you can try to start just the CA containers:

```bash
# In WSL, in test-network directory
cd C:\CDMS_Blockchain\fabric-samples\test-network

# Start CA containers
docker-compose -f compose/compose-ca.yaml up -d
```

### Option 3: Check if CAs are Already Running

```powershell
# Check CA containers
cd C:\CDMS_Blockchain\fabric-samples\test-network
docker ps -a | Select-String "ca"
```

You should see:
- `ca_org1` - Running
- `ca_org2` - Running

If they show as "Exited", start them:
```powershell
docker start ca_org1
docker start ca_org2
```

## Verify CA is Running

After starting the network with CA, verify:

```powershell
docker ps --filter "name=ca"
```

You should see:
```
ca.org1.example.com - Up X minutes
ca.org2.example.com - Up X minutes
```

## Test User Enrollment

Once CAs are running, try approving the user again:

1. Login as admin (example@gmail.com / pass)
2. Go to Access Management
3. Click **Approve** on pending user
4. Should work now!

Or test via API:
```powershell
curl -X POST http://localhost:3000/approve-registration `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"balleballe@gmail.com\",
    \"adminEmail\": \"example@gmail.com\"
  }'
```

## Why This Happens

The Fabric network can run in two modes:

1. **Without CA** (for testing with pre-enrolled identities)
   - `./network.sh up createChannel`
   - Only peer, orderer, and chaincode containers
   - Can't enroll new users

2. **With CA** (for production-like setup with user enrollment)
   - `./network.sh up createChannel -ca`
   - Includes CA servers for Org1 and Org2
   - Can enroll new users dynamically

For your CDMS system with user registration, **you need CAs running**.

## Quick Start Script

Create `restart-with-ca.sh`:
```bash
#!/bin/bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

echo "🛑 Stopping network..."
./network.sh down

echo "🚀 Starting network with CA..."
./network.sh up createChannel -ca

echo "📦 Deploying chaincode..."
./network.sh deployCC -ccn cdmscontract -ccp ../../chaincode -ccl javascript -ccv 1.4

echo "✅ Network ready with CA!"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "ca_|peer|orderer"
```

Run it:
```powershell
# In PowerShell
wsl bash restart-with-ca.sh
```

## After Restarting

1. **Re-enroll admin** (if needed):
```powershell
cd cdms-backend
node enrollAdminA.js
node enrollAdminB.js
```

2. **Restart backend**:
```powershell
cd cdms-backend
npm start
```

3. **Test approval** - Should work now!

## Troubleshooting

### CA Still Not Working?

Check CA logs:
```powershell
docker logs ca.org1.example.com
docker logs ca.org2.example.com
```

### Port Already in Use?

The CA servers use ports 7054 and 8054. Make sure nothing else is using them:
```powershell
netstat -ano | Select-String ":7054"
netstat -ano | Select-String ":8054"
```

### Connection Profile Issues?

Check if `connection-org1.json` has CA info:
```powershell
cat fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json | Select-String "certificateAuthorities"
```

Should show:
```json
"certificateAuthorities": {
  "ca.org1.example.com": {
    "url": "https://localhost:7054",
    ...
  }
}
```

## Status Check Command

```powershell
# Check everything
cd C:\CDMS_Blockchain\fabric-samples\test-network
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "ca|peer|orderer|dev-"
```

Expected output:
```
ca.org1.example.com         Up X minutes
ca.org2.example.com         Up X minutes
peer0.org1.example.com      Up X minutes
peer0.org2.example.com      Up X minutes
orderer.example.com         Up X minutes
dev-peer0.org1...           Up X minutes (chaincode)
dev-peer0.org2...           Up X minutes (chaincode)
```

## Next Steps

1. ✅ Restart network with `-ca` flag
2. ✅ Verify CA containers are running
3. ✅ Re-enroll admin if needed
4. ✅ Restart backend
5. ✅ Test user approval

**Once CAs are running, user approval will work!** 🎉

