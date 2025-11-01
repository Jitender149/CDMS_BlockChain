# Hyperledger Fabric Test Network Setup Guide

## Overview

The CDMS backend requires a running Hyperledger Fabric test network to function. This guide will help you set up the Fabric network that the backend needs.

## Prerequisites

- Docker and Docker Compose installed and running
- WSL2 (Windows Subsystem for Linux) - **Required for Windows**
- Basic knowledge of Linux commands

## Step-by-Step Setup

### Step 1: Navigate to Test Network Directory

Open a **WSL terminal** (not PowerShell) and navigate to the test network:

```bash
cd fabric-samples/test-network
```

### Step 2: Start the Fabric Network

Start the network and create a channel in one command:

```bash
./network.sh up createChannel
```

This will:
- Start all Fabric containers (peers, orderers, CAs)
- Create a channel named `mychannel`
- Generate connection profiles in `organizations/peerOrganizations/`

**Note**: On Windows, you must run this in WSL, not PowerShell, because the scripts use bash.

### Step 3: Verify Connection Profiles

After the network starts, verify the connection profiles exist:

```bash
ls organizations/peerOrganizations/org1.example.com/connection-org1.json
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

Both files should exist.

### Step 4: Deploy Chaincode (Optional but Recommended)

If you have chaincode to deploy:

```bash
# Set environment variables
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

# Deploy chaincode (example with asset-transfer-basic)
./network.sh deployCC -ccn cdmscontract -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript
```

Replace:
- `cdmscontract` with your contract name (should match `CONTRACT_NAME` in `.env`)
- `asset-transfer-basic/chaincode-javascript` with your chaincode path
- `javascript` with your chaincode language (go, javascript, typescript)

### Step 5: Install Dependencies in Backend

Make sure your backend has the Fabric network running before starting:

```bash
# In WSL or PowerShell, start the backend
cd cdms-backend
npm start
```

## Common Issues

### Issue 1: "network.sh: command not found" or "Permission denied"

**Solution**: 
```bash
# Make scripts executable
chmod +x network.sh
chmod +x organizations/ccp-generate.sh
```

### Issue 2: Docker containers not starting

**Solution**:
```bash
# Check Docker is running
docker ps

# If Docker isn't running, start Docker Desktop
# Then try again
./network.sh up
```

### Issue 3: "Cannot find connection profile" (Even after network starts)

**Solution**: 
- Ensure you're running `network.sh` in WSL, not PowerShell
- Check the path: `fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json`
- The files should be generated automatically when the network starts

### Issue 4: Channel already exists

**Solution**:
```bash
# Bring down the network and start fresh
./network.sh down
./network.sh up createChannel
```

## Network Management Commands

### Bring Network Up
```bash
./network.sh up
```

### Create Channel
```bash
./network.sh createChannel -c mychannel
```

### Bring Network Down
```bash
./network.sh down
```

### Restart Network
```bash
./network.sh restart
```

### Deploy Chaincode
```bash
./network.sh deployCC -ccn <chaincode-name> -ccp <chaincode-path> -ccl <language>
```

## Windows-Specific Notes

1. **Always use WSL for Fabric commands** - The `network.sh` script is a bash script and won't work in PowerShell or CMD
2. **Path differences** - WSL uses Linux paths (`/mnt/c/...`), but the backend code should handle this
3. **Docker Desktop integration** - Ensure WSL integration is enabled in Docker Desktop settings

## Verification

After setup, verify your network is running:

```bash
# Check containers are running
docker ps

# You should see containers like:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
# - ca_org1
# - ca_org2
```

## Next Steps

After the Fabric network is running:

1. **Enroll Admin users**:
   ```bash
   cd cdms-backend
   node enrollAdminA.js
   node enrollAdminB.js
   ```

2. **Start your backend**:
   ```bash
   npm start
   ```

3. **Test login** with a user that has been registered and approved

## Troubleshooting

If you continue to have issues:

1. Check Docker Desktop is running
2. Verify WSL2 is installed and updated
3. Check Fabric documentation: https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html
4. Ensure all prerequisites from Fabric documentation are installed

## Additional Resources

- [Hyperledger Fabric Test Network Documentation](https://hyperledger-fabric.readthedocs.io/en/latest/test_network.html)
- [Fabric Samples Repository](https://github.com/hyperledger/fabric-samples)

