# 🔧 Quick Fix: CA Connection Error

## The Problem

```
Error: Calling register endpoint failed with error [AggregateError]
code: 'ECONNREFUSED'
```

This means the **Fabric Certificate Authority (CA) servers are not running**. CAs are needed to enroll new users.

## ⚡ Quick Fix

### Run this PowerShell script:

```powershell
.\restart-fabric-with-ca.ps1
```

This will:
1. ✅ Stop the current network
2. ✅ Start network **with CA enabled**
3. ✅ Redeploy chaincode v1.4
4. ✅ Verify everything is running

**OR do it manually:**

```powershell
# Change directory
cd C:\CDMS_Blockchain\fabric-samples\test-network

# Stop network
wsl bash -c "./network.sh down"

# Start with CA
wsl bash -c "./network.sh up createChannel -ca"

# Deploy chaincode
wsl bash -c "./network.sh deployCC -ccn cdmscontract -ccp ../../chaincode -ccl javascript -ccv 1.4"
```

## Verify It's Fixed

Check that CA containers are running:

```powershell
docker ps --filter "name=ca"
```

You should see:
```
ca.org1.example.com - Up X minutes
ca.org2.example.com - Up X minutes
```

## After Running the Fix

1. **Restart backend**:
```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

2. **Login as admin**:
   - Email: `example@gmail.com`
   - Password: `pass`

3. **Go to Access Management** and try approving again - it will work!

## Why This Happened

When you deployed the chaincode, the network was started **without** the Certificate Authority servers. The `-ca` flag is needed to enable user enrollment.

**Without CA**: Can't enroll new users  
**With CA**: Can approve and enroll users ✅

## Status Before vs After

### ❌ Before (Without CA):
```
peer0.org1.example.com    ✅ Running
peer0.org2.example.com    ✅ Running
orderer.example.com       ✅ Running
dev-peer0.org1...         ✅ Running (chaincode)
dev-peer0.org2...         ✅ Running (chaincode)
ca.org1.example.com       ❌ NOT RUNNING
ca.org2.example.com       ❌ NOT RUNNING
```

### ✅ After (With CA):
```
peer0.org1.example.com    ✅ Running
peer0.org2.example.com    ✅ Running
orderer.example.com       ✅ Running
dev-peer0.org1...         ✅ Running (chaincode)
dev-peer0.org2...         ✅ Running (chaincode)
ca.org1.example.com       ✅ Running  ← Now available!
ca.org2.example.com       ✅ Running  ← Now available!
```

## One-Time Setup

This only needs to be done once. After the network is started with CA, it will keep running until you explicitly stop it.

## Expected Time

The script takes about 2-3 minutes to complete.

---

**Run `.\restart-fabric-with-ca.ps1` now to fix the issue!** 🚀

