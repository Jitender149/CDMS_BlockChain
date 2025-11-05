# Quick Guide: How to Monitor Blocks in Docker

## PowerShell Commands (Run in PowerShell)

### Watch Orderer Logs for New Blocks

```powershell
# Watch in real-time (Ctrl+C to stop)
docker logs -f orderer.example.com | Select-String -Pattern "Created block|Writing block"
```

### Watch Peer Logs for Committed Blocks

```powershell
# Watch in real-time (Ctrl+C to stop)
docker logs -f peer0.org1.example.com | Select-String -Pattern "Committed block"
```

### Check All Recent Blocks

```powershell
# Orderer - last 50 lines
docker logs orderer.example.com --tail 50 | Select-String -Pattern "block"

# Peer - last 50 lines
docker logs peer0.org1.example.com --tail 50 | Select-String -Pattern "Committed block"
```

## Or Use the Script

```powershell
.\check-blocks.ps1
```

This will monitor and alert you when new blocks are created!

## What You'll See When Blocks Are Created

**Orderer Logs:**
```
INFO Created block [3], there are 0 blocks in flight
INFO Writing block [3] (Raft index: X) to ledger
```

**Peer Logs:**
```
INFO [channel: mychannel] Committed block [3] with 1 transaction(s)
```

**Backend Logs:**
```
[UPLOAD] ✅ Record ... created on blockchain
```

