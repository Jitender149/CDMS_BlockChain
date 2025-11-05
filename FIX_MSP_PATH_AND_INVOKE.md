# Fix: MSP Path Error and Invoke with Both Orgs

## Problem

**Error:** `Cannot run peer because cannot init crypto, specified path "/mnt/c/CDMS_Blockchain/fabric-samples/config/msp" does not exist`

**Cause:** The peer CLI is looking for MSP in the config directory, but MSP certificates are in the organization's MSP directory.

---

## Solution

### **Option 1: Use the Provided Script** (Easiest)

**In WSL:**
```bash
cd /mnt/c/CDMS_Blockchain
bash invoke-with-both-orgs.sh
```

This script:
1. ✅ Sets up environment correctly
2. ✅ Uses correct MSP paths
3. ✅ Invokes with BOTH Org1 and Org2 peers
4. ✅ Satisfies multi-org endorsement policy

---

### **Option 2: Manual Command** (Step-by-Step)

**In WSL:**
```bash
# Navigate to test-network
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Set up environment
export PATH=${PWD}/../bin:$PATH

# Set MSP for Org1 (as the invoker)
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

# Invoke with BOTH Org1 and Org2 peers
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \
  -C mychannel \
  -n cdmscontract \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \
  -c '{"function":"CreateRecord","Args":["{\"record_id\":\"TEST_REC_001\",\"case_id\":\"CASE-TEST\",\"record_type\":\"Evidence\",\"filename\":\"test.txt\",\"file_hash\":\"abc123\",\"uploader_org\":\"Org1\",\"uploader_id\":\"AdminOrg1\"}"]}'
```

---

## What This Does

### **Multi-Org Endorsement**

By specifying **both** `--peerAddresses`:
- ✅ Org1 peer (localhost:7051) endorses the transaction
- ✅ Org2 peer (localhost:9051) endorses the transaction
- ✅ Both endorsements satisfy the `AND('Org1MSP.member', 'Org2MSP.member')` policy
- ✅ Transaction is submitted to orderer
- ✅ Orderer creates a new block
- ✅ Block is committed to both peers' ledgers

### **MSP Configuration**

The key is setting:
```bash
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
```

This tells the peer CLI where to find the Admin user's MSP certificates (not in the config directory).

---

## Verify It Works

### **1. Check Transaction Success**

After invoking, check orderer logs:
```bash
docker logs orderer.example.com --tail 20 | grep -E "Created block|Writing block"
```

Should see a new block created!

### **2. Query the Record**

```bash
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

peer chaincode query \
  -C mychannel \
  -n cdmscontract \
  -c '{"function":"ReadRecord","Args":["TEST_REC_001"]}'
```

Should return the record data!

### **3. Check Blockchain Height**

```bash
docker exec peer0.org1.example.com peer channel getinfo -c mychannel
```

Height should increase by 1!

---

## Apply This to Your Backend

To make your backend API use multi-org endorsement, update `cdms-backend/api.js` to explicitly specify both peers when submitting transactions:

```javascript
// In the /record/upload endpoint
const { contract, gateway } = await backend.getContract(adminId, req.auth.org);

// Get network and channel
const network = gateway.getNetwork('mychannel');
const channel = network.getChannel();

// Get peers from connection profile
const org1Peer = ccp.organizations.Org1MSP.peers[0];
const org2Peer = ccp.organizations.Org2MSP.peers[0];

// Submit with both peers explicitly
await contract.submitTransaction('CreateRecord', JSON.stringify(recordData), {
    endorsingPeers: [org1Peer, org2Peer]
});
```

**OR** re-enable discovery (which will find both peers automatically):
```javascript
await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: true, asLocalhost: true },  // Re-enable discovery
});
```

---

## Summary

**The Fix:**
1. ✅ Use correct MSP path: `organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp`
2. ✅ Don't rely on `FABRIC_CFG_PATH` for MSP (it's for config files, not MSP)
3. ✅ Specify both peers when invoking: `--peerAddresses localhost:7051 --peerAddresses localhost:9051`

**Result:**
- ✅ Multi-org endorsement policy satisfied
- ✅ Transactions will be added to blockchain
- ✅ New blocks will be created for user transactions

---

## Next Steps

1. **Test the script**: `bash invoke-with-both-orgs.sh`
2. **Update backend**: Modify `cdms-backend/api.js` to use both peers
3. **Test upload**: Try uploading a file through the frontend
4. **Verify blocks**: Check if new blocks are created for user transactions

