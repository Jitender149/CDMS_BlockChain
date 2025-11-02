# Self-Commit Configuration for Local Testing

## Overview

This configuration enables **self-endorsement** and **self-commit** behavior for Hyperledger Fabric local test networks. Transactions are immediately committed to the ledger without waiting for ordering service delays or peer endorsements.

**⚠️ FOR LOCAL TESTING ONLY - NOT FOR PRODUCTION USE ⚠️**

## Key Features

1. **Immediate Block Creation**: Orderer creates blocks with 0ms delay (`BatchTimeout: 0s`)
2. **One Transaction Per Block**: Each transaction creates its own block
3. **Immediate Peer Commit**: Peers commit blocks as soon as they receive them
4. **Direct Peer Connection**: SDK connects directly to endorsing peer, bypassing discovery

## Configuration Files

### 1. Orderer Configuration (`compose-test-net-selfcommit.yaml`)
- `ORDERER_GENERAL_BATCHTIMEOUT=0s` - Immediate block cutting
- `ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1` - One transaction per block

### 2. Peer Configuration
- `CORE_PEER_GOSSIP_USELEADERELECTION=false` - Direct leader
- `CORE_PEER_GOSSIP_STATE_ENABLED=false` - Disable state transfer delays
- `CORE_PEER_GOSSIP_PULLINTERVAL=1s` - Faster gossip propagation

### 3. SDK Configuration (`backend.js`)
- `SELF_COMMIT=true` environment variable enables self-commit mode
- Reduced commit timeout (60s instead of 300s)
- Direct peer connection (discovery disabled)

## Setup Instructions

### Step 1: Enable Self-Commit Mode

Set the environment variable in your backend:

```bash
# In cdms-backend/.env or set as environment variable
SELF_COMMIT=true
```

### Step 2: Use Modified Network Configuration (Optional)

For maximum self-commit behavior, you can use the modified docker-compose file:

```bash
cd fabric-samples/test-network

# Copy self-commit compose file (optional - environment variables can override)
cp compose/compose-test-net-selfcommit.yaml compose/compose-test-net.yaml
```

### Step 3: Start Network with Modified Config

If using modified configtx.yaml for immediate blocks:

```bash
cd fabric-samples/test-network

# Use modified configtx for immediate block creation
cp configtx.yaml configtx.yaml.backup
cp configtx.yaml-selfcommit configtx.yaml

# Start network
./network.sh up createChannel -ca
```

### Step 4: Verify Self-Commit Behavior

After submitting a transaction:

1. **Check Orderer Logs**:
   ```bash
   docker logs orderer.example.com | grep -i "block"
   ```
   Should show: `Creating block [n]` immediately after transaction

2. **Check Peer Logs**:
   ```bash
   docker logs peer0.org1.example.com | grep -i "committed"
   ```
   Should show: `[channel: mychannel] Committed block [n]` immediately

3. **Backend Logs**:
   ```
   [SELF-COMMIT] ✅ Transaction submitted. Result: ...
   ```
   Should appear in backend console

## How It Works

### Normal Fabric Flow:
1. Client submits transaction proposal to endorsing peers
2. Endorsing peers execute and return endorsement
3. Client collects endorsements and submits to orderer
4. Orderer waits for batch timeout (default: 2s)
5. Orderer creates block
6. Orderer sends block to committing peers
7. Peers validate and commit block

### Self-Commit Flow:
1. Client submits transaction proposal to endorsing peer
2. Endorsing peer executes and returns endorsement (self-endorsement)
3. Client submits to orderer
4. **Orderer creates block immediately (0ms delay)**
5. **Orderer sends block to peer immediately**
6. **Peer commits block immediately (no validation delays)**

## Verification

### Check Docker Logs for Immediate Block Creation

```bash
# Watch orderer logs for immediate block creation
docker logs -f orderer.example.com | grep "Creating block"

# Watch peer logs for immediate commit
docker logs -f peer0.org1.example.com | grep "Committed block"
```

### Expected Output

**Orderer logs**:
```
INFO 001 Creating block [n] for channel mychannel
```

**Peer logs**:
```
INFO 001 [channel: mychannel] Committed block [n] with 1 transaction(s)
```

## Limitations

1. **Single Peer Endorsement**: Only the submitting peer endorses (self-endorsement)
2. **No Multi-Peer Validation**: Other peers may not validate the transaction immediately
3. **Orderer Dependency**: Still requires orderer (cannot completely bypass)
4. **Not Production Ready**: This configuration is for testing only

## Troubleshooting

### Blocks Not Creating Immediately

1. Check orderer environment variables:
   ```bash
   docker exec orderer.example.com env | grep BATCHTIMEOUT
   ```
   Should show: `ORDERER_GENERAL_BATCHTIMEOUT=0s`

2. Verify orderer configtx.yaml has `BatchTimeout: 0s`

### Peers Not Committing Immediately

1. Check peer gossip settings:
   ```bash
   docker exec peer0.org1.example.com env | grep GOSSIP
   ```

2. Verify peer is org leader:
   ```bash
   docker logs peer0.org1.example.com | grep "leader"
   ```

### SDK Not Using Self-Commit

1. Verify `SELF_COMMIT=true` is set in backend environment
2. Check backend logs for `[SELF-COMMIT]` messages
3. Ensure backend.js has the self-commit configuration code

## Reverting to Normal Mode

To disable self-commit mode:

```bash
# Remove environment variable
unset SELF_COMMIT

# Or set to false
export SELF_COMMIT=false
```

Restart backend server to apply changes.

## Notes

- Self-commit mode reduces transaction latency significantly
- Useful for rapid prototyping and testing
- **DO NOT USE IN PRODUCTION** - lacks proper consensus and validation
- Network should be restarted after changing configuration

