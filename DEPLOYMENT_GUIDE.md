# CDMS Blockchain - Complete Deployment Guide

## Overview

This guide will walk you through deploying the CDMS (Crime Data Management System) blockchain application from start to finish.

## Prerequisites

- ✅ Windows 10/11 with WSL2 installed
- ✅ Docker Desktop running with WSL2 integration
- ✅ Node.js 18+ installed (both Windows and WSL)
- ✅ HashiCorp Vault running (for encryption)

## Current Status

### ✅ Completed Fixes
1. **Backend Gateway Configuration**: Fixed `asLocalhost` setting for local development
2. **Storage Initialization**: Added proper storage object initialization  
3. **Chaincode Implementation**: Created complete CDMS chaincode
4. **Test Admin Setup**: Created helper script for test admin user
5. **Deployment Scripts**: Created automated deployment scripts

### ⚠️ Required Action
**Deploy the chaincode to Fabric network** (one-time setup)

## Quick Start (3 Steps)

### Step 1: Deploy Chaincode

#### Option A: Using PowerShell (Recommended)
```powershell
# From project root in PowerShell
.\deploy-chaincode.ps1
```

#### Option B: Using WSL Directly
```bash
# From WSL/Ubuntu terminal
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

### Step 2: Start Backend Server
```powershell
# Stop any running backend first
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Start fresh
cd cdms-backend
npm start
```

### Step 3: Test Login

#### Option A: Via Test Script
```powershell
# In new PowerShell window
cd cdms-backend
node setup-test-admin.js  # Creates test admin (run once)
node test-login-final.js  # Tests login
```

#### Option B: Via Frontend
1. Open browser: http://localhost:5173
2. Login with:
   - **Email**: `admin@cdms.local`
   - **Password**: `Admin@123`
   - **Organization**: `A`

## Detailed Deployment Steps

### 1. Verify Fabric Network

```powershell
# Check Docker containers are running
docker ps

# Should see:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
```

If containers are not running:
```bash
# In WSL
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel
```

### 2. Install Chaincode Dependencies

```powershell
cd chaincode
npm install
cd ..
```

### 3. Deploy Chaincode

See Quick Start Step 1 above.

**Expected Output:**
```
✓ Dependencies installed
✓ Environment configured
✓ Package installed on peer0.org1
✓ Package installed on peer0.org2
✓ Chaincode approved on Org1
✓ Chaincode approved on Org2
✓ Chaincode committed on channel
✓ Chaincode initialization
====================================
  ✅ Chaincode Deployed Successfully!
====================================
```

### 4. Verify Deployment

```bash
# In WSL
cd fabric-samples/test-network
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
```

You should see:
```
Name: cdmscontract, Version: 1.0, Sequence: 1
```

### 5. Start Backend

```powershell
cd cdms-backend

# Make sure VAULT_TOKEN is set
$env:VAULT_TOKEN="root"

npm start
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════╗
║   CDMS API Server                                 ║
║   Port: 3000                                      ║
║   Vault: http://127.0.0.1:8200         ║
╚═══════════════════════════════════════════════════╝

✓ Vault is initialized, unsealed, and active
✓ Vault transit engine enabled at cdms-kms
✓ Master KEK created in Vault
✓ Auto-rotation policy set (90 days)
```

### 6. Create Test Admin

```powershell
# In new PowerShell window
cd cdms-backend
node setup-test-admin.js
```

**Output:**
```
Test Admin Credentials:
========================
Email:    admin@cdms.local
Password: Admin@123
Role:     admin
Org:      A
========================
```

### 7. Test Login

```powershell
node test-login-final.js
```

**Expected Success Output:**
```
════════════════════════════════════════════
✅ LOGIN SUCCESSFUL!
════════════════════════════════════════════

User Information:
{
  "username": "adminA",
  "email": "admin@cdms.local",
  "role": "admin",
  "org": "A",
  "walletId": "AdminOrg1"
}
```

## Testing Checklist

After deployment, verify:

- [ ] Chaincode deployed successfully
- [ ] Backend started without errors
- [ ] Vault is running and connected
- [ ] Test admin created
- [ ] Login via test script works
- [ ] Login via frontend works
- [ ] Can upload records (optional advanced test)

## Troubleshooting

### Issue: "Failed to authorize invocation"
**Cause**: Chaincode not deployed
**Solution**: Run `./deploy-chaincode.ps1`

### Issue: "Connection profile not found"
**Cause**: Fabric network not running
**Solution**:
```bash
# In WSL
cd fabric-samples/test-network
./network.sh up createChannel
```

### Issue: "DiscoveryService: mychannel error: access denied"
**Cause**: Backend not restarted after code fix
**Solution**: 
```powershell
Get-Process -Name node | Stop-Process -Force
cd cdms-backend
npm start
```

### Issue: "Vault token is required"
**Cause**: VAULT_TOKEN environment variable not set
**Solution**:
```powershell
$env:VAULT_TOKEN="root"
npm start
```

### Issue: "Invalid password"
**Cause**: Using wrong test credentials
**Solution**: Use the test admin credentials:
- Email: `admin@cdms.local`
- Password: `Admin@123`

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │  React (Vite)
│  localhost:5173 │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
┌────────▼────────┐ ┌─────▼──────────┐
│   Backend API   │ │  Vault (KMS)   │
│  localhost:3000 │ │ localhost:8200 │
└────────┬────────┘ └────────────────┘
         │
┌────────▼───────────────────────┐
│   Hyperledger Fabric Network   │
│   - peer0.org1.example.com     │
│   - peer0.org2.example.com     │
│   - orderer.example.com        │
│   - Chaincode: cdmscontract    │
└────────────────────────────────┘
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /register` - User registration request
- `POST /approve-registration` - Admin approval

### Records
- `POST /record/upload` - Upload encrypted record
- `GET /record/:id/download` - Download record
- `GET /record/:id/metadata` - Get record metadata
- `GET /records/case/:caseId` - List records by case
- `GET /records` - List all records

### Policies
- `POST /policy` - Create access policy
- `GET /policy/:id` - Get policy

### Audit
- `POST /audit` - Add audit entry

### Health
- `GET /health` - API health check
- `GET /vault/status` - Vault status

## Next Steps After Deployment

1. **Create Additional Users**
   - Register through frontend
   - Admin approves via `/approve-registration`

2. **Upload Test Records**
   - Use the upload feature in frontend
   - Verify encryption/decryption works

3. **Test Access Control**
   - Create policies
   - Test cross-organization access

4. **Monitor Audit Trail**
   - Check blockchain for audit records
   - Verify immutability

## Support

For issues or questions:
1. Check `CRITICAL_FIX_SUMMARY.md` for detailed fix information
2. Review terminal output for specific error messages
3. Verify all prerequisites are met
4. Check Docker and Vault are running

## Summary

**Status**: ✅ Code fixes complete, chaincode ready
**Action Required**: Deploy chaincode (one command)
**Time Required**: 5-10 minutes for deployment
**Result**: Fully functional blockchain-based CDMS

