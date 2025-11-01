# How to Set Up Hyperledger Fabric Network - Step by Step

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ WSL2 installed (Windows Subsystem for Linux)
- ✅ Node.js installed (for enrolling users later)

## Step 1: Open WSL Terminal

**IMPORTANT**: You must use WSL (Windows Subsystem for Linux), NOT PowerShell!

### Option A: From Windows Start Menu
1. Press `Windows Key`
2. Type "Ubuntu" or "WSL"
3. Click on "Ubuntu" (or your installed Linux distribution)

### Option B: From PowerShell
```powershell
wsl
```

You should now see a Linux terminal prompt like:
```
username@hostname:~$
```

## Step 2: Navigate to Fabric Test Network Directory

In your WSL terminal, type:

```bash
# Navigate to the project root
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
```

**Note**: In WSL, Windows paths are mounted under `/mnt/c/`. So:
- Windows path: `C:\CDMS_Blockchain\fabric-samples\test-network`
- WSL path: `/mnt/c/CDMS_Blockchain/fabric-samples/test-network`

## Step 3: Fix Line Endings (Required for Windows)

The scripts have Windows line endings. Fix them using `sed`:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Fix all shell scripts (removes Windows \r line endings)
find . -name "*.sh" -exec sed -i 's/\r$//' {} \;
```

**Note**: You may get "Operation not permitted" with `chmod` - this is normal for Windows filesystems and can be ignored.

## Step 4: Start the Fabric Network

Run this command to start the network and create a channel:

```bash
./network.sh up createChannel
```

**What this does:**
- Starts all Fabric Docker containers (peers, orderers, certificate authorities)
- Creates a channel named `mychannel`
- Generates connection profile files automatically

**Expected output:**
You should see output like:
```
Creating network "fabric_test" ... done
Creating peer0.org1.example.com ...
Creating peer0.org2.example.com ...
Creating orderer.example.com ...
...
Channel 'mychannel' created
```

**Time**: This will take about 2-3 minutes. Wait until you see:
```
✅ Channel 'mychannel' created
```

## Step 5: Verify Connection Profiles Were Created

Check if the connection profile files exist:

```bash
# Check for Org1 connection profile
ls organizations/peerOrganizations/org1.example.com/connection-org1.json

# Check for Org2 connection profile
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

Both files should exist. If they don't, the network setup might have failed.

## Step 6: Enroll Admin Users

Before you can log in, you need to enroll admin users in the Fabric network.

Open a **NEW WSL terminal** (keep the network running in the first one), then:

```bash
# Navigate to backend directory
cd /mnt/c/CDMS_Blockchain/cdms-backend

# Enroll Admin for Organization A
node enrollAdminA.js

# Enroll Admin for Organization B
node enrollAdminB.js
```

You should see output like:
```
✅ Successfully enrolled admin user "AdminOrg1" and imported it into the wallet
✅ Successfully enrolled admin user "AdminOrg2" and imported it into the wallet
```

## Step 7: Test Your Setup

1. **Keep the Fabric network running** (don't close the first WSL terminal)

2. **In PowerShell or another terminal**, start your backend:
   ```powershell
   cd C:\CDMS_Blockchain\cdms-backend
   npm start
   ```

3. **Try logging in** from the frontend with:
   - Email: `example@gmail.com` (or your test user)
   - Password: (the password you used when creating the user)
   - Organization: Select "A" or "B"

## Troubleshooting

### Problem: "./network.sh: command not found"
**Solution**: Make sure you're in the correct directory:
```bash
pwd  # Should show: /mnt/c/CDMS_Blockchain/fabric-samples/test-network
ls network.sh  # Should list the file
```

### Problem: "Permission denied"
**Solution**: Make scripts executable:
```bash
chmod +x network.sh
chmod +x organizations/ccp-generate.sh
```

### Problem: Docker containers not starting
**Solution**:
1. Make sure Docker Desktop is running (check system tray)
2. Verify Docker works: `docker ps`
3. In Docker Desktop: Settings → Resources → WSL Integration
4. Enable integration for your WSL distribution
5. Restart Docker Desktop if needed

### Problem: "Network already exists"
**Solution**: Bring down existing network first:
```bash
./network.sh down
./network.sh up createChannel
```

### Problem: Connection profiles not found after network starts
**Solution**: The profiles are generated automatically. If missing:
```bash
# Check if organizations directory exists
ls organizations/peerOrganizations/

# If empty, try bringing network down and up again
./network.sh down
./network.sh up createChannel
```

### Problem: "Cannot connect to Docker daemon"
**Solution**: Ensure Docker Desktop is running and WSL integration is enabled.

## Keeping the Network Running

**Important**: The Fabric network must stay running while you use the application!

- **Keep the WSL terminal open** where you ran `./network.sh up createChannel`
- If you close it, the network stops
- To stop the network: Run `./network.sh down` in that terminal

## What Gets Created

When you run `./network.sh up createChannel`, it creates:

1. **Docker containers**:
   - `peer0.org1.example.com`
   - `peer0.org2.example.com`
   - `orderer.example.com`
   - `ca_org1`
   - `ca_org2`

2. **Connection profiles**:
   - `organizations/peerOrganizations/org1.example.com/connection-org1.json`
   - `organizations/peerOrganizations/org2.example.com/connection-org2.json`

3. **Crypto materials**:
   - Certificates and keys for all organizations

## Quick Reference Commands

```bash
# Start network and create channel
./network.sh up createChannel

# Bring down network
./network.sh down

# Check network status
docker ps

# Check connection profiles
ls organizations/peerOrganizations/org1.example.com/connection-org1.json
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

## Next Steps After Setup

1. ✅ Network is running
2. ✅ Connection profiles exist
3. ✅ Admins are enrolled
4. ✅ You can now log in to the application!

## Need More Help?

- See `FABRIC_SETUP.md` for detailed documentation
- See `QUICK_START_FABRIC.md` for quick reference
- Check Hyperledger Fabric docs: https://hyperledger-fabric.readthedocs.io/

