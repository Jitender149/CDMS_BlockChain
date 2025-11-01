# Fix "docker network is required to be running" Error

## Problem
When running `./network.sh up createChannel`, you see:
```
docker network is required to be running to create a channel
```

This happens because the script needs to create a Docker network first before starting containers.

## Solution 1: Bring Down Any Existing Network and Start Fresh

The network might be in a partial state. Clean it up first:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Bring down any existing network
./network.sh down

# Wait a few seconds for cleanup

# Start the network and create channel (one command)
./network.sh up createChannel
```

## Solution 2: Start Network First, Then Create Channel

If the above doesn't work, start the network first, then create the channel:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Step 1: Start the network only
./network.sh up

# Wait until you see all containers running
# Check with: docker ps
# You should see containers like peer0.org1, peer0.org2, orderer, ca_org1, ca_org2

# Step 2: Once network is up, create the channel
./network.sh createChannel
```

## Solution 3: Check Docker Network Manually

Check if the Docker network exists:

```bash
# List Docker networks
docker network ls

# Look for network named "fabric_test" or similar
# If it doesn't exist, the script will create it
```

If the network doesn't exist, it should be created automatically by `./network.sh up`. If not, create it manually:

```bash
docker network create fabric_test
```

## Solution 4: Check for Conflicting Networks

Sometimes old networks cause issues:

```bash
# List all networks
docker network ls

# Remove old Fabric networks (be careful!)
docker network rm fabric_test
docker network prune  # Removes unused networks

# Then try again
./network.sh up createChannel
```

## Solution 5: Check Docker is Properly Running

Ensure Docker is fully operational:

```bash
# Test Docker
docker ps
docker version

# Test Docker Compose
docker-compose --version

# If docker-compose doesn't work, try:
docker compose --version
```

## Complete Clean Start (Recommended)

If nothing else works, do a complete clean start:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# 1. Bring down everything
./network.sh down

# 2. Clean up any leftover Docker resources
docker network prune -f
docker volume prune -f

# 3. Wait a moment for cleanup

# 4. Start fresh
./network.sh up createChannel
```

## What the Script Does

The `./network.sh up createChannel` command should:
1. Create Docker network (`fabric_test`)
2. Start all Docker containers (peers, orderers, CAs)
3. Wait for containers to be ready
4. Create the channel `mychannel`
5. Generate connection profiles

If it's failing at step 1 or 2, the Docker network creation is the issue.

## Debug Steps

1. **Check Docker is running**:
   ```bash
   docker ps
   ```
   Should work without errors

2. **Check Docker network**:
   ```bash
   docker network ls | grep fabric
   ```
   Should show fabric_test network if it exists

3. **Check containers**:
   ```bash
   docker ps -a
   ```
   Look for any stopped Fabric containers

4. **Check logs**:
   ```bash
   docker logs peer0.org1.example.com 2>&1 | tail -20
   ```
   See what errors containers might have

## Common Causes

1. **Docker Desktop not fully started**: Wait a moment after starting Docker Desktop
2. **WSL integration not enabled**: Check Docker Desktop settings
3. **Old network state**: Run `./network.sh down` first
4. **Permission issues**: Ensure Docker Desktop has permissions
5. **WSL2 not updated**: Update WSL: `wsl --update`

## After Success

Once the network starts successfully, you should see:
```
✅ Creating channel 'mychannel'
✅ Channel 'mychannel' created
✅ All containers running
```

Then you can verify connection profiles exist:
```bash
ls organizations/peerOrganizations/org1.example.com/connection-org1.json
ls organizations/peerOrganizations/org2.example.com/connection-org2.json
```

