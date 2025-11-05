# How to Monitor Blocks in Docker Logs

## Quick Commands to Check Block Creation

### Check Orderer Logs for Block Creation

**PowerShell:**
```powershell
# Watch orderer logs for new blocks (real-time)
docker logs -f orderer.example.com | Select-String -Pattern "Created block|Writing block"

# Check last 50 lines for blocks
docker logs orderer.example.com --tail 50 | Select-String -Pattern "block"

# Check entire log history for blocks
docker logs orderer.example.com 2>&1 | Select-String -Pattern "Created block|Writing block"
```

**WSL/Bash:**
```bash
# Watch orderer logs for new blocks (real-time)
docker logs -f orderer.example.com | grep -i "created block\|writing block"

# Check last 50 lines
docker logs orderer.example.com --tail 50 | grep -i block

# Count total blocks created
docker logs orderer.example.com 2>&1 | grep -c "Created block"
```

### Check Peer Logs for Block Commits

**PowerShell:**
```powershell
# Watch peer logs for committed blocks (real-time)
docker logs -f peer0.org1.example.com | Select-String -Pattern "Committed block"

# Check last 100 lines
docker logs peer0.org1.example.com --tail 100 | Select-String -Pattern "Committed block|endors|error"
```

**WSL/Bash:**
```bash
# Watch peer logs for committed blocks (real-time)
docker logs -f peer0.org1.example.com | grep -i "committed block\|endors\|error"

# Check last 100 lines
docker logs peer0.org1.example.com --tail 100 | grep -i "committed block"
```

### Check All Logs Simultaneously

**PowerShell:**
```powershell
# Orderer - new terminal/window
docker logs -f orderer.example.com

# Peer Org1 - new terminal/window
docker logs -f peer0.org1.example.com

# Peer Org2 - new terminal/window
docker logs -f peer0.org2.example.com

# Backend - new terminal/window
cd cdms-backend
npm start
```

## What to Look For

### ✅ Success Indicators:

**Orderer logs:**
```
INFO 001 Created block [3], there are 0 blocks in flight
INFO 001 Writing block [3] (Raft index: X) to ledger
```

**Peer logs:**
```
INFO 001 [channel: mychannel] Committed block [3] with 1 transaction(s)
INFO 001 Created block [3] (Raft index: X)
```

### ❌ Failure Indicators:

**Backend logs:**
```
No valid responses from any peers. Errors: []
```

**Peer logs:**
```
ERROR endorser
ERROR chaincode
ERROR proposal
```

## Expected Block Numbering

- **Block [0]**: Genesis block
- **Block [1]**: Channel configuration
- **Block [2]**: Chaincode deployment
- **Block [3]+**: Your transactions (uploads, etc.)

If you only see blocks [0], [1], [2], transactions are not reaching orderer.

