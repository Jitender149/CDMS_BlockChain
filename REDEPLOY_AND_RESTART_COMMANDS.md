# Commands to Redeploy and Restart After Reverting to Normal Mode

## Quick Summary

After reverting to normal mode (multi-org endorsement), you need to:
1. ✅ **Redeploy chaincode** (version 1.7 with default policy)
2. ✅ **Restart backend** (to use new configuration)
3. ⚠️ **Check Docker containers** (restart only if needed)

---

## Step-by-Step Commands

### **Step 1: Check Docker Containers** (Optional - Verify They're Running)

**In PowerShell:**
```powershell
# Check if containers are running
docker ps | Select-String "peer0|orderer"

# Should show:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
```

**If containers are NOT running, start them:**

**In WSL:**
```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
```

**Then go to Step 2.**

**If containers ARE running, skip to Step 2.**

---

### **Step 2: Redeploy Chaincode** (REQUIRED)

**In WSL (Ubuntu terminal):**
```bash
# Navigate to project root
cd /mnt/c/CDMS_Blockchain

# Run the deployment script
bash deploy-chaincode.sh
```

**What this does:**
- Installs chaincode dependencies
- Packages chaincode
- Deploys chaincode version 1.7 with default multi-org endorsement policy
- Installs on both peers (peer0.org1 and peer0.org2)
- Commits chaincode to channel

**Expected output:**
```
======================================
  CDMS Chaincode Deployment Script
======================================

Step 1: Installing chaincode dependencies...
✓ Dependencies installed

Step 2: Navigating to test-network...

Step 3: Setting environment variables...
✓ Environment configured

Step 4: Deploying chaincode to network...
Endorsement Policy: Default (AND('Org1MSP.member', 'Org2MSP.member')) - requires both orgs
This may take a few minutes...

[... deployment logs ...]

======================================
  ✅ Chaincode Deployed Successfully!
======================================

Chaincode Details:
  Name:     cdmscontract
  Version:  1.7
  Channel:  mychannel
  Language: javascript
```

**If deployment fails, check:**
- Docker containers are running
- Network is up: `./network.sh up createChannel -ca`
- Chaincode syntax is correct

---

### **Step 3: Verify Chaincode Deployment** (Optional - Verify It Worked)

**In PowerShell:**
```powershell
# Check chaincode version on Org1 peer
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel

# Should show:
# Committed chaincode definition for chaincode 'cdmscontract' on channel 'mychannel':
# Version: 1.7
# Sequence: 2
# Endorsement Plugin: escc
# Validation Plugin: vscc
```

**Check endorsement policy:**
```powershell
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel -n cdmscontract --output json | ConvertFrom-Json | Select-Object -ExpandProperty EndorsementInfo | Select-Object EndorsementPolicy
```

**Should show:** `AND('Org1MSP.member', 'Org2MSP.member')` or similar multi-org policy.

---

### **Step 4: Stop Backend** (If Currently Running)

**In PowerShell:**
```powershell
# If backend is running, stop it (Ctrl+C in terminal)
# Or find and kill the process:
Get-Process -Name node | Where-Object {$_.Path -like "*cdms-backend*"} | Stop-Process -Force
```

---

### **Step 5: Remove SELF_COMMIT Environment Variable** (Optional)

**In PowerShell:**
```powershell
# Remove SELF_COMMIT if set
Remove-Item Env:\SELF_COMMIT -ErrorAction SilentlyContinue

# Or unset it
$env:SELF_COMMIT = $null

# Verify it's removed
$env:SELF_COMMIT
# Should return nothing
```

---

### **Step 6: Restart Backend** (REQUIRED)

**In PowerShell:**
```powershell
# Navigate to backend directory
cd C:\CDMS_Blockchain\cdms-backend

# Start backend
npm start
```

**Or if using nodemon:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
nodemon api.js
```

**Expected output:**
```
[BACKEND DEBUG] Gateway connected with standard configuration (multi-org endorsement)
✅ Connected to Fabric network as AdminOrg1 from Org1
```

**Should NOT see:**
- ❌ "SELF-COMMIT mode enabled"
- ❌ "SELF-ENDORSEMENT mode"
- ❌ "discovery: { enabled: false }"

**Should see:**
- ✅ "Gateway connected with standard configuration (multi-org endorsement)"
- ✅ "discovery: { enabled: true }"

---

### **Step 7: Verify Everything is Working**

**Test 1: Check Backend Health**

**In PowerShell:**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/health -Method GET | Select-Object -ExpandProperty Content
```

**Should return:**
```json
{"status":"healthy","service":"CDMS API","timestamp":"2025-11-02T..."}
```

---

**Test 2: Test Login**

Open frontend and try to log in. Should work normally.

---

**Test 3: Test Upload** (If you want to test block creation)

1. Log in through frontend
2. Upload a file
3. Check backend logs:

