/**
 * Self-Commit Configuration for Local Testing
 * 
 * This module provides modified Fabric Gateway configuration for self-endorsement
 * and self-commit behavior in local testing scenarios.
 * 
 * FOR TESTING ONLY - NOT FOR PRODUCTION USE
 */

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs').promises;
const path = require('path');

/**
 * Get contract with self-commit configuration
 * Bypasses ordering service delays and uses immediate commit strategy
 */
async function getContractWithSelfCommit(userId, org, channelName, contractName, walletPath) {
    let orgName, orgLabel, ccpPath, mspId;

    // Normalize org argument
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
        `../fabric-samples/test-network/organizations/peerOrganizations/${orgName}/connection-${orgLabel.toLowerCase()}.json`
    );

    if (!await fs.access(ccpPath).then(() => true).catch(() => false)) {
        throw new Error(`Connection profile not found: ${ccpPath}`);
    }

    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));

    // Load wallet
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(userId);

    if (!identity) {
        const allIdentities = await wallet.list();
        throw new Error(`Identity "${userId}" not found. Available: ${JSON.stringify(allIdentities || [])}`);
    }

    // Create gateway with SELF-COMMIT configuration
    const gateway = new Gateway();

    // SELF-COMMIT GATEWAY CONFIGURATION
    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { 
            enabled: false,  // Disable discovery - use direct peer connection
            asLocalhost: true 
        },
        eventHandlerOptions: {
            // IMMEDIATE COMMIT STRATEGY
            commitTimeout: 60,  // Reduced timeout for faster commit
            strategy: null  // Use null strategy to bypass event wait (will rely on orderer immediate block creation)
        },
        // Additional options for immediate processing
        queryHandlerOptions: {
            timeout: 30
        }
    });

    // Get network and contract
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(contractName);

    console.log(`[SELF-COMMIT] ✅ Connected for self-commit testing as ${userId} from ${orgLabel}`);

    return { contract, gateway, mspId };
}

/**
 * Submit transaction with self-commit (immediate block creation)
 */
async function submitTransactionSelfCommit(contract, transactionName, ...args) {
    try {
        console.log(`[SELF-COMMIT] Submitting transaction: ${transactionName}`);
        
        // Submit transaction - orderer should create block immediately (batchTimeout: 0s)
        const result = await contract.submitTransaction(transactionName, ...args);
        
        console.log(`[SELF-COMMIT] ✅ Transaction submitted. Result: ${result.toString()}`);
        
        // Note: In self-commit mode, block should be created immediately by orderer
        // Peer will commit block as soon as it receives it from orderer
        
        return result;
    } catch (error) {
        console.error(`[SELF-COMMIT] Transaction failed:`, error.message);
        throw error;
    }
}

/**
 * Evaluate transaction (query only, no commit needed)
 */
async function evaluateTransactionSelfCommit(contract, transactionName, ...args) {
    try {
        console.log(`[SELF-COMMIT] Evaluating transaction: ${transactionName}`);
        
        const result = await contract.evaluateTransaction(transactionName, ...args);
        
        console.log(`[SELF-COMMIT] ✅ Query successful. Result: ${result.toString()}`);
        
        return result;
    } catch (error) {
        console.error(`[SELF-COMMIT] Query failed:`, error.message);
        throw error;
    }
}

module.exports = {
    getContractWithSelfCommit,
    submitTransactionSelfCommit,
    evaluateTransactionSelfCommit
};

