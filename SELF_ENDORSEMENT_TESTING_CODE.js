/**
 * SELF-ENDORSEMENT AND SELF-COMMIT CONFIGURATION
 * FOR TESTING PURPOSES ONLY - NOT FOR PRODUCTION USE
 * 
 * This file contains code examples for configuring self-endorsement
 * and self-commit mode for local testing. This bypasses the normal
 * multi-organization endorsement requirements and allows immediate
 * block creation for faster testing.
 * 
 * ⚠️ WARNING: DO NOT USE IN PRODUCTION ⚠️
 * 
 * Production requires:
 * - Multiple peer endorsements (multi-org consensus)
 * - Proper validation and security checks
 * - Endorsement policy enforcement
 * 
 * This configuration is for TESTING ONLY.
 */

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs').promises;

/**
 * ============================================================
 * 1. SELF-ENDORSEMENT CONFIGURATION (Backend)
 * ============================================================
 * 
 * This function shows how to configure Fabric Gateway for
 * self-endorsement (single peer endorsement for testing).
 */

async function getContractWithSelfEndorsement(userId, org, channelName = 'mychannel', contractName = 'cdmscontract') {
    // Determine organization details
    let orgName, orgLabel, ccpPath, mspId;
    
    if (org === 'DistrictPoliceA' || org === 'Org1' || org === 'A') {
        orgName = 'org1.example.com';
        orgLabel = 'Org1';
        mspId = 'Org1MSP';
    } else if (org === 'DistrictPoliceB' || org === 'Org2' || org === 'B') {
        orgName = 'org2.example.com';
        orgLabel = 'Org2';
        mspId = 'Org2MSP';
    } else {
        throw new Error(`Unknown organization: ${org}`);
    }

    // Load connection profile
    ccpPath = path.resolve(
        __dirname,
        'fabric-samples/test-network/organizations/peerOrganizations',
        orgName,
        `connection-${orgLabel.toLowerCase()}.json`
    );

    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));

    // Load wallet
    const walletPath = path.join(__dirname, 'cdms-backend', 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(userId);

    if (!identity) {
        throw new Error(`Identity "${userId}" not found in wallet`);
    }

    // Create Gateway with SELF-ENDORSEMENT configuration
    const gateway = new Gateway();

    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { 
            enabled: false,  // Disable discovery - we'll specify peers explicitly
            asLocalhost: true 
        },
        eventHandlerOptions: {
            commitTimeout: 300,
            strategy: null  // Immediate commit strategy
        }
    });

    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(contractName);

    return { contract, gateway, mspId, network };
}

/**
 * ============================================================
 * 2. SELF-ENDORSEMENT TRANSACTION SUBMISSION
 * ============================================================
 * 
 * This function shows how to submit transactions with
 * explicit peer selection (self-endorsement).
 */

async function submitTransactionWithSelfEndorsement(contract, network, functionName, args, org = 'Org1') {
    // Get the channel and peers
    const channel = network.getChannel();
    
    // Determine peer address based on organization
    let peerName;
    if (org === 'Org1' || org === 'A') {
        peerName = 'peer0.org1.example.com';
    } else {
        peerName = 'peer0.org2.example.com';
    }

    // Build transaction proposal
    const transaction = contract.newTransaction(functionName);
    
    // Set endorsing peers explicitly (SELF-ENDORSEMENT)
    // This bypasses the normal multi-org endorsement requirement
    const peers = network.getChannel().getEndorsers();
    const targetPeer = Array.from(peers).find(p => p.getName() === peerName);
    
    if (!targetPeer) {
        throw new Error(`Peer ${peerName} not found`);
    }

    // Submit with explicit peer selection
    // This creates a transaction that only requires endorsement from ONE peer
    const result = await transaction
        .setEndorsingPeers([targetPeer])
        .submit(...args);

    return result;
}

/**
 * ============================================================
 * 3. SELF-COMMIT ORDERER CONFIGURATION
 * ============================================================
 * 
 * This shows how to configure the orderer for immediate
 * block creation (self-commit mode).
 * 
 * Orderer Environment Variables:
 * - ORDERER_GENERAL_BATCHTIMEOUT=0s  (Immediate block creation)
 * - ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1  (One transaction per block)
 */

const SELF_COMMIT_ORDERER_CONFIG = {
    // Immediate block creation (no batching delay)
    BATCH_TIMEOUT: '0s',
    
    // One transaction per block (for faster testing)
    MAX_MESSAGE_COUNT: 1,
    
    // Maximum block size (bytes)
    ABSOLUTE_MAX_BYTES: 10 * 1024 * 1024,  // 10MB
    
    // Preferred maximum block size
    PREFERRED_MAX_BYTES: 2 * 1024 * 1024    // 2MB
};

