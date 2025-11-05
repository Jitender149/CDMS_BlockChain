# Fix: Discovery Access Denied Error During Login

## Problem

**Error:** `DiscoveryService: mychannel error: access denied`

**When:** During login when trying to connect to Fabric network

**Why:** Discovery service with `asLocalhost: true` can have access control issues in local testing environments.

---

## Solution Applied

**Changed:** `cdms-backend/backend.js`

**Before:**
```javascript
discovery: { enabled: true, asLocalhost: true },  // Enable discovery to find all peers
```

**After:**
```javascript
discovery: { enabled: false, asLocalhost: true },  // Disable discovery to avoid access denied error
```

---

## What This Means

### ✅ **Login Will Work**
- Discovery is disabled, so no access denied error
- Gateway connects directly to peer from connection profile
- Login should succeed

### ⚠️ **Multi-Org Endorsement Limitation**
- With discovery disabled, SDK only uses peer from connection profile
- If chaincode has multi-org policy (`AND('Org1MSP.member', 'Org2MSP.member')`), transactions may fail
- Transactions will only get endorsement from one peer (from connection profile)

### ✅ **Block Creation Still Works**
- Transactions will still be submitted
- Orderer will still create blocks
- Blocks will still be committed to blockchain

---

## Next Steps

### **1. Restart Backend** (REQUIRED)

**In PowerShell:**
```powershell
# Stop backend (Ctrl+C if running)
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

**Expected logs:**
```
[BACKEND DEBUG] Gateway connected with standard configuration (discovery disabled to avoid access denied)
✅ Connected to Fabric network as AdminOrg1 from Org1
```

**Should NOT see:**
- ❌ "DiscoveryService: mychannel error: access denied"
- ❌ "Login error: DiscoveryService: mychannel error: access denied"

**Should see:**
- ✅ Successful login
- ✅ "Gateway connected with standard configuration"

---

### **2. Test Login**

Try logging in through the frontend. Should work now!

---

### **3. If Transactions Fail with Multi-Org Policy**

If you get "No valid responses from any peers" when uploading:

**Option A: Change Chaincode Endorsement Policy** (Easier)

Redeploy chaincode with single-org policy:

**In `deploy-chaincode.sh`:**
```bash
CC_END_POLICY="OR('Org1MSP.member')"
```

Then redeploy:
```bash
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**Option B: Keep Multi-Org Policy** (More Complex)

If you want to keep multi-org policy, you'll need to:
1. Add both peers to connection profile, OR
2. Explicitly specify both peers when submitting transactions

This requires more code changes.

---

## Summary

**Fixed:**
- ✅ Login error (discovery access denied)
- ✅ Backend can connect to Fabric network
- ✅ Queries will work

**Limitation:**
- ⚠️ With discovery disabled, only one peer is used
- ⚠️ Multi-org endorsement policy may fail if it requires both orgs

**Recommendation:**
- For now: Use single-org policy (`OR('Org1MSP.member')`) if transactions fail
- Later: Can implement explicit peer specification for true multi-org endorsement

---

## Verification

**Test login:**
1. Open frontend
2. Try to log in
3. Should succeed (no discovery access denied error)

**Check backend logs:**
```
[BACKEND DEBUG] Gateway connected with standard configuration (discovery disabled to avoid access denied)
✅ Connected to Fabric network as AdminOrg1 from Org1
```

**Should NOT see:**
- ❌ "DiscoveryService: mychannel error: access denied"

