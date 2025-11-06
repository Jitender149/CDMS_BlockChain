# CDMS Project - Complete Startup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Docker Setup with WSL Integration](#docker-setup-with-wsl-integration)
3. [Starting Hyperledger Fabric Network](#starting-hyperledger-fabric-network)
4. [Certificate Generation and Configuration](#certificate-generation-and-configuration)
5. [Admin Enrollment](#admin-enrollment)
6. [Chaincode Deployment](#chaincode-deployment)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Vault Setup (Optional)](#vault-setup-optional)
10. [MinIO Setup](#minio-setup)
11. [Verification and Testing](#verification-and-testing)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Docker Desktop**
   - Download from: https://www.docker.com/products/docker-desktop
   - Version: Latest stable
   - **Important**: Enable WSL 2 integration in Docker Desktop settings

2. **WSL 2 (Windows Subsystem for Linux)**
   - Install Ubuntu from Microsoft Store
   - Version: Ubuntu 20.04 or later

3. **Node.js**
   - Version: 14.0.0 or higher
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

4. **Git**
   - Download from: https://git-scm.com/
   - Verify: `git --version`

### Verify Prerequisites

**PowerShell:**
```powershell
# Check Docker
docker --version

# Check Node.js
node --version
npm --version

# Check Git
git --version
```

**WSL (Ubuntu):**
```bash
# Check WSL
wsl --version

# Check Docker in WSL
docker --version
```

---

## Docker Setup with WSL Integration

### Step 1: Enable WSL Integration in Docker Desktop

1. **Open Docker Desktop**
2. **Go to Settings** (gear icon)
3. **Navigate to Resources → WSL Integration**
4. **Enable integration with your default WSL distro** (Ubuntu)
5. **Click "Apply & Restart"**

### Step 2: Verify Docker WSL Integration

**PowerShell:**
```powershell
# Check Docker is running
docker ps

# Should show running containers (if any) or empty list
```

**WSL (Ubuntu):**
```bash
# Test Docker in WSL
docker ps

# Should work without errors
```

### Step 3: Verify Docker Can Access Project Files

**WSL (Ubuntu):**
```bash
# Navigate to project (Windows files are in /mnt/c/)
cd /mnt/c/CDMS_Blockchain

# Verify you can access files
ls -la
```

---

## Starting Hyperledger Fabric Network

### Step 1: Navigate to Test Network

**WSL (Ubuntu):**
```bash
# Navigate to Fabric test network
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Verify network.sh exists
ls -la network.sh
```

### Step 2: Start Fabric Network with CA

**WSL (Ubuntu):**
```bash
# Start network with Certificate Authority (CA) enabled
# The -ca flag is CRITICAL for user enrollment
./network.sh up createChannel -ca
```

**What this does:**
- Starts Docker containers for:
  - `orderer.example.com` (Orderer service)
  - `peer0.org1.example.com` (Org1 peer)
  - `peer0.org2.example.com` (Org2 peer)
  - `ca.org1.example.com` (Org1 Certificate Authority)
  - `ca.org2.example.com` (Org2 Certificate Authority)
- Creates channel: `mychannel`
- Generates certificates and connection profiles

**Expected Output:**
```
Creating network "net_test" ... done
Creating ca_org2    ... done
Creating ca_org1    ... done
Creating orderer.example.com    ... done
Creating peer0.org2.example.com ... done
Creating peer0.org1.example.com ... done
Creating cli ... done
...
Channel 'mychannel' created
```

### Step 3: Verify Containers are Running

**PowerShell:**
```powershell
# Check all Fabric containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Should show:**
```
NAMES                        STATUS         PORTS
orderer.example.com          Up X minutes   0.0.0.0:7050->7050/tcp
peer0.org1.example.com       Up X minutes   0.0.0.0:7051->7051/tcp
peer0.org2.example.com       Up X minutes   0.0.0.0:9051->9051/tcp
ca.org1.example.com          Up X minutes   0.0.0.0:7054->7054/tcp
ca.org2.example.com          Up X minutes   0.0.0.0:8054->8054/tcp
```

**If containers are not running:**
```powershell
# Check Docker Desktop is running
# Restart Docker Desktop if needed
```

---

## Certificate Generation and Configuration

### Step 1: Generate Orderer TLS Certificate

**PowerShell:**
```powershell
# Get orderer TLS certificate
docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt
```

**Expected Output:**
```
-----BEGIN CERTIFICATE-----
MIICCzCCAbGgAwIBAgIUDQClq9B+jtAaOo7NqAtQ14TGwtcwCgYIKoZIzj0EAwIw
YjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg
WW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu
Y29tMB4XDTI1MTEwNTEwMTIwMFoXDTQwMTEwMTEwMTIwMFowYjELMAkGA1UEBhMC
VVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UE
ChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUuY29tMFkwEwYHKoZI
zj0CAQYIKoZIzj0DAQcDQgAEYzYIvSF8lqU7tbsJm6Gb3xqz4Ct5NiO+aAW5JtDl
rJJ7QJDgGVkZaIjTGHfA5eu/IHk8D3ZNFOQsHskPOn3GIaNFMEMwDgYDVR0PAQH/
BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFIpLEpVStHMFJ/l/
VLW0ic7g8EmAMAoGCCqGSM49BAMCA0gAMEUCIQC5h+5lES7DeFddHDH96nkY4maU
j20Z6699TCO8lwm7tQIgEY/VhakTozSeKjOkZh73cMUVzs5fEw5fR4qoO9NdYJk=
-----END CERTIFICATE-----
```

### Step 2: Copy Orderer Certificate

**Important**: Copy the **ENTIRE** certificate including:
- `-----BEGIN CERTIFICATE-----`
- All the base64 encoded content
- `-----END CERTIFICATE-----`

### Step 3: Update Connection Profile

**Location**: 
```
fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
```

**Find the `orderers` section:**
```json
"orderers": {
  "orderer.example.com": {
    "url": "grpcs://localhost:7050",
    "tlsCACerts": {
      "pem": "-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----"
    }
  }
}
```

**Replace the `pem` field** with the certificate you copied:

```json
"orderers": {
  "orderer.example.com": {
    "url": "grpcs://localhost:7050",
    "tlsCACerts": {
      "pem": "-----BEGIN CERTIFICATE-----\nMIICCzCCAbGgAwIBAgIUDQClq9B+jtAaOo7NqAtQ14TGwtcwCgYIKoZIzj0EAwIw\nYjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg\nWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMB4XDTI1MTEwNTEwMTIwMFoXDTQwMTEwMTEwMTIwMFowYjELMAkGA1UEBhMC\nVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYzYIvSF8lqU7tbsJm6Gb3xqz4Ct5NiO+aAW5JtDl\nrJJ7QJDgGVkZaIjTGHfA5eu/IHk8D3ZNFOQsHskPOn3GIaNFMEMwDgYDVR0PAQH/\nBAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFIpLEpVStHMFJ/l/\nVLW0ic7g8EmAMAoGCCqGSM49BAMCA0gAMEUCIQC5h+5lES7DeFddHDH96nkY4maU\nj20Z6699TCO8lwm7tQIgEY/VhakTozSeKjOkZh73cMUVzs5fEw5fR4qoO9NdYJk=\n-----END CERTIFICATE-----"
    },
    "grpcOptions": {
      "ssl-target-name-override": "orderer.example.com",
      "hostnameOverride": "orderer.example.com"
    }
  }
}
```

**Important Notes:**
- Replace `\n` with actual newlines OR keep as `\n` (both work in JSON)
- Ensure the certificate starts with `-----BEGIN CERTIFICATE-----`
- Ensure the certificate ends with `-----END CERTIFICATE-----`
- No extra spaces or characters

### Step 4: Verify Connection Profile

**PowerShell:**
```powershell
# Navigate to connection profile location
cd C:\CDMS_Blockchain\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com

# Open connection-org1.json in a text editor
notepad connection-org1.json
```

**Verify:**
- `orderers.orderer.example.com.tlsCACerts.pem` contains the certificate
- Certificate is properly formatted (BEGIN/END markers)
- JSON syntax is valid (no trailing commas)

### Step 5: Repeat for Org2 (Optional)

**For Org2 connection profile:**
```
fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json
```

**Get orderer certificate (same as above):**
```powershell
docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt
```

**Update `connection-org2.json`** with the same certificate in the `orderers` section.

---

## Admin Enrollment

### Step 1: Navigate to Backend Directory

**PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
```

### Step 2: Install Backend Dependencies

**PowerShell:**
```powershell
npm install
```

**Expected Output:**
```
added 234 packages, and audited 235 packages in 45s
```

### Step 3: Enroll Admin for Org1

**PowerShell:**
```powershell
node enrollAdminA.js
```

**Expected Output:**
```
✅ Successfully enrolled admin user "AdminOrg1" and imported it into the wallet
```

**What this does:**
- Connects to Fabric CA (ca.org1.example.com)
- Enrolls admin user (ID: 'admin', Secret: 'adminpw')
- Gets X.509 certificate and private key
- Stores in wallet as 'AdminOrg1'

### Step 4: Enroll Admin for Org2

**PowerShell:**
```powershell
node enrollAdminB.js
```

**Expected Output:**
```
✅ Successfully enrolled admin user "AdminOrg2" and imported it into the wallet
```

### Step 5: Verify Wallet Identities

**PowerShell:**
```powershell
node list-wallet-identities.js
```

**Expected Output:**
```
📋 Wallet Identities:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Found 2 identity(ies):

   ✅ AdminOrg1
      MSP ID: Org1MSP
      Type: X.509

   ✅ AdminOrg2
      MSP ID: Org2MSP
      Type: X.509
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 6: Add Org2 Admin to Approved Users

**PowerShell:**
```powershell
node add-org2-admin.js
```

**Expected Output:**
```
Adding Org2 admin user...

Org2 Admin Credentials:
========================
Email:    example2@gmail.com
Password: pass
Username: admin2
Role:     admin
Org:      B (Org2)
WalletId: AdminOrg2
========================

✅ Password hashed successfully
✅ Org2 admin added to approved_users.json
```

---

## Chaincode Deployment

### Step 1: Navigate to Project Root

**WSL (Ubuntu):**
```bash
cd /mnt/c/CDMS_Blockchain
```

### Step 2: Install Chaincode Dependencies

**WSL (Ubuntu):**
```bash
cd chaincode
npm install
cd ..
```

**Expected Output:**
```
added 15 packages, and audited 16 packages in 5s
```

### Step 3: Deploy Chaincode

**WSL (Ubuntu):**
```bash
bash deploy-chaincode.sh
```

**What this does:**
- Installs chaincode dependencies
- Sets up environment variables
- Deploys chaincode to Fabric network
- Uses default multi-org endorsement policy: `AND('Org1MSP.member', 'Org2MSP.member')`

**Expected Output:**
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
Chaincode will be deployed from: /mnt/c/CDMS_Blockchain/chaincode
Endorsement Policy: Default (AND('Org1MSP.member', 'Org2MSP.member')) - requires both orgs
This may take a few minutes...

[Chaincode deployment output...]

======================================
  ✅ Chaincode Deployed Successfully!
======================================

Chaincode Details:
  Name:     cdmscontract
  Version:  1.7
  Channel:  mychannel
  Language: javascript
```

**This may take 2-5 minutes** - be patient!

### Step 4: Verify Chaincode Deployment

**PowerShell:**
```powershell
# Check chaincode containers
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "dev-peer"
```

**Should show:**
```
NAMES                          STATUS
dev-peer0.org1.example.com...  Up X minutes
dev-peer0.org2.example.com...  Up X minutes
```

---

## Backend Setup

### Step 1: Navigate to Backend Directory

**PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
```

### Step 2: Create Environment File

**PowerShell:**
```powershell
# Copy example env file (if exists)
# Or create .env file manually
```

**Create `.env` file:**
```env
# Vault Configuration (Optional - for encryption)
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=your-vault-token-here

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cdms-evidence
MINIO_USE_SSL=false

# Backend Configuration
PORT=3000
NODE_ENV=development
```

### Step 3: Verify Backend Configuration

**PowerShell:**
```powershell
# Check if connection profile exists
Test-Path "..\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json"

# Should return: True
```

### Step 4: Start Backend Server

**PowerShell:**
```powershell
npm start
```

**Expected Output:**
```
Server running on http://localhost:3000
✅ Connected to Fabric network as AdminOrg1 from Org1
```

**If using nodemon (auto-restart):**
```powershell
npm run dev
```

### Step 5: Verify Backend is Running

**Open browser or use PowerShell:**
```powershell
# Test backend health
curl http://localhost:3000

# Or open in browser
# http://localhost:3000
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory

**PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-frontend
```

### Step 2: Install Frontend Dependencies

**PowerShell:**
```powershell
npm install
```

**Expected Output:**
```
added 156 packages, and audited 157 packages in 30s
```

### Step 3: Create Environment File (Optional)

**Create `.env` file in `cdms-frontend` directory:**
```env
VITE_APP_API_URL=http://localhost:3000
```

**Note**: If not created, frontend will default to `http://localhost:3000`

### Step 4: Start Frontend Development Server

**PowerShell:**
```powershell
npm run dev
```

**Expected Output:**
```
  VITE v7.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 5: Access Frontend

**Open browser:**
```
http://localhost:5173
```

**You should see the CDMS login page.**

---

## Vault Setup (Optional)

### Step 1: Start Vault Server

**PowerShell:**
```powershell
# Download Vault if not installed
# Or use Docker to run Vault

# Using Docker:
docker run -d --name vault -p 8200:8200 --cap-add=IPC_LOCK vault server -dev
```

### Step 2: Initialize Vault (First Time Only)

**PowerShell:**
```powershell
# Get Vault root token from Docker logs
docker logs vault

# Look for: "Root Token: <token>"
```

### Step 3: Set Vault Token in Backend

**Update `cdms-backend/.env`:**
```env
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=<your-root-token>
```

### Step 4: Initialize Vault Transit Engine

**PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
node -e "const backend = require('./backend'); const b = new backend.CDMSBackend(); b.initVaultTransit().then(() => console.log('Vault initialized')).catch(console.error)"
```

**Note**: Vault is optional - the system works without it (files won't be encrypted).

---

## MinIO Setup

### Step 1: Start MinIO Server

**PowerShell:**
```powershell
# Using Docker:
docker run -d --name minio -p 9000:9000 -p 9001:9001 `
  -e "MINIO_ROOT_USER=minioadmin" `
  -e "MINIO_ROOT_PASSWORD=minioadmin" `
  minio/minio server /data --console-address ":9001"
```

### Step 2: Verify MinIO is Running

**PowerShell:**
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "minio"
```

**Should show:**
```
NAMES    STATUS
minio    Up X minutes
```

### Step 3: Access MinIO Console (Optional)

**Open browser:**
```
http://localhost:9001
```

**Login:**
- Username: `minioadmin`
- Password: `minioadmin`

**Note**: MinIO will automatically create the `cdms-evidence` bucket when first file is uploaded.

---

## Verification and Testing

### Step 1: Verify All Services are Running

**PowerShell:**
```powershell
# Check all Docker containers
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Should show:**
- `orderer.example.com` - Running
- `peer0.org1.example.com` - Running
- `peer0.org2.example.com` - Running
- `ca.org1.example.com` - Running
- `ca.org2.example.com` - Running
- `dev-peer0.org1.example.com-*` - Running (chaincode)
- `dev-peer0.org2.example.com-*` - Running (chaincode)
- `minio` - Running (if using MinIO)
- `vault` - Running (if using Vault)

### Step 2: Test Backend Connection

**PowerShell:**
```powershell
# Test backend health
curl http://localhost:3000

# Or test login endpoint
curl -X POST http://localhost:3000/login `
  -H "Content-Type: application/json" `
  -d '{"email":"example@gmail.com","password":"pass","org":"A"}'
```

### Step 3: Test Frontend

1. **Open browser**: `http://localhost:5173`
2. **Login with admin credentials**:
   - Email: `example@gmail.com`
   - Password: `pass`
   - Organization: `A`
3. **Verify dashboard loads**

### Step 4: Test Blockchain Connection

**PowerShell:**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
node verifySetup.js
```

**Expected Output:**
```
✅ Wallet identities found
✅ Connection profile exists
✅ Backend setup verified
```

---

## Complete Startup Sequence (Quick Reference)

### Full Startup (First Time)

**1. Start Fabric Network (WSL):**
```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh up createChannel -ca
```

**2. Get Orderer Certificate (PowerShell):**
```powershell
docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt
# Copy the certificate
```

**3. Update Connection Profile (PowerShell):**
- Open: `fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json`
- Replace `orderers.orderer.example.com.tlsCACerts.pem` with certificate

**4. Enroll Admins (PowerShell):**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm install
node enrollAdminA.js
node enrollAdminB.js
node add-org2-admin.js
```

**5. Deploy Chaincode (WSL):**
```bash
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**6. Start Backend (PowerShell):**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

**7. Start Frontend (PowerShell - New Terminal):**
```powershell
cd C:\CDMS_Blockchain\cdms-frontend
npm install
npm run dev
```

**8. Start MinIO (PowerShell - Optional):**
```powershell
docker run -d --name minio -p 9000:9000 -p 9001:9001 `
  -e "MINIO_ROOT_USER=minioadmin" `
  -e "MINIO_ROOT_PASSWORD=minioadmin" `
  minio/minio server /data --console-address ":9001"
```

### Daily Startup (After Initial Setup)

**1. Start Fabric Network (WSL):**
```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh up createChannel -ca
```

**2. Deploy Chaincode (WSL - if needed):**
```bash
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

**3. Start Backend (PowerShell):**
```powershell
cd C:\CDMS_Blockchain\cdms-backend
npm start
```

**4. Start Frontend (PowerShell - New Terminal):**
```powershell
cd C:\CDMS_Blockchain\cdms-frontend
npm run dev
```

---

## Troubleshooting

### Issue 1: Docker Containers Not Starting

**Symptoms:**
- `docker ps` shows no containers
- Network startup fails

**Solution:**
```powershell
# Check Docker Desktop is running
# Restart Docker Desktop
# Verify WSL integration is enabled
```

### Issue 2: Certificate Not Found

**Symptoms:**
- `connection-org1.json` has empty or invalid certificate
- Backend can't connect to Fabric

**Solution:**
```powershell
# Regenerate certificate
docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt

# Copy ENTIRE certificate including BEGIN/END markers
# Paste into connection-org1.json
```

### Issue 3: Admin Enrollment Fails

**Symptoms:**
- `enrollAdminA.js` fails with connection error
- CA not responding

**Solution:**
```powershell
# Verify CA container is running
docker ps | Select-String "ca"

# Restart network with CA
cd C:\CDMS_Blockchain\fabric-samples\test-network
wsl bash -c "./network.sh down"
wsl bash -c "./network.sh up createChannel -ca"
```

### Issue 4: Chaincode Deployment Fails

**Symptoms:**
- `deploy-chaincode.sh` fails
- Chaincode containers not created

**Solution:**
```bash
# Check network is up
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
./network.sh up createChannel -ca

# Check chaincode dependencies
cd /mnt/c/CDMS_Blockchain/chaincode
npm install

# Try deployment again
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

### Issue 5: Backend Can't Connect to Fabric

**Symptoms:**
- Backend logs show "Identity not found" or "Connection failed"

**Solution:**
```powershell
# Verify wallet has identities
cd C:\CDMS_Blockchain\cdms-backend
node list-wallet-identities.js

# Re-enroll if needed
node enrollAdminA.js
node enrollAdminB.js

# Verify connection profile exists
Test-Path "..\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json"
```

### Issue 6: Frontend Can't Connect to Backend

**Symptoms:**
- Frontend shows connection errors
- API calls fail

**Solution:**
```powershell
# Verify backend is running
curl http://localhost:3000

# Check backend logs for errors
# Verify CORS is enabled in backend
# Check .env file has correct API URL
```

---

## Certificate Format Reference

### Complete Certificate Format

A valid certificate should look like this:

```
-----BEGIN CERTIFICATE-----
MIICCzCCAbGgAwIBAgIUDQClq9B+jtAaOo7NqAtQ14TGwtcwCgYIKoZIzj0EAwIw
YjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg
WW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu
Y29tMB4XDTI1MTEwNTEwMTIwMFoXDTQwMTEwMTEwMTIwMFowYjELMAkGA1UEBhMC
VVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu
Y29tMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYzYIvSF8lqU7tbsJm6Gb3xqz4Ct5NiO+aAW5JtDl
rJJ7QJDgGVkZaIjTGHfA5eu/IHk8D3ZNFOQsHskPOn3GIaNFMEMwDgYDVR0PAQH/
BAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFIpLEpVStHMFJ/l/
VLW0ic7g8EmAMAoGCCqGSM49BAMCA0gAMEUCIQC5h+5lES7DeFddHDH96nkY4maU
j20Z6699TCO8lwm7tQIgEY/VhakTozSeKjOkZh73cMUVzs5fEw5fR4qoO9NdYJk=
-----END CERTIFICATE-----
```

**Key Points:**
- Starts with `-----BEGIN CERTIFICATE-----`
- Contains base64 encoded content (multiple lines)
- Ends with `-----END CERTIFICATE-----`
- In JSON, use `\n` for newlines OR actual newlines (both work)

### Where to Paste Certificate

**File Location:**
```
fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
```

**Section:**
```json
{
  "orderers": {
    "orderer.example.com": {
      "url": "grpcs://localhost:7050",
      "tlsCACerts": {
        "pem": "PASTE_CERTIFICATE_HERE"
      }
    }
  }
}
```

**Format in JSON:**
```json
"pem": "-----BEGIN CERTIFICATE-----\nMIICCzCCAbGgAwIBAgIUDQClq9B+jtAaOo7NqAtQ14TGwtcwCgYIKoZIzj0EAwIw\nYjELMAkGA1UEBhMCVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcg\nWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMB4XDTI1MTEwNTEwMTIwMFoXDTQwMTEwMTEwMTIwMFowYjELMAkGA1UEBhMC\nVVMxETAPBgNVBAgTCE5ldyBZb3JrMREwDwYDVQQHEwhOZXcgWW9yazEUMBIGA1UEChMLZXhhbXBsZS5jb20xFzAVBgNVBAMTDmNhLmV4YW1wbGUu\nY29tMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEYzYIvSF8lqU7tbsJm6Gb3xqz4Ct5NiO+aAW5JtDl\nrJJ7QJDgGVkZaIjTGHfA5eu/IHk8D3ZNFOQsHskPOn3GIaNFMEMwDgYDVR0PAQH/\nBAQDAgEGMBIGA1UdEwEB/wQIMAYBAf8CAQEwHQYDVR0OBBYEFIpLEpVStHMFJ/l/\nVLW0ic7g8EmAMAoGCCqGSM49BAMCA0gAMEUCIQC5h+5lES7DeFddHDH96nkY4maU\nj20Z6699TCO8lwm7tQIgEY/VhakTozSeKjOkZh73cMUVzs5fEw5fR4qoO9NdYJk=\n-----END CERTIFICATE-----"
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Backend API | 3000 | http://localhost:3000 |
| Frontend | 5173 | http://localhost:5173 |
| Orderer | 7050 | grpcs://localhost:7050 |
| Peer Org1 | 7051 | grpcs://localhost:7051 |
| Peer Org2 | 9051 | grpcs://localhost:9051 |
| CA Org1 | 7054 | https://localhost:7054 |
| CA Org2 | 8054 | https://localhost:8054 |
| MinIO API | 9000 | http://localhost:9000 |
| MinIO Console | 9001 | http://localhost:9001 |
| Vault | 8200 | http://localhost:8200 |

---

## Quick Commands Reference

### Docker Commands

```powershell
# Check containers
docker ps

# Stop all containers
docker stop $(docker ps -q)

# View logs
docker logs orderer.example.com
docker logs peer0.org1.example.com
docker logs ca.org1.example.com

# Restart specific container
docker restart orderer.example.com
```

### WSL Commands

```bash
# Navigate to project
cd /mnt/c/CDMS_Blockchain

# Start network
cd fabric-samples/test-network
./network.sh up createChannel -ca

# Stop network
./network.sh down

# Deploy chaincode
cd /mnt/c/CDMS_Blockchain
bash deploy-chaincode.sh
```

### Backend Commands

```powershell
# Install dependencies
cd cdms-backend
npm install

# Enroll admins
node enrollAdminA.js
node enrollAdminB.js

# List wallet identities
node list-wallet-identities.js

# Start backend
npm start
```

### Frontend Commands

```powershell
# Install dependencies
cd cdms-frontend
npm install

# Start frontend
npm run dev

# Build for production
npm run build
```

---

## Summary Checklist

### Initial Setup (One Time)
- [ ] Install Docker Desktop with WSL integration
- [ ] Install Node.js and npm
- [ ] Install WSL 2 (Ubuntu)
- [ ] Clone/download project
- [ ] Start Fabric network with CA
- [ ] Get orderer certificate
- [ ] Update connection-org1.json with certificate
- [ ] Install backend dependencies
- [ ] Enroll AdminOrg1 and AdminOrg2
- [ ] Add Org2 admin to approved_users.json
- [ ] Deploy chaincode
- [ ] Install frontend dependencies
- [ ] Start MinIO (optional)
- [ ] Start Vault (optional)

### Daily Startup
- [ ] Start Fabric network (WSL)
- [ ] Start backend (PowerShell)
- [ ] Start frontend (PowerShell)
- [ ] Verify all services running

### Testing
- [ ] Login to frontend
- [ ] Upload a file
- [ ] View records
- [ ] Check block history
- [ ] Verify blockchain connection

---

## Next Steps After Startup

1. **Login to Frontend**:
   - Email: `example@gmail.com`
   - Password: `pass`
   - Organization: `A`

2. **Test Features**:
   - Upload a file
   - View records
   - Check audit trail
   - View block history

3. **Register New Users**:
   - Go to Registration page
   - Register as district police, investigator, etc.
   - Admin approves in Access Management

4. **Monitor Blockchain**:
   - Check block history page
   - Verify transactions are being added
   - Monitor system events

---

This guide provides complete instructions for starting the CDMS project from scratch. Follow each section in order for first-time setup, or use the "Daily Startup" section for regular use.