/**
 * Docker Compose Configuration for Self-Commit Orderer
 * 
 * Add these environment variables to orderer service:
 */
const SELF_COMMIT_DOCKER_COMPOSE = {
    orderer: {
        environment: [
            'ORDERER_GENERAL_BATCHTIMEOUT=0s',
            'ORDERER_GENERAL_BATCHSIZE_MAXMESSAGECOUNT=1',
            'ORDERER_GENERAL_BATCHSIZE_ABSOLUTEMAXBYTES=10485760',
            'ORDERER_GENERAL_BATCHSIZE_PREFERREDMAXBYTES=2097152'
        ]
    }
};

/**
 * ============================================================
 * 4. SINGLE-ORG ENDORSEMENT POLICY (Chaincode Deployment)
 * ============================================================
 * 
 * This shows how to deploy chaincode with single-org
 * endorsement policy (for testing only).
 * 
 * Command to deploy with self-endorsement:
 */

const SELF_ENDORSEMENT_DEPLOY_COMMAND = `
cd fabric-samples/test-network

# Deploy chaincode with SINGLE-ORG endorsement policy
./network.sh deployCC \\
    -ccn cdmscontract \\
    -ccp ../../chaincode \\
    -ccl javascript \\
    -ccv 1.8 \\
    -c mychannel \\
    -ccep "OR('Org1MSP.member')"  # Single org policy - FOR TESTING ONLY
`;

/**
 * Explanation:
 * -ccep "OR('Org1MSP.member')" means:
 *   - Only ONE organization (Org1) needs to endorse
 *   - This bypasses multi-org consensus requirement
 *   - FOR TESTING ONLY - NOT FOR PRODUCTION
 */

/**
 * ============================================================
 * 5. COMPLETE SELF-ENDORSEMENT FLOW EXAMPLE
 * ============================================================
 */

async function exampleSelfEndorsementUpload() {
    try {
        console.log('[TESTING] Starting self-endorsement upload...');
        
        // 1. Get contract with self-endorsement configuration
        const { contract, gateway, network } = await getContractWithSelfEndorsement(
            'AdminOrg1',  // Use admin identity
            'Org1',
            'mychannel',
            'cdmscontract'
        );

        // 2. Prepare record data
        const recordData = {
            record_id: `TEST_REC_${Date.now()}`,
            case_id: 'TEST-CASE',
            record_type: 'Evidence',
            filename: 'test.txt',
            file_hash: 'abc123',
            uploader_org: 'Org1',
            uploader_id: 'AdminOrg1'
        };

        // 3. Submit transaction with self-endorsement
        // This will only require endorsement from Org1 peer
        const result = await submitTransactionWithSelfEndorsement(
            contract,
            network,
            'CreateRecord',
            [JSON.stringify(recordData)],
            'Org1'
        );

        console.log('[TESTING] ✅ Transaction submitted with self-endorsement');
        console.log('[TESTING] Result:', result.toString());

        await gateway.disconnect();
        
        return result;
    } catch (error) {
        console.error('[TESTING] ❌ Self-endorsement upload failed:', error);
        throw error;
    }
}

/**
 * ============================================================
 * 6. BACKEND.JS INTEGRATION EXAMPLE
 * ============================================================
 * 
 * Example of how to modify backend.js getContract() method
 * to support self-endorsement mode:
 */

const BACKEND_JS_SELF_ENDORSEMENT_EXAMPLE = `
// In backend.js getContract() method:

async getContract(userId, org) {
    // ... existing code to load connection profile and wallet ...
    
    const gateway = new Gateway();
    
    // Check if self-endorsement mode is enabled (via environment variable)
    const SELF_ENDORSEMENT = process.env.SELF_ENDORSEMENT === 'true';
    
    if (SELF_ENDORSEMENT) {
        console.log('[BACKEND] 🔧 SELF-ENDORSEMENT mode enabled (for local testing)');
        
        // Self-endorsement configuration
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { 
                enabled: false,  // Disable discovery
                asLocalhost: true 
            },
            eventHandlerOptions: {
                commitTimeout: 300,
                strategy: null  // Immediate commit
            }
        });
        
        // For transactions, explicitly select peer
        // This is done in submitTransaction() calls
    } else {
        // Normal multi-org endorsement configuration
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true },
            eventHandlerOptions: {
                commitTimeout: 300,
                strategy: null
            }
        });
    }
    
    // ... rest of the code ...
}
`;

/**
 * ============================================================
 * 7. API.JS INTEGRATION EXAMPLE
 * ============================================================
 * 
 * Example of how to modify api.js submitTransaction() calls
 * to support self-endorsement:
 */

