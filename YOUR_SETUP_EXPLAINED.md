# Your CDMS Setup Explained

## 📁 Your Current Directory Structure

```
C:\CDMS_Blockchain\
├── chaincode\                          ← YOUR CHAINCODE (✅ Correct!)
│   ├── index.js                        ← YOUR updated chaincode with roles
│   ├── package.json
│   └── node_modules\
│
├── fabric-samples\                     ← Fabric network tools
│   ├── test-network\                   ← Network scripts
│   │   ├── network.sh                  ← Start/stop network
│   │   └── ...
│   ├── asset-transfer-basic\           ← Just examples (NOT used)
│   │   └── chaincode-javascript\       ← Example only
│   │       └── lib\
│   │           └── cdmsContract.js     ← IGNORE THIS (example file)
│   └── ...
│
├── cdms-backend\                       ← Your Node.js backend
│   ├── api.js
│   ├── wallet\
│   └── ...
│
├── cdms-frontend\                      ← Your React frontend
│   └── ...
│
└── deploy-chaincode.sh                 ← Deploys YOUR chaincode
```

## ✅ Your Chaincode Location is CORRECT

Your `deploy-chaincode.sh` already points to the right place:

```bash
CHAINCODE_PATH="${PROJECT_ROOT}/chaincode"  # ✅ C:\CDMS_Blockchain\chaincode
```

**DO NOT** move your `index.js` to `fabric-samples\asset-transfer-basic\chaincode-javascript\lib\`!

The `cdmsContract.js` there is just an example file from Fabric samples. You're using your own chaincode in `C:\CDMS_Blockchain\chaincode\index.js`.

## 🔧 The Real Issue: CA Not Running

The error you're seeing is because the **Certificate Authority (CA) servers aren't running**. This is needed to enroll new users when you approve them.

### Why This Happens

When you deploy chaincode, the network starts with:
- ✅ Peers (to run chaincode)
- ✅ Orderers (to order transactions)
- ✅ Chaincode containers
- ❌ **CA servers** (needed for user enrollment)

### The Solution

Restart the network **with the `-ca` flag** to enable CA servers:

```powershell
# Run the updated script
.\restart-fabric-with-ca.ps1
```

This will:
1. Stop the network
2. Start it WITH CA enabled
3. Deploy YOUR chaincode from `C:\CDMS_Blockchain\chaincode\`

## 📋 Step-by-Step Fix

### 1. Run the Restart Script

```powershell
.\restart-fabric-with-ca.ps1
```

**What this does:**
- Stops current network
- Starts network with CA (`-ca` flag)
- Deploys YOUR chaincode v1.4 from `C:\CDMS_Blockchain\chaincode\`

### 2. Verify CA is Running

```powershell
docker ps --filter "name=ca"
```

Should show:
```
ca.org1.example.com - Up X minutes  ✅
ca.org2.example.com - Up X minutes  ✅
```

### 3. Restart Backend

```powershell
cd cdms-backend
npm start
```

### 4. Test User Approval

1. Login as admin: `example@gmail.com` / `pass`
2. Go to **Access Management**
3. Click **Approve** on "JohnWick"
4. Should work now! ✅

## 🎯 What Each Directory Does

### `chaincode\` (YOUR directory)
- **Purpose**: Your custom CDMS chaincode
- **File**: `index.js` with all your methods (CreateRecord, ReadRecord, GetAllHistory, etc.)
- **Used by**: The deployment script (`deploy-chaincode.sh`)
- **Status**: ✅ Correct location, don't move it!

### `fabric-samples\` (Hyperledger examples)
- **Purpose**: Official Fabric tools and examples
- **Contains**: Network scripts, example chaincodes, test network
- **The `asset-transfer-basic` folder**: Just examples, NOT used by your app
- **Status**: ✅ Only used for network setup tools

### `cdms-backend\` (Your backend)
- **Purpose**: Node.js API server
- **Connects to**: Fabric network using connection profiles
- **Uses**: Your deployed chaincode (from `chaincode\`)
- **Status**: ✅ All good

### `cdms-frontend\` (Your frontend)
- **Purpose**: React web interface
- **Connects to**: Your backend API
- **Status**: ✅ All good

## 🔍 How Deployment Works

When you run `deploy-chaincode.sh`:

1. **Script reads**: `C:\CDMS_Blockchain\chaincode\` (YOUR chaincode)
2. **Converts path to WSL**: `/mnt/c/CDMS_Blockchain/chaincode`
3. **Calls Fabric**: `network.sh deployCC -ccp /mnt/c/CDMS_Blockchain/chaincode`
4. **Fabric packages**: Your `index.js` and `package.json`
5. **Fabric installs**: On peer containers
6. **Creates**: Chaincode containers (`dev-peer0.org1...`)
7. **Your chaincode**: Now running on the blockchain! ✅

The `fabric-samples\asset-transfer-basic\chaincode-javascript\` is NEVER touched - it's just an example.

## ❓ FAQ

### Q: Should I copy my code to asset-transfer-basic?
**A: NO!** Your chaincode is in the right place (`C:\CDMS_Blockchain\chaincode\`).

### Q: Why does the example chaincode exist?
**A: It's just a reference** from Hyperledger Fabric's official examples. You don't need it.

### Q: Will the deployment work?
**A: YES!** Your deployment script already points to the right location.

### Q: What's the difference between my chaincode and the example?
**A: Everything!**
- **Example** (`cdmsContract.js`): Basic asset transfer demo
- **Your chaincode** (`index.js`): Full CDMS with roles, permissions, history, audit, etc.

### Q: Do I need to change any paths?
**A: NO!** Everything is already configured correctly.

## ✅ Summary

| Component | Location | Status | Action |
|-----------|----------|--------|--------|
| Your Chaincode | `C:\CDMS_Blockchain\chaincode\index.js` | ✅ Correct | **Keep it here!** |
| Fabric Samples | `C:\CDMS_Blockchain\fabric-samples\` | ✅ Tools only | Used for network scripts |
| Example Chaincode | `fabric-samples\asset-transfer-basic\` | ℹ️ Example | Ignore it |
| Deploy Script | `deploy-chaincode.sh` | ✅ Configured | Points to YOUR chaincode |
| Backend | `cdms-backend\` | ✅ Correct | Uses deployed chaincode |
| Frontend | `cdms-frontend\` | ✅ Correct | Connects to backend |

## 🚀 Next Steps

1. ✅ **Run**: `.\restart-fabric-with-ca.ps1`
2. ✅ **Wait**: 2-3 minutes for network to start
3. ✅ **Restart**: Backend with `npm start`
4. ✅ **Test**: Approve users in Access Management

**Your chaincode location is perfect - just restart the network with CA!** 🎉

