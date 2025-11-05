# Revert to Normal Mode (Multi-Org Endorsement)

## Changes Made

### 1. **deploy-chaincode.sh**
   - ✅ Removed single-org endorsement policy (`OR('Org1MSP.member')`)
   - ✅ Now uses default multi-org policy: `AND('Org1MSP.member', 'Org2MSP.member')`
   - ✅ Updated version to `1.7`
   - ✅ Removed `-ccep` flag (no custom policy)

### 2. **cdms-backend/backend.js**
   - ✅ Removed self-commit mode configuration
   - ✅ Removed self-endorsement peer selection
   - ✅ Now always uses standard configuration with discovery enabled
   - ✅ Discovery enabled to find all peers for multi-org endorsement

### 3. **cdms-backend/api.js**
   - ✅ Removed explicit peer selection for self-endorsement
   - ✅ Removed `selfCommitMode` checks
   - ✅ Now uses standard `submitTransaction()` calls
   - ✅ Discovery automatically finds all required peers

## What Needs to be Restarted/Redeployed

### ✅ **1. Redeploy Chaincode** (REQUIRED)

The chaincode needs to be redeployed with the new version (1.7) and default multi-org endorsement policy.

**In WSL:**
```bash
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**Or manually:**
```bash
cd fabric-samples/test-network
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

./network.sh deployCC \
    -ccn cdmscontract \
    -ccp ../../../CDMS_Blockchain/chaincode \
    -ccl javascript \
    -ccv 1.7 \
    -c mychannel
```

**Why:** The old chaincode (version 1.6) has single-org policy. New version (1.7) has default multi-org policy.

---

### ✅ **2. Restart Backend** (REQUIRED)

The backend needs to be restarted to use the new configuration (discovery enabled, no self-endorsement).

**In PowerShell:**
```powershell
# Stop the backend (Ctrl+C if running)
# Then restart:
cd cdms-backend
npm start
```

**Or if using nodemon:**
```powershell
# Just save a file to trigger restart, or Ctrl+C and restart
```

**Why:** Backend code changed to remove self-endorsement logic and enable discovery.

---

### ⚠️ **3. Docker Containers** (NOT REQUIRED)

**You do NOT need to restart Docker containers** if:
- ✅ Network is already running
- ✅ Both peers (peer0.org1 and peer0.org2) are running
- ✅ Orderer is running

**Check if running:**
```powershell
docker ps | Select-String "peer0|orderer"
```

**Only restart if:**
- ❌ Containers are not running
- ❌ Network is down
- ❌ You want a fresh start

**To restart network (if needed):**
```bash
# In WSL
cd fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
```

---

### ✅ **4. Remove SELF_COMMIT Environment Variable** (OPTIONAL)

If you have `SELF_COMMIT=true` set, remove it:

**PowerShell:**
```powershell
# Remove if set
Remove-Item Env:\SELF_COMMIT -ErrorAction SilentlyContinue

# Or unset
$env:SELF_COMMIT = $null
```

**Why:** The backend no longer checks this variable, but it's good practice to remove it.

---

## Verification Steps

### 1. Verify Chaincode Deployment

**Check chaincode version:**
```powershell
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
```

Should show version **1.7**.

**Check endorsement policy:**
```powershell
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel -n cdmscontract --output json | ConvertFrom-Json | Select-Object -ExpandProperty EndorsementInfo | Select-Object EndorsementPolicy
```

Should show: `AND('Org1MSP.member', 'Org2MSP.member')` (or similar multi-org policy).

### 2. Verify Backend Configuration

**Check backend logs:**
```
[BACKEND DEBUG] Gateway connected with standard configuration (multi-org endorsement)
```

Should **NOT** see:
- ❌ "SELF-COMMIT mode enabled"
- ❌ "SELF-ENDORSEMENT mode"
- ❌ "discovery: { enabled: false }"

Should see:
- ✅ "Gateway connected with standard configuration"
- ✅ "discovery: { enabled: true }"

### 3. Test Upload

Upload a file through the frontend. Check backend logs:

**Should see:**
```
[UPLOAD] Using AdminOrg1 identity for blockchain operation
[UPLOAD] ✅ Record REC_... created on blockchain
```

**Should NOT see:**
- ❌ "Self-endorsement: Using peer peer0.org1.example.com only"
- ❌ "Self-endorsement failed"

**Should see discovery working:**
- ✅ Discovery finding peers from both Org1 and Org2
- ✅ Transaction requiring endorsements from both orgs

---

## Important Notes

### Writers Policy (Still Required)

The **Writers policy workaround is still in place**:
- ✅ Backend uses `AdminOrg1` or `AdminOrg2` for blockchain operations
- ✅ These admin identities have Writers policy permissions
- ✅ This is **NOT** related to self-endorsement
- ✅ This is a **separate issue** (user identities not in Writers policy)

**Why:** User identities (like `kudimainukehdijaguarlelo`) don't have Writers policy, so we use admin identities for blockchain operations. This is correct and should remain.

### Multi-Org Endorsement

Now transactions require:
- ✅ Endorsement from **Org1 peer** (`peer0.org1.example.com`)
- ✅ Endorsement from **Org2 peer** (`peer0.org2.example.com`)
- ✅ Both peers must be running and available
- ✅ Discovery must find both peers

### If Endorsement Fails

If you get "No valid responses from any peers":

1. **Check both peers are running:**
   ```powershell
   docker ps | Select-String "peer0"
   ```
   Should show both `peer0.org1.example.com` and `peer0.org2.example.com`.

2. **Check chaincode is deployed on both peers:**
   ```powershell
   docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
   docker exec peer0.org2.example.com peer lifecycle chaincode querycommitted -C mychannel
   ```

3. **Check discovery is working:**
   Backend logs should show discovery finding peers.

---

## Summary

**What to do:**
1. ✅ **Redeploy chaincode** (version 1.7 with default policy)
2. ✅ **Restart backend** (to use new configuration)
3. ❌ **DO NOT** restart Docker containers (unless not running)
4. ✅ **Remove** `SELF_COMMIT` environment variable (optional)

**What changed:**
- Chaincode: Single-org policy → Multi-org policy
- Backend: Self-endorsement → Standard discovery
- API: Explicit peer selection → Standard submission

**What stayed the same:**
- Writers policy workaround (using AdminOrg1/AdminOrg2)
- Block querying functionality
- All other features