const API_JS_SELF_ENDORSEMENT_EXAMPLE = `
// In api.js upload endpoint:

// Check if self-endorsement mode is enabled
const SELF_ENDORSEMENT = process.env.SELF_ENDORSEMENT === 'true';

if (SELF_ENDORSEMENT) {
    // Self-endorsement: Explicitly select peer
    const peers = network.getChannel().getEndorsers();
    const targetPeer = Array.from(peers).find(p => 
        p.getName() === 'peer0.org1.example.com'
    );
    
    const transaction = contract.newTransaction('CreateRecord');
    await transaction
        .setEndorsingPeers([targetPeer])  // Single peer endorsement
        .submit(JSON.stringify(recordData));
} else {
    // Normal: Multi-org endorsement (both peers must endorse)
    await contract.submitTransaction('CreateRecord', JSON.stringify(recordData));
}
`;

/**
 * ============================================================
 * 8. DEPLOYMENT SCRIPT FOR SELF-ENDORSEMENT
 * ============================================================
 */

const SELF_ENDORSEMENT_DEPLOY_SCRIPT = `
#!/bin/bash
# deploy-chaincode-self-endorsement.sh
# Deploy chaincode with single-org endorsement policy (TESTING ONLY)

set -e

CHAINCODE_NAME="cdmscontract"
CHAINCODE_LANGUAGE="javascript"
CHANNEL_NAME="mychannel"
CC_VERSION="1.8"  # Increment version for self-endorsement deployment

cd fabric-samples/test-network

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

# Deploy with SINGLE-ORG endorsement policy
./network.sh deployCC \\
    -ccn ${CHAINCODE_NAME} \\
    -ccp ../../chaincode \\
    -ccl ${CHAINCODE_LANGUAGE} \\
    -ccv ${CC_VERSION} \\
    -c ${CHANNEL_NAME} \\
    -ccep "OR('Org1MSP.member')"  # ⚠️ TESTING ONLY - Single org policy

echo "✅ Chaincode deployed with self-endorsement policy"
echo "⚠️  WARNING: This is for TESTING ONLY. Production requires multi-org policy."
`;

/**
 * ============================================================
 * 9. ENVIRONMENT VARIABLE CONFIGURATION
 * ============================================================
 */

const ENV_CONFIG_EXAMPLE = `
# .env file configuration for self-endorsement mode

# Enable self-endorsement (single peer endorsement for testing)
SELF_ENDORSEMENT=true

# Enable self-commit (immediate block creation for testing)
SELF_COMMIT=true

# Note: Both should be set to 'false' for production
`;

/**
 * ============================================================
 * 10. VERIFICATION FUNCTIONS
 * ============================================================
 */

async function verifySelfEndorsementMode() {
    console.log('[VERIFY] Checking self-endorsement configuration...');
    
    // Check if SELF_ENDORSEMENT env var is set
    const selfEndorsement = process.env.SELF_ENDORSEMENT === 'true';
    console.log(`[VERIFY] SELF_ENDORSEMENT=${selfEndorsement}`);
    
    // Check if SELF_COMMIT env var is set
    const selfCommit = process.env.SELF_COMMIT === 'true';
    console.log(`[VERIFY] SELF_COMMIT=${selfCommit}`);
    
    if (selfEndorsement || selfCommit) {
        console.log('[VERIFY] ⚠️  WARNING: Testing mode enabled. This should NOT be used in production.');
    }
    
    return { selfEndorsement, selfCommit };
}

// Export functions for use (if needed)
module.exports = {
    getContractWithSelfEndorsement,
    submitTransactionWithSelfEndorsement,
    exampleSelfEndorsementUpload,
    verifySelfEndorsementMode,
    SELF_COMMIT_ORDERER_CONFIG,
    SELF_ENDORSEMENT_DEPLOY_COMMAND,
    SELF_ENDORSEMENT_DEPLOY_SCRIPT
};

/**
 * ============================================================
 * SUMMARY
 * ============================================================
 * 
 * This file demonstrates:
 * 
 * 1. Self-Endorsement Configuration:
 *    - Single peer endorsement (bypasses multi-org requirement)
 *    - Explicit peer selection
 *    - Disabled discovery
 * 
 * 2. Self-Commit Configuration:
 *    - Immediate block creation (0ms batch timeout)
 *    - One transaction per block
 *    - Faster testing cycle
 * 
 * 3. Chaincode Deployment:
 *    - Single-org endorsement policy: OR('Org1MSP.member')
 *    - Bypasses multi-org consensus
 * 
 * ⚠️  IMPORTANT: This configuration is FOR TESTING ONLY
 * 
 * Production requires:
 * - Multi-org endorsement (AND('Org1MSP.member', 'Org2MSP.member'))
 * - Proper validation and consensus
 * - Security and trust guarantees
 */

