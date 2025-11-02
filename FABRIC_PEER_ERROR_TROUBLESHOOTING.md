# Fabric Peer Connection Error Troubleshooting

## Error: "No valid responses from any peers"

This error occurs when the backend tries to submit a transaction to Hyperledger Fabric but cannot connect to or get responses from the Fabric peer nodes.

### What Peers Expect:

When you call `contract.submitTransaction()`, the Fabric SDK:
1. **Connects to peers** specified in the connection profile
2. **Sends the transaction** to peers for endorsement
3. **Waits for endorsements** from enough peers (based on endorsement policy)
4. **Sends to orderer** if endorsements are successful
5. **Waits for commit** confirmation from peers

If any step fails, you get "No valid responses from any peers".

## Common Causes:

### 1. Fabric Network Not Running
**Check:**
```bash
# In WSL
docker ps | grep peer
# Should see peer0.org1.example.com and peer0.org2.example.com
```

**Fix:**
```bash
# Start Fabric network
cd ~/fabric-samples/test-network
./network.sh up createChannel -ca
./network.sh deployCC -ccn cdmscontract -ccp ../../../CDMS_Blockchain/chaincode -ccl javascript
```

### 2. Chaincode Not Installed/Committed
**Check:**
```bash
# In WSL
docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
```

**Should see:**
```
Chaincode: cdmscontract
Version: 1.4
```

**Fix:**
```bash
# Redeploy chaincode
cd ~/fabric-samples/test-network
./network.sh deployCC -ccn cdmscontract -ccp ../../../CDMS_Blockchain/chaincode -ccl javascript
```

### 3. Connection Profile Not Found or Wrong Path
**Check:**
```bash
# In Windows
cd C:\CDMS_Blockchain\cdms-backend
dir connection-org*.yaml
# Should see connection-org1.yaml and connection-org2.yaml
```

**Fix:**
```bash
# Copy connection profiles from fabric-samples
cp ~/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml C:/CDMS_Blockchain/cdms-backend/
cp ~/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.yaml C:/CDMS_Blockchain/cdms-backend/
```

### 4. Peers Not Accessible (Network/Firewall)
**Check:**
```bash
# Test if you can reach peers
wsl docker exec peer0.org1.example.com peer version
```

**Fix:**
- Check Docker Desktop is running
- Check WSL integration is enabled in Docker Desktop
- Ensure no firewall blocking Docker network

### 5. Wrong Wallet Identity
**Check:**
```bash
# In Windows
cd C:\CDMS_Blockchain\cdms-backend\wallet
dir
# Should see identity files matching userId being used
```

**Fix:**
```bash
# Re-enroll admin identities
cd C:\CDMS_Blockchain\cdms-backend
node setup-test-admin.js
```

### 6. Discovery Service Issues
**Check backend.js line 383:**
```javascript
discovery: { enabled: false, asLocalhost: true }
```

**Should be:** `enabled: false` and `asLocalhost: true` for local development

## Step-by-Step Diagnostic:

### Step 1: Verify Fabric is Running
```powershell
wsl docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "peer|orderer"
```

**Expected Output:**
```
NAMES                   STATUS
peer0.org1.example.com  Up 5 minutes
peer0.org2.example.com  Up 5 minutes
orderer.example.com     Up 5 minutes
```

### Step 2: Verify Chaincode is Committed
```powershell
wsl docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel
```

**Expected Output:**
```
Committed chaincode definition for chaincode 'cdmscontract' on channel 'mychannel':
Version: 1.4
Sequence: 1
Endorsement Plugin: escc
Validation Plugin: vscc
```

### Step 3: Test Connection Profile
```powershell
# In WSL
cd ~/fabric-samples/test-network
cat organizations/peerOrganizations/org1.example.com/connection-org1.yaml | head -20
```

### Step 4: Check Backend Connection Profile Path
Look at `cdms-backend/backend.js` around line 340:
```javascript
if (org === 'A' || org === 'Org1') {
    ccpPath = path.resolve(__dirname, 'connection-org1.yaml');
} else {
    ccpPath = path.resolve(__dirname, 'connection-org2.yaml');
}
```

Verify these files exist:
```powershell
cd C:\CDMS_Blockchain\cdms-backend
Test-Path connection-org1.yaml
Test-Path connection-org2.yaml
```

### Step 5: Test Direct Connection
```powershell
cd C:\CDMS_Blockchain\cdms-backend
node test-direct-login.js
```

This will test if backend can connect to Fabric.

## Quick Fix Commands:

### Option 1: Restart Fabric Network
```powershell
# In PowerShell
wsl bash -c "cd ~/fabric-samples/test-network && ./network.sh down && ./network.sh up createChannel -ca && ./network.sh deployCC -ccn cdmscontract -ccp ../../../CDMS_Blockchain/chaincode -ccl javascript"
```

### Option 2: Restart with CA and Redeploy Chaincode
```powershell
# Use the restart script
.\restart-fabric-with-ca.ps1
```

### Option 3: Verify Connection Profiles
```powershell
# Copy connection profiles if missing
wsl bash -c "cp ~/fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.yaml /mnt/c/CDMS_Blockchain/cdms-backend/"
wsl bash -c "cp ~/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.yaml /mnt/c/CDMS_Blockchain/cdms-backend/"
```

## Expected Flow When Upload Works:

1. ✅ **Backend connects** to peer using connection profile
2. ✅ **Peer receives** CreateRecord transaction
3. ✅ **Peer endorses** transaction (simulates chaincode execution)
4. ✅ **Transaction sent** to orderer
5. ✅ **Orderer creates** block with transaction
6. ✅ **Peers commit** block to ledger
7. ✅ **Backend receives** success response

## Debug Logging:

Add this to `backend.js` `getContract()` method before `gateway.connect()`:
```javascript
console.log('[FABRIC DEBUG] Connecting with:');
console.log('  - userId:', userId);
console.log('  - org:', org);
console.log('  - ccpPath:', ccpPath);
console.log('  - channel:', this.channelName);
console.log('  - contract:', this.contractName);
```

Then check backend logs when you try to upload to see what's happening.

## Most Likely Issue:

Based on the error, the **Fabric network is probably not running** or **chaincode is not deployed**. 

**Quick check:**
```powershell
wsl docker ps | findstr peer
```

If no peers are listed, start the network:
```powershell
wsl bash -c "cd ~/fabric-samples/test-network && ./network.sh up createChannel -ca"
```

Then deploy chaincode:
```powershell
wsl bash -c "cd ~/fabric-samples/test-network && ./network.sh deployCC -ccn cdmscontract -ccp ../../../CDMS_Blockchain/chaincode -ccl javascript"
```