**Should see:**
```
[UPLOAD] Using AdminOrg1 identity for blockchain operation
[UPLOAD] ✅ Record REC_... created on blockchain
```

**Should NOT see:**
- ❌ "Self-endorsement: Using peer peer0.org1.example.com only"
- ❌ "Self-endorsement failed"

**Should see:**
- ✅ Discovery finding peers from both Org1 and Org2
- ✅ Transaction requiring endorsements from both orgs

---

**Test 4: Check Blocks Are Being Created**

**In PowerShell:**
```powershell
# Watch orderer logs for new blocks
docker logs orderer.example.com --tail 50 | Select-String -Pattern "Created block|Writing block"
```

**Should see:**
```
INFO [orderer.consensus.etcdraft] propose -> Created block [N]
INFO [orderer.consensus.etcdraft] writeBlock -> Writing block [N]
```

---

**Test 5: Query Real Blocks** (Optional)

**In PowerShell:**
```powershell
# Query blockchain info (requires authentication)
# Replace with your actual email and org
$headers = @{
    "Authorization" = "Bearer admin@example.com:Org1"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/blockchain/info" -Method GET -Headers $headers | Select-Object -ExpandProperty Content
```

**Should return:**
```json
{
  "success": true,
  "info": {
    "height": 10,
    "currentBlockHash": "...",
    "previousBlockHash": "...",
    "ledgerHeight": 10
  },
  "source": "blockchain"
}
```

---

## Complete Command Sequence (Copy-Paste)

### **Option 1: Quick Redeploy (If Containers Are Running)**

**In WSL:**
```bash
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**In PowerShell:**
```powershell
# Stop backend (if running)
cd C:\CDMS_Blockchain\cdms-backend
# Press Ctrl+C if running, then:
npm start
```

---

### **Option 2: Full Restart (If Containers Are Not Running)**

**In WSL:**
```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**In PowerShell:**
```powershell
# Remove SELF_COMMIT if set
Remove-Item Env:\SELF_COMMIT -ErrorAction SilentlyContinue

# Start backend
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

---

## Troubleshooting

### **Error: "Chaincode deployment failed"**

**Check:**
1. Docker containers are running:
   ```powershell
   docker ps | Select-String "peer0|orderer"
   ```

2. Network is up:
   ```bash
   # In WSL
   cd fabric-samples/test-network
   ./network.sh up createChannel -ca
   ```

3. Chaincode syntax:
   ```bash
   # In WSL
   cd /mnt/c/CDMS_Blockchain/chaincode
   npm install
   ```

---

### **Error: "No valid responses from any peers"**

**This means:**
- Chaincode might still have single-org policy
- Both peers might not be running
- Discovery might not be finding peers

**Check:**
1. Verify chaincode policy:
   ```powershell
   docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel -n cdmscontract --output json | ConvertFrom-Json | Select-Object -ExpandProperty EndorsementInfo | Select-Object EndorsementPolicy
   ```
   Should show multi-org policy.

2. Check both peers are running:
   ```powershell
   docker ps | Select-String "peer0"
   ```
   Should show both peer0.org1 and peer0.org2.

3. Check backend logs for discovery:
   ```
   [BACKEND DEBUG] Gateway connected with standard configuration (multi-org endorsement)
   ```
   Should show discovery enabled.

---

### **Error: "Identity not found in wallet"**

**Fix:**
```powershell
# In PowerShell
cd C:\CDMS_Blockchain\cdms-backend
node setup-test-admin.js
```

**Or:**
```bash
# In WSL
cd /mnt/c/CDMS_Blockchain
bash enroll-admin.sh  # If you have this script
```

---

### **Error: "Connection profile not found"**

**Check:**
1. Network is started:
   ```bash
   # In WSL
   cd fabric-samples/test-network
   ./network.sh up createChannel -ca
   ```

2. Connection profile exists:
   ```powershell
   Test-Path "C:\CDMS_Blockchain\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json"
   ```
   Should return `True`.

---

## Summary Checklist

- [ ] **Docker containers running** (check with `docker ps`)
- [ ] **Chaincode redeployed** (version 1.7 with default policy)
- [ ] **Backend restarted** (using new configuration)
- [ ] **SELF_COMMIT removed** (if it was set)
- [ ] **Backend logs show** "standard configuration (multi-org endorsement)"
- [ ] **No self-endorsement messages** in logs
- [ ] **Test upload works** and creates blocks
- [ ] **Blocks visible in orderer logs**

---

## Quick Reference

**Redeploy chaincode:**
```bash
cd /mnt/c/CDMS_Blockchain && bash deploy-chaincode.sh
```

**Restart backend:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend && npm start
```

**Check containers:**
```powershell
docker ps | Select-String "peer0|orderer"
```

**Check chaincode version:**
```powershell
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
```

**Check blocks:**
```powershell
docker logs orderer.example.com --tail 50 | Select-String "Created block"
```

