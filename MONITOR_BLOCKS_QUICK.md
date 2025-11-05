# Quick Guide: How to Monitor Blocks in Docker

## PowerShell Commands (Run in PowerShell)

### 1. Watch Orderer for New Blocks (Real-time)

```powershell
docker logs -f orderer.example.com | Select-String -Pattern "Created block|Writing block"
```

**What to look for:**
```
INFO Created block [3], there are 0 blocks in flight
INFO Writing block [3] (Raft index: X) to ledger
```

### 2. Watch Peer for Committed Blocks (Real-time)

```powershell
docker logs -f peer0.org1.example.com | Select-String -Pattern "Committed block"
```

**What to look for:**
```
INFO [channel: mychannel] Committed block [3] with 1 transaction(s)
```

### 3. Check All Recent Blocks (One-time)

```powershell
# Orderer - last 50 lines
docker logs orderer.example.com --tail 50 | Select-String -Pattern "block"

# Peer - last 50 lines  
docker logs peer0.org1.example.com --tail 50 | Select-String -Pattern "Committed block"
```

### 4. Use the Monitoring Script

```powershell
.\check-blocks.ps1
```

This will automatically detect and alert when new blocks are created!

## Expected Flow

1. **Upload a file** → Backend logs: `[UPLOAD] ✅ Record ... created on blockchain`
2. **Orderer logs** → `Created block [3]` (immediately)
3. **Peer logs** → `Committed block [3]` (immediately after orderer)
4. **Blocks appear** in `/block-history` endpoint

## Current Status

**Block [0]**: Genesis block  
**Block [1]**: Channel configuration  
**Block [2]**: Chaincode deployment  
**Block [3]+**: Your transactions (uploads, etc.) ← **These should appear after fix!**

