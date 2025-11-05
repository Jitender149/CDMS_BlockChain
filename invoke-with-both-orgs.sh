#!/bin/bash
# Invoke chaincode with BOTH Org1 and Org2 peers (satisfies multi-org endorsement policy)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN} Invoking Chaincode with Both Orgs${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Navigate to test-network directory
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Set up environment
export PATH=${PWD}/../bin:$PATH

# Set FABRIC_CFG_PATH to the test-network config (optional - only if needed)
# export FABRIC_CFG_PATH=${PWD}/../config/

echo -e "${YELLOW}Step 1: Setting environment...${NC}"
echo "   PATH: $PATH"
echo ""

# Set MSP paths for Org1 (as the invoker)
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS=localhost:7051

echo -e "${YELLOW}Step 2: Setting MSP configuration...${NC}"
echo "   CORE_PEER_LOCALMSPID: $CORE_PEER_LOCALMSPID"
echo "   CORE_PEER_MSPCONFIGPATH: $CORE_PEER_MSPCONFIGPATH"
echo "   CORE_PEER_ADDRESS: $CORE_PEER_ADDRESS"
echo ""

echo -e "${YELLOW}Step 3: Invoking chaincode with BOTH Org1 and Org2 peers...${NC}"
echo "   Function: CreateRecord (test transaction)"
echo "   Channel: mychannel"
echo "   Chaincode: cdmscontract"
echo "   Peers: localhost:7051 (Org1) + localhost:9051 (Org2)"
echo ""

# Invoke with BOTH peers
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

echo ""
echo -e "${GREEN}✅ Transaction submitted successfully!${NC}"
echo ""
echo -e "${YELLOW}Step 4: Checking if new block was created...${NC}"
sleep 2

# Check blockchain height
docker exec peer0.org1.example.com peer channel getinfo -c mychannel 2>&1 | grep -E "height|currentBlockHash"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN}✅ Invocation Complete!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "   1. Check orderer logs: docker logs orderer.example.com --tail 20"
echo "   2. Query chaincode: peer chaincode query -C mychannel -n cdmscontract -c '{\"function\":\"ReadRecord\",\"Args\":[\"TEST_REC_001\"]}'"
echo ""

