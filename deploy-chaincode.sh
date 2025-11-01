#!/bin/bash
# deploy-chaincode.sh - Deploy CDMS chaincode to Fabric test-network
# Run this script from the project root: ./deploy-chaincode.sh

set -e

echo "======================================"
echo "  CDMS Chaincode Deployment Script"
echo "======================================"
echo ""

# Get the project root directory (where this script is located)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
CHAINCODE_NAME="cdmscontract"
CHAINCODE_LANGUAGE="javascript"
CHANNEL_NAME="mychannel"
CC_VERSION="1.2"  # Incremented for block history fix

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if in WSL
if ! grep -qi microsoft /proc/version 2>/dev/null; then
    echo -e "${RED}❌ This script must be run in WSL (Windows Subsystem for Linux)${NC}"
    echo ""
    echo "To run in WSL:"
    echo "  1. Open Ubuntu/WSL terminal"
    echo "  2. Navigate to: cd /mnt/c/CDMS_Blockchain"
    echo "  3. Run: bash deploy-chaincode.sh"
    exit 1
fi

# Check if test-network directory exists
if [ ! -d "${PROJECT_ROOT}/fabric-samples/test-network" ]; then
    echo -e "${RED}❌ fabric-samples/test-network directory not found${NC}"
    exit 1
fi

# Check if chaincode directory exists
if [ ! -d "${PROJECT_ROOT}/chaincode" ]; then
    echo -e "${RED}❌ chaincode directory not found at ${PROJECT_ROOT}/chaincode${NC}"
    exit 1
fi

# Store absolute path to chaincode (relative to project root)
CHAINCODE_PATH="${PROJECT_ROOT}/chaincode"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"
echo -e "${YELLOW}Chaincode path: ${CHAINCODE_PATH}${NC}"
echo ""

echo -e "${YELLOW}Step 1: Installing chaincode dependencies...${NC}"
cd "${CHAINCODE_PATH}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 2: Navigating to test-network...${NC}"
cd "${PROJECT_ROOT}/fabric-samples/test-network"

echo -e "${YELLOW}Step 3: Setting environment variables...${NC}"
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config
echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploying chaincode to network...${NC}"
echo "Chaincode will be deployed from: ${CHAINCODE_PATH}"
echo "This may take a few minutes..."
echo ""

./network.sh deployCC \
    -ccn ${CHAINCODE_NAME} \
    -ccp ${CHAINCODE_PATH} \
    -ccl ${CHAINCODE_LANGUAGE} \
    -ccv ${CC_VERSION} \
    -c ${CHANNEL_NAME}

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================"
    echo -e "  ✅ Chaincode Deployed Successfully!"
    echo -e "======================================${NC}"
    echo ""
    echo "Chaincode Details:"
    echo "  Name:     ${CHAINCODE_NAME}"
    echo "  Version:  ${CC_VERSION}"
    echo "  Channel:  ${CHANNEL_NAME}"
    echo "  Language: ${CHAINCODE_LANGUAGE}"
    echo ""
    echo "Next steps:"
    echo "  1. Return to PowerShell"
    echo "  2. Start the backend: cd cdms-backend && npm start"
    echo "  3. Test login through the frontend"
    echo ""
else
    echo ""
    echo -e "${RED}======================================"
    echo -e "  ❌ Chaincode Deployment Failed"
    echo -e "======================================${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Ensure Docker containers are running: docker ps"
    echo "  2. Check network is up: ./network.sh up createChannel"
    echo "  3. Check chaincode syntax: cd ../../chaincode && npm install"
    echo ""
    exit 1
fi

