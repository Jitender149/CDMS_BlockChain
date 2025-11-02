# 🎯 Final Setup Instructions

## What I've Done

### ✅ 1. Updated Chaincode in Correct Location

Your chaincode is actually deployed from:
```
fabric-samples/asset-transfer-basic/chaincode-javascript/
```

I've updated:
- ✅ `lib/cdmsContract.js` - Now has all the latest features with RBAC
- ✅ `package.json` - Added `uuid` dependency
- ✅ PowerShell script - Now deploys from the correct location

### ✅ 2. Updated Deployment Script

The `restart-fabric-with-ca.ps1` script now:
- Points to the correct chaincode path: `../asset-transfer-basic/chaincode-javascript`
- Deploys version 1.5 (latest)
- Starts network with CA enabled

## 🚀 Now Run This to Fix Everything

### Step 1: Run the PowerShell Script

```powershell
.\restart-fabric-with-ca.ps1
```

This will:
1. Stop the current network
2. Start network **WITH CA** (fixes the ECONNREFUSED error)
3. Deploy chaincode v1.5 from the correct location
4. Show all running containers

**Expected time: 2-3 minutes**

### Step 2: Verify CA is Running

After the script completes, check:

```powershell
docker ps --filter "name=ca" --format "table {{.Names}}\t{{.Status}}"
```

You should see:
```
NAMES                    STATUS
ca.org1.example.com      Up X minutes  ✅
ca.org2.example.com      Up X minutes  ✅
```

### Step 3: Restart Backend

```powershell
cd cdms-backend
npm start
```

### Step 4: Test User Approval

1. **Login as admin**:
   - Email: `example@gmail.com`
   - Password: `pass`

2. **Go to Access Management page**

3. **Approve the pending user** (balleballe@gmail.com)
   - Should work now without ECONNREFUSED error!

4. **Test login with new user**:
   - Email: `balleballe@gmail.com`
   - Password: `pass`

## 📋 What's Fixed

### Before:
- ❌ CA servers not running → ECONNREFUSED
- ❌ Chaincode in wrong location (two separate directories)
- ❌ Can't approve users

### After:
- ✅ CA servers running
- ✅ Chaincode deployed from correct location
- ✅ Latest RBAC features included
- ✅ User approval works!

## 🔍 Verify Deployment

Check all containers are running:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "ca|peer|orderer|dev-"
```

Expected:
```
ca.org1.example.com                    Up X minutes  ✅
ca.org2.example.com                    Up X minutes  ✅
peer0.org1.example.com                 Up X minutes  ✅
peer0.org2.example.com                 Up X minutes  ✅
orderer.example.com                    Up X minutes  ✅
dev-peer0.org1...cdmscontract_1.5...   Up X minutes  ✅
dev-peer0.org2...cdmscontract_1.5...   Up X minutes  ✅
```

## 🎯 Summary of Changes

### 1. Chaincode Updated
**File**: `fabric-samples/asset-transfer-basic/chaincode-javascript/lib/cdmsContract.js`

Now includes:
- ✅ RBAC (district_police, investigator, forensics_officer, admin)
- ✅ Proper permissions for each role
- ✅ Block history (GetRecordHistory, GetAllHistory)
- ✅ Audit trail functionality
- ✅ Event emissions

### 2. Package Dependencies
**File**: `fabric-samples/asset-transfer-basic/chaincode-javascript/package.json`

Added:
- ✅ `uuid` package for unique IDs

### 3. Deployment Script
**File**: `restart-fabric-with-ca.ps1`

Updated to:
- ✅ Start network with CA flag (`-ca`)
- ✅ Deploy from correct path (`../asset-transfer-basic/chaincode-javascript`)
- ✅ Version 1.5

## 🧪 Test Checklist

After running the setup:

- [ ] CA containers running
- [ ] Backend starts without errors
- [ ] Admin can login
- [ ] Access Management page loads
- [ ] Can approve pending user (balleballe@gmail.com)
- [ ] New user can login
- [ ] New user sees dashboard (based on role)
- [ ] Block History page works

## ⚠️ Important Notes

### Don't Deploy from Two Locations

You were deploying from:
1. ❌ `chaincode/index.js` (standalone)
2. ✅ `fabric-samples/asset-transfer-basic/chaincode-javascript/` (correct)

Now everything uses the **correct location** in `fabric-samples/`.

### Why This Structure?

The `fabric-samples/asset-transfer-basic/chaincode-javascript/` structure is the standard Fabric format:
```
chaincode-javascript/
├── index.js          ← Entry point (exports CdmsContract)
├── lib/
│   └── cdmsContract.js  ← Your contract logic (updated!)
├── package.json      ← Dependencies (updated!)
└── test/            ← Tests
```

### Future Updates

To update chaincode:
1. Edit: `fabric-samples/asset-transfer-basic/chaincode-javascript/lib/cdmsContract.js`
2. Increment version in deployment command
3. Run: `wsl bash -c "./network.sh deployCC -ccn cdmscontract -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript -ccv X.X"`

## 🆘 Troubleshooting

### CA Still Not Running?

Check logs:
```powershell
docker logs ca.org1.example.com --tail 50
docker logs ca.org2.example.com --tail 50
```

### Backend Can't Connect?

Restart backend:
```powershell
cd cdms-backend
npm start
```

### Port Conflicts?

Kill processes on ports 7054, 8054:
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 7054).OwningProcess | Stop-Process
Get-Process -Id (Get-NetTCPConnection -LocalPort 8054).OwningProcess | Stop-Process
```

---

## 🚀 Ready to Go!

**Run this command now:**

```powershell
.\restart-fabric-with-ca.ps1
```

Then test user approval! 🎉

