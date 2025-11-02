# Quick Start: Self-Commit Mode

## What is Self-Commit Mode?

Self-commit mode enables **immediate block creation and commit** for local testing. Transactions are committed to the ledger immediately without waiting for ordering service delays or peer endorsements.

**⚠️ FOR LOCAL TESTING ONLY - NOT FOR PRODUCTION USE ⚠️**

## Quick Setup (3 Steps)

### Step 1: Enable Self-Commit in Backend

**PowerShell:**
```powershell
.\enable-self-commit.ps1
```

**Manual:**
Add to `cdms-backend/.env`:
```env
SELF_COMMIT=true
```

### Step 2: Apply Self-Commit Network Configuration (Optional)

**WSL/Linux:**
```bash
cd fabric-samples/test-network
bash apply-self-commit-config.sh
```

Or manually set orderer environment variable:
```bash
export ORDERER_GENERAL_BATCHTIMEOUT=0s
```

### Step 3: Restart Backend

```bash
cd cdms-backend
npm start
```

## Verification

### Check Backend Logs

Look for:
```
[BACKEND DEBUG] 🔧 SELF-COMMIT mode enabled (for local testing)
[SELF-COMMIT] ✅ Transaction submitted. Result: ...
```

### Check Docker Logs

**Orderer logs** (should show immediate block creation):
```bash
docker logs orderer.example.com | grep "Creating block"
```

Expected output:
```
INFO 001 Creating block [n] for channel mychannel
```

**Peer logs** (should show immediate commit):
```bash
docker logs peer0.org1.example.com | grep "Committed block"
```

Expected output:
```
INFO 001 [channel: mychannel] Committed block [n] with 1 transaction(s)
```

## How It Works

### Configuration Changes:

1. **Orderer**: `ORDERER_GENERAL_BATCHTIMEOUT=0s` - Creates blocks immediately
2. **Orderer**: `ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1` - One transaction per block
3. **Peer**: Disabled state transfer and gossip delays for faster propagation
4. **SDK**: Reduced commit timeout (60s) and direct peer connection

### Transaction Flow:

1. ✅ Transaction submitted to peer (self-endorsement)
2. ✅ Transaction sent to orderer
3. ✅ **Orderer creates block immediately (0ms delay)**
4. ✅ Orderer sends block to peer
5. ✅ **Peer commits block immediately (no validation delays)**
6. ✅ Block appears in ledger

## Disable Self-Commit Mode

**PowerShell:**
```powershell
.\disable-self-commit.ps1
```

**Manual:**
Set in `cdms-backend/.env`:
```env
SELF_COMMIT=false
```

Restart backend server.

## Troubleshooting

### Blocks Not Creating Immediately

1. Check orderer environment variables:
   ```bash
   docker exec orderer.example.com env | grep BATCHTIMEOUT
   ```
   Should show: `ORDERER_GENERAL_BATCHTIMEOUT=0s`

2. Restart network with self-commit config:
   ```bash
   cd fabric-samples/test-network
   ./network.sh down
   ./network.sh up createChannel -ca
   ```

### Backend Not Using Self-Commit

1. Verify `SELF_COMMIT=true` in `cdms-backend/.env`
2. Restart backend server
3. Check logs for `[SELF-COMMIT]` messages

### Peer Not Committing Immediately

1. Check peer logs for any errors
2. Verify peer is leader: `docker logs peer0.org1.example.com | grep "leader"`
3. Check gossip settings are correct

## Files Modified

- `cdms-backend/backend.js` - Added self-commit gateway configuration
- `fabric-samples/test-network/compose/compose-test-net-selfcommit.yaml` - Orderer/peer config for immediate blocks
- `fabric-samples/test-network/configtx.yaml-selfcommit` - Channel config for immediate blocks
- `cdms-backend/self-commit-config.js` - Self-commit helper functions

## Notes

- ⚠️ **FOR TESTING ONLY** - This configuration bypasses normal Fabric consensus
- ✅ Useful for rapid prototyping and development
- ✅ Reduces transaction latency significantly
- ❌ **DO NOT USE IN PRODUCTION** - Lacks proper validation and consensus

