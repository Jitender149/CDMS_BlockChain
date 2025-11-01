# Quick Start: Setting Up Fabric Network

## Current Error
```
Fabric network not set up. Connection profile not found at: 
C:\CDMS_Blockchain\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json
```

## Solution: Set Up Fabric Network in 3 Steps

### Step 1: Open WSL Terminal
**Important**: You MUST use WSL (Windows Subsystem for Linux), NOT PowerShell!

```bash
# Open WSL terminal
wsl
```

### Step 2: Navigate to Test Network Directory
```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
```

**Note**: In WSL, Windows path `C:\CDMS_Blockchain` becomes `/mnt/c/CDMS_Blockchain`

### Step 3: Fix Line Endings (Important!)
The files have Windows line endings. Fix them first:

```bash
# Fix all shell scripts and config files (ignore permission warnings)
find . -type f \( -name "*.sh" -o -name "*.config" \) -exec sed -i 's/\r$//' {} \; 2>/dev/null
```

**Note**: You may see "preserving permissions" warnings - these are harmless! The line endings are being fixed correctly.

### Step 4: Check Docker is Running
Before starting, ensure Docker is running:

```bash
docker ps
```

If Docker isn't running, start Docker Desktop first.

### Step 5: Start the Fabric Network
```bash
# Start network and create channel in one command
./network.sh up createChannel
```

This will:
- ✅ Start all Fabric Docker containers (peers, orderers, CAs)
- ✅ Create a channel named `mychannel`
- ✅ Generate connection profiles automatically
- ⏱️ Take about 2-3 minutes

### Step 4: Verify It Worked
After the network starts, verify connection profiles exist:

```bash
ls organizations/peerOrganizations/org1.example.com/connection-org1.json
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

Both files should exist.

### Step 5: Enroll Admin Users (If Not Done)
Before logging in, you need to enroll admin users:

```bash
# Navigate to backend directory (in WSL)
cd /mnt/c/CDMS_Blockchain/cdms-backend

# Enroll admins for both organizations
node enrollAdminA.js
node enrollAdminB.js
```

## Common Issues

### Issue: "./network.sh: command not found" or "Permission denied"

**Fix**:
```bash
chmod +x network.sh
chmod +x organizations/ccp-generate.sh
```

### Issue: Docker containers not starting

**Fix**:
1. Check Docker Desktop is running
2. In Docker Desktop: Settings → Resources → WSL Integration
3. Enable integration for your WSL distribution
4. Restart Docker Desktop if needed

### Issue: Network already running

**Fix**:
```bash
# Bring down existing network first
./network.sh down

# Then start fresh
./network.sh up createChannel
```

## After Setup

Once the network is running:

1. ✅ Connection profiles will be generated automatically
2. ✅ Backend will be able to connect to Fabric
3. ✅ Login will work (if user is enrolled)

## Verify Network is Running

```bash
# Check Docker containers
docker ps

# You should see containers like:
# - peer0.org1.example.com
# - peer0.org2.example.com  
# - orderer.example.com
# - ca_org1
# - ca_org2
```

## Stop the Network (When Done)

```bash
./network.sh down
```

## Need Help?

See detailed guide: `FABRIC_SETUP.md`

