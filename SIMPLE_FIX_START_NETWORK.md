# 🚀 Simple Fix: Start Network with CA

## Current Status
Your network is completely stopped (no containers running).

## 2-Step Fix

### Step 1: Download CA Binaries (One-Time)

```powershell
wsl bash -c "cd /mnt/c/CDMS_Blockchain/fabric-samples && curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- binary --fabric-version 2.5.12 --ca-version 1.5.13"
```

This downloads the missing `fabric-ca-client` binary.

### Step 2: Start Network with CA

```powershell
wsl bash /mnt/c/CDMS_Blockchain/restart-with-ca.sh
```

## Or Do It Manually

```powershell
# Change to test-network directory
cd C:\CDMS_Blockchain\fabric-samples\test-network

# Stop any existing network
wsl bash -c "./network.sh down"

# Start with CA
wsl bash -c "./network.sh up createChannel -ca"

# Deploy YOUR chaincode
wsl bash -c "./network.sh deployCC -ccn cdmscontract -ccp /mnt/c/CDMS_Blockchain/chaincode -ccl javascript -ccv 1.4"
```

## After Network is Up

```powershell
# Check containers
docker ps

# You should see:
# - ca.org1.example.com
# - ca.org2.example.com  
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
# - dev-peer0.org1...cdmscontract_1.4
# - dev-peer0.org2...cdmscontract_1.4
```

## Then Test

```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

Login and try approving users!

