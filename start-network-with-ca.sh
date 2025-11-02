#!/bin/bash
# Start Fabric Network with CA and Deploy CDMS Chaincode

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN} Starting Fabric Network with CA${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Navigate to test-network directory
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

echo -e "${YELLOW}Step 1: Stopping any existing network...${NC}"
./network.sh down

echo ""
echo -e "${YELLOW}Step 2: Starting network with CA...${NC}"
./network.sh up createChannel -ca

echo ""
echo -e "${YELLOW}Step 3: Deploying CDMS chaincode v1.4...${NC}"
./network.sh deployCC -ccn cdmscontract -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript -ccv 1.4

echo ""
echo -e "${GREEN}Step 4: Verifying containers...${NC}"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "ca|peer|orderer|dev-"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN} ✅ Fabric Network Ready with CA!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${YELLOW}Containers running:${NC}"
echo "  ✅ Certificate Authorities (ca.org1, ca.org2)"
echo "  ✅ Peers (peer0.org1, peer0.org2)"
echo "  ✅ Orderer (orderer.example.com)"
echo "  ✅ CDMS Chaincode (dev-peer...cdmscontract_1.4)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd /mnt/c/CDMS_Blockchain/cdms-backend"
echo "  2. npm start"
echo "  3. Login as admin and approve users!"
echo ""

