#!/bin/bash
# Restart Fabric Network with CA Support (Bash script for WSL)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN} Restarting Fabric Network with CA Support${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""

# Navigate to test-network directory
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

echo -e "${YELLOW}Step 1: Stopping current network...${NC}"
./network.sh down

echo ""
echo -e "${YELLOW}Step 2: Starting network with CA...${NC}"
./network.sh up createChannel -ca

echo ""
echo -e "${YELLOW}Step 3: Deploying YOUR chaincode v1.4...${NC}"
./network.sh deployCC -ccn cdmscontract -ccp /mnt/c/CDMS_Blockchain/chaincode -ccl javascript -ccv 1.4

echo ""
echo -e "${GREEN}Step 4: Verifying containers...${NC}"
echo ""
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "ca_|ca\.|peer|orderer|dev-"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${GREEN} Fabric Network Ready!${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd /mnt/c/CDMS_Blockchain/cdms-backend"
echo "  2. npm start"
echo "  3. Try approving users in Access Management"
echo ""

