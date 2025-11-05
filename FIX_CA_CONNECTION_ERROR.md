# Fix: CA Connection Error (ECONNREFUSED 127.0.0.1:7054)

## Problem

**Error:** `Error: Calling enroll endpoint failed with error [Error: connect ECONNREFUSED 127.0.0.1:7054]`

**Cause:** Fabric CA servers are not running. The network was started without the `-ca` flag.

**Port 7054:** This is the Fabric CA server port for Org1.

---

## Quick Fix

### **Option 1: Use PowerShell Script** (Easiest)

**In PowerShell:**
```powershell
cd C:\CDMS_Blockchain
.\restart-fabric-with-ca.ps1
```

This will:
1. ✅ Stop current network
2. ✅ Start network **with CA enabled** (`-ca` flag)
3. ✅ Redeploy chaincode v1.7
4. ✅ Verify CA containers are running

---

### **Option 2: Manual Commands** (Step-by-Step)

**In WSL (Ubuntu terminal):**
```bash
# Navigate to test-network
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Stop current network
./network.sh down

# Start network WITH CA (the -ca flag is crucial!)
./network.sh up createChannel -ca

# Deploy chaincode (use the deployment script)
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

---

## Verify CA is Running

**In PowerShell:**
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String "ca"
```

**Should show:**
```
ca.org1.example.com    Up X minutes    0.0.0.0:7054->7054/tcp
ca.org2.example.com    Up X minutes    0.0.0.0:8054->8054/tcp
```

**If you see this, CA is running! ✅**

---

## After Fixing

### **1. Re-enroll Admin Identities**

**In PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
node setup-test-admin.js
```

**Or:**
```powershell
node enrollAdminA_new.js
```

This will enroll AdminOrg1 and AdminOrg2 identities.

---

### **2. Restart Backend**

**In PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

---

### **3. Test Login**

Try logging in through the frontend. Should work now!

---

## What Changed

**Before:**
```bash
./network.sh up createChannel    # ❌ No CA servers
```

**After:**
```bash
./network.sh up createChannel -ca    # ✅ CA servers enabled
```

---

## Complete Command Sequence

### **In WSL:**
```bash
# Step 1: Stop network
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down

# Step 2: Start with CA
./network.sh up createChannel -ca

# Step 3: Deploy chaincode
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

### **In PowerShell:**
```powershell
# Step 1: Re-enroll admin identities
cd C:\CDMS_Blockchain\cdms-backend
node setup-test-admin.js

# Step 2: Restart backend
npm start
```

---

## Why This Happened

**The `-ca` flag is required** to start Fabric Certificate Authority servers:
- **Without `-ca`**: Only peers and orderer start (no CA servers)
- **With `-ca`**: CA servers start on ports 7054 (Org1) and 8054 (Org2)

**CA servers are needed for:**
- ✅ Enrolling admin identities
- ✅ Registering new users
- ✅ Approving user registrations
- ✅ Generating user certificates

**Without CA:**
- ❌ Can't enroll admin → Login fails
- ❌ Can't register users → Approval fails
- ❌ Can't generate certificates → Everything fails

---

## Troubleshooting

### **Error: "CA container exits immediately"**

**Check CA logs:**
```powershell
docker logs ca.org1.example.com --tail 50
```

**Common causes:**
- CA database locked (from previous run)
- Port already in use
- CA certificates corrupted

**Fix:**
```bash
# In WSL
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
# Wait a few seconds
./network.sh up createChannel -ca
```

---

### **Error: "Port 7054 already in use"**

**Check what's using the port:**
```powershell
netstat -ano | findstr :7054
```

**Kill the process:**
```powershell
# Replace PID with actual process ID from above
taskkill /PID <PID> /F
```

**Then restart network:**
```bash
# In WSL
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
```

---

## Summary

**The fix:**
1. ✅ Start network with `-ca` flag
2. ✅ Re-enroll admin identities
3. ✅ Restart backend
4. ✅ Test login

**Commands:**
```bash
# In WSL
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -ca
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

```powershell
# In PowerShell
cd C:\CDMS_Blockchain\cdms-backend
node setup-test-admin.js
npm start
```

