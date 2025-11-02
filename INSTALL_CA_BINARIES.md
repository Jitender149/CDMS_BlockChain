# Install Missing Fabric CA Binaries

## Problem

The error `fabric-ca-client binary not found` means you need to download the Fabric CA binaries.

## Solution

### Option 1: Download Fabric CA Binaries (Recommended)

Run this command in WSL:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary --fabric-version 2.5.12 --ca-version 1.5.13
```

This will download the `fabric-ca-client` and `fabric-ca-server` binaries into `fabric-samples/bin/`.

### Option 2: Use Existing Network Without Restarting

If you already have a working network (without CA), you can manually start the CA containers:

```powershell
cd C:\CDMS_Blockchain\fabric-samples\test-network

# Start just the CA containers
docker-compose -f compose/compose-ca.yaml -f compose/docker/docker-compose-ca.yaml up -d
```

Then check if they're running:

```powershell
docker ps --filter "name=ca"
```

Should show:
```
ca.org1.example.com - Up
ca.org2.example.com - Up
```

### Option 3: Simplest - Use Docker Compose Directly

Since you don't need to recreate crypto material, just start the CA services:

```powershell
cd C:\CDMS_Blockchain\fabric-samples\test-network

# Check what's running
docker ps

# If peers and orderers are running, just add CAs
wsl bash -c "cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network && docker-compose -f compose/compose-ca.yaml up -d"
```

## Quick Test

After starting CAs, test if they're accessible:

```powershell
cd cdms-backend

# Test approval again
node -p "
const https = require('https');
https.get('https://localhost:7054/cainfo?ca=ca-org1', {rejectUnauthorized: false}, (res) => {
  console.log('CA Org1 Status:', res.statusCode === 200 ? 'RUNNING ✅' : 'NOT RUNNING ❌');
}).on('error', (e) => {
  console.error('CA Org1 NOT RUNNING ❌:', e.message);
});
"
```

## Which Option to Choose?

### If your network is currently working (peers, orderer, chaincode):
✅ **Use Option 2 or 3** - Just add the CA containers

### If you need to start fresh:
✅ **Use Option 1** - Download CA binaries and restart network

### Current Status Check:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
```

If you see:
- `peer0.org1.example.com` - Running ✅
- `peer0.org2.example.com` - Running ✅
- `orderer.example.com` - Running ✅
- `dev-peer0.org1...cdmscontract_1.4` - Running ✅

Then **use Option 2 or 3** (just add CAs, don't restart everything).

If nothing is running or you see errors, **use Option 1** (download binaries and start fresh).

## After CA is Running

1. **Restart backend**:
```powershell
cd cdms-backend
npm start
```

2. **Try approving users** - Should work now!

---

**Most likely you want Option 2 or 3 since your chaincode is already deployed and working.**

