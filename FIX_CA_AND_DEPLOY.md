# 🔧 CRITICAL FIX: CA Not Running + Wrong Chaincode Path

## 🎯 The Two Problems

### Problem 1: CA Not Running ❌
The Certificate Authority (CA) servers aren't running, so you can't approve new users.

**Error you saw:**
```
Error: Calling register endpoint failed with error [AggregateError]
code: 'ECONNREFUSED'
```

### Problem 2: Wrong Chaincode Path (in restart script) ❌
The `restart-fabric-with-ca.ps1` was pointing to the example chaincode, not yours!

**OLD (wrong):**
```powershell
-ccp ../asset-transfer-basic/chaincode-javascript   # ❌ Example chaincode
```

**NEW (correct):**
```powershell
-ccp /mnt/c/CDMS_Blockchain/chaincode              # ✅ YOUR chaincode
```

## ✅ What I Fixed

I updated `restart-fabric-with-ca.ps1` to:
1. Deploy **YOUR chaincode** from `C:\CDMS_Blockchain\chaincode\`
2. Use the correct version: `1.4`
3. Enable CA servers with the `-ca` flag

## 🚀 How to Fix Everything

### Step 1: Run the Fixed Script

```powershell
.\restart-fabric-with-ca.ps1
```

This will:
- ✅ Stop the current network
- ✅ Start network **with CA enabled**
- ✅ Deploy **YOUR chaincode** (index.js with all your roles)
- ✅ Show running containers

**Expected time:** 2-3 minutes

### Step 2: Verify Everything is Running

After the script completes, check:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}"
```

You should see:
```
NAMES                                STATUS
ca.org1.example.com                  Up X minutes  ← CA for Org1 ✅
ca.org2.example.com                  Up X minutes  ← CA for Org2 ✅
peer0.org1.example.com               Up X minutes
peer0.org2.example.com               Up X minutes
orderer.example.com                  Up X minutes
dev-peer0.org1...cdmscontract_1.4... Up X minutes  ← YOUR chaincode ✅
dev-peer0.org2...cdmscontract_1.4... Up X minutes  ← YOUR chaincode ✅
```

### Step 3: Restart Backend

```powershell
cd cdms-backend
npm start
```

You should see:
```
[FABRIC] ✅ Fabric initialized successfully
API server running on http://localhost:3000
```

### Step 4: Test User Approval

1. **Open frontend**: http://localhost:5173
2. **Login as admin**:
   - Email: `example@gmail.com`
   - Password: `pass`
   - Organization: A
3. **Go to**: Access Management page
4. **Click**: Approve on "JohnWick" (or whoever is pending)
5. **Result**: Should work! ✅

Or test via API:
```powershell
curl -X POST http://localhost:3000/approve-registration `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"balleballe@gmail.com\",
    \"adminEmail\": \"example@gmail.com\"
  }'
```

## 📂 Your Directory Structure (Clarified)

```
C:\CDMS_Blockchain\
│
├── chaincode\                              ← YOUR CHAINCODE ✅
│   ├── index.js                            ← YOUR updated code with RBAC
│   └── package.json
│
├── fabric-samples\                         ← Fabric tools
│   ├── test-network\                       ← Network scripts (network.sh)
│   └── asset-transfer-basic\               ← IGNORE THIS (examples only)
│       └── chaincode-javascript\           ← NOT used by your app
│
├── restart-fabric-with-ca.ps1              ← FIXED ✅ Points to YOUR chaincode
└── deploy-chaincode.sh                     ← Already correct
```

## 🔍 What Changed in restart-fabric-with-ca.ps1

### Before (WRONG):
```powershell
wsl bash -c "./network.sh deployCC -ccn cdmscontract \
  -ccp ../asset-transfer-basic/chaincode-javascript \  # ❌ Example chaincode
  -ccl javascript -ccv 1.5"
```

### After (CORRECT):
```powershell
wsl bash -c "./network.sh deployCC -ccn cdmscontract \
  -ccp /mnt/c/CDMS_Blockchain/chaincode \              # ✅ YOUR chaincode
  -ccl javascript -ccv 1.4"
```

## ✅ Verification Commands

### Check CA is Running:
```powershell
docker ps --filter "name=ca"
```

Should show both CAs running.

### Check Chaincode Version:
```powershell
docker ps --filter "name=dev-peer" --format "{{.Names}}"
```

Should show `cdmscontract_1.4` (not 1.5).

### Check CA Logs (if needed):
```powershell
docker logs ca.org1.example.com 2>&1 | Select-Object -Last 20
```

### Test CA Connection:
```powershell
# In cdms-backend directory
node -e "
const FabricCAServices = require('fabric-ca-client');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network',
  'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];

console.log('CA URL:', caInfo.url);
console.log('CA should be running at:', caInfo.url);
"
```

## 🎯 Expected Results

After running the fix, you should be able to:

1. ✅ **Approve users** - CA enrollment works
2. ✅ **Users can login** - With their role permissions
3. ✅ **RBAC works** - district_police, investigator, forensics_officer, admin roles
4. ✅ **Block history works** - GetAllHistory method available
5. ✅ **Access management works** - Approve, reject, revoke, restore

## ❓ FAQ

### Q: Do I need to keep fabric-samples?
**A:** Yes, but only for the `test-network` directory. The examples in `asset-transfer-basic` are not used by your app.

### Q: Can I delete the example chaincode?
**A:** Yes, but it won't hurt anything. Your app never touches it.

### Q: Will this affect my existing admin user?
**A:** No, `AdminOrg1` and `AdminOrg2` are already enrolled.

### Q: What if the script fails?
**A:** Check:
1. Docker Desktop is running
2. No other services on ports 7054, 8054
3. You have WSL installed and working

### Q: How do I know the right chaincode is deployed?
**A:** Check the container name:
```powershell
docker ps --filter "name=dev-peer" --format "{{.Names}}"
```
Should show version `1.4` and hash based on YOUR `chaincode/index.js`.

## 🔄 Starting Fresh (if needed)

If something goes wrong, start completely fresh:

```powershell
# 1. Stop everything
cd C:\CDMS_Blockchain\fabric-samples\test-network
wsl bash -c "./network.sh down"

# 2. Remove volumes (optional, for complete reset)
docker volume prune -f

# 3. Run the fixed script
cd C:\CDMS_Blockchain
.\restart-fabric-with-ca.ps1

# 4. Re-enroll admin (if wallet was cleared)
cd cdms-backend
node enrollAdminA.js
node enrollAdminB.js

# 5. Restart backend
npm start
```

## 📝 Summary

| Issue | Status | Fix |
|-------|--------|-----|
| CA not running | ✅ Fixed | Added `-ca` flag to network startup |
| Wrong chaincode path | ✅ Fixed | Changed to `/mnt/c/CDMS_Blockchain/chaincode` |
| Wrong version | ✅ Fixed | Using v1.4 (with RBAC) |
| User approval failing | ✅ Will be fixed | After running the script |

## 🚀 Ready to Go!

Run this now:
```powershell
.\restart-fabric-with-ca.ps1
```

Then:
```powershell
cd cdms-backend
npm start
```

**User approval will work after this!** 🎉

