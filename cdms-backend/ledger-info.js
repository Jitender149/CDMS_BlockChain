// ledger-info.js - Query blockchain blocks and ledger information
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Get all blocks from the blockchain
 * @param {string} userId - Identity to use (default: AdminOrg1)
 * @param {string} org - Organization (Org1 or Org2)
 * @returns {Promise<Array>} Array of block data
 */
async function getAllBlocks(userId = 'AdminOrg1', org = 'Org1') {
    try {
        // Load connection profile
        const orgLabel = org === 'Org2' ? 'Org2' : 'Org1';
        const ccpPath = path.resolve(
            __dirname,
            '..',
            'fabric-samples',
            'test-network',
            'organizations',
            'peerOrganizations',
            `org${orgLabel.slice(-1)}.example.com`,
            `connection-org${orgLabel.slice(-1)}.json`
        );
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found: ${ccpPath}`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Load wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get(userId);
        if (!identity) {
            throw new Error(`Identity "${userId}" not found in wallet`);
        }

        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: false, asLocalhost: true },
        });

        const network = await gateway.getNetwork('mychannel');
        
        // Get blockchain info using peer CLI (more reliable)
        // First, get the height from peer CLI
        const peerName = orgLabel === 'Org2' ? 'peer0.org2.example.com' : 'peer0.org1.example.com';
        const peerInfoOutput = execSync(
            `docker exec ${peerName} peer channel getinfo -c mychannel 2>&1`,
            { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        );
        
        // Parse blockchain info from output
        const heightMatch = peerInfoOutput.match(/"height":(\d+)/);
        const currentHashMatch = peerInfoOutput.match(/"currentBlockHash":"([^"]+)"/);
        const prevHashMatch = peerInfoOutput.match(/"previousBlockHash":"([^"]+)"/);
        
        const latestBlockNumber = heightMatch ? parseInt(heightMatch[1], 10) : 0;
        
        console.log(`[LEDGER-INFO] ✅ Latest block number: ${latestBlockNumber}`);

        // Query all blocks using peer CLI
        let blocks = [];
        for (let i = 0; i < latestBlockNumber; i++) {
            try {
                // Use peer CLI to get block data
                const blockOutput = execSync(
                    `docker exec ${peerName} peer channel fetch ${i} mychannel.block -c mychannel -o orderer.example.com:7050 --tls --cafile /var/hyperledger/orderer/tls/ca.crt 2>&1 || echo "BLOCK_FETCH_FAILED"`,
                    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
                );
                
                // If block fetch failed, try to query block directly
                if (blockOutput.includes('BLOCK_FETCH_FAILED')) {
                    // Try using channel.queryBlock if available
                    const channel = network.getChannel();
                    const block = await channel.queryBlock(i);
                const blockData = {
                    blockNumber: i,
                    dataHash: block.header.data_hash.toString('hex'),
                    previousHash: block.header.previous_hash.toString('hex'),
                    blockTimestamp: block.header.timestamp ? new Date(block.header.timestamp.seconds.low * 1000).toISOString() : null,
                    txCount: block.data.data.length,
                    transactions: []
                };

                // Extract transaction information
                block.data.data.forEach((tx, idx) => {
                    try {
                        const payload = tx.payload || tx;
                        if (payload && payload.header && payload.header.channel_header) {
                            const channelHeader = payload.header.channel_header;
                            blockData.transactions.push({
                                txId: channelHeader.tx_id,
                                timestamp: channelHeader.timestamp ? new Date(channelHeader.timestamp.seconds.low * 1000).toISOString() : null,
                                type: channelHeader.typeString || channelHeader.type,
                                channelId: channelHeader.channel_id,
                                creatorMspId: payload.header.signature_header ? payload.header.signature_header.creator.mspid : null
                            });
                        }
                    } catch (txErr) {
                        console.warn(`[LEDGER-INFO] Failed to parse transaction ${idx} in block ${i}:`, txErr.message);
                    }
                });

                blocks.push(blockData);
            } catch (blockErr) {
                console.warn(`[LEDGER-INFO] Failed to query block ${i}:`, blockErr.message);
            }
        }

        await gateway.disconnect();
        return blocks;
    } catch (err) {
        console.error('[LEDGER-INFO] ❌ Error fetching blocks:', err);
        throw err;
    }
}

/**
 * Get block information
 * @param {number} blockNumber - Block number to query
 * @param {string} userId - Identity to use
 * @param {string} org - Organization
 * @returns {Promise<Object>} Block data
 */
async function getBlock(blockNumber, userId = 'AdminOrg1', org = 'Org1') {
    try {
        const orgLabel = org === 'Org2' ? 'Org2' : 'Org1';
        const ccpPath = path.resolve(
            __dirname,
            '..',
            'fabric-samples',
            'test-network',
            'organizations',
            'peerOrganizations',
            `org${orgLabel.slice(-1)}.example.com`,
            `connection-org${orgLabel.slice(-1)}.json`
        );
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found: ${ccpPath}`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get(userId);
        if (!identity) {
            throw new Error(`Identity "${userId}" not found in wallet`);
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: false, asLocalhost: true },
        });

        const network = await gateway.getNetwork('mychannel');
        const channel = network.getChannel();
        
        const block = await channel.queryBlock(blockNumber);
        
        const blockData = {
            blockNumber: blockNumber,
            dataHash: block.header.data_hash.toString('hex'),
            previousHash: block.header.previous_hash.toString('hex'),
            blockTimestamp: block.header.timestamp ? new Date(block.header.timestamp.seconds.low * 1000).toISOString() : null,
            txCount: block.data.data.length,
            transactions: []
        };

        block.data.data.forEach((tx, idx) => {
            try {
                const payload = tx.payload || tx;
                if (payload && payload.header && payload.header.channel_header) {
                    const channelHeader = payload.header.channel_header;
                    blockData.transactions.push({
                        txId: channelHeader.tx_id,
                        timestamp: channelHeader.timestamp ? new Date(channelHeader.timestamp.seconds.low * 1000).toISOString() : null,
                        type: channelHeader.typeString || channelHeader.type,
                        channelId: channelHeader.channel_id,
                        creatorMspId: payload.header.signature_header ? payload.header.signature_header.creator.mspid : null
                    });
                }
            } catch (txErr) {
                console.warn(`[LEDGER-INFO] Failed to parse transaction ${idx}:`, txErr.message);
            }
        });

        await gateway.disconnect();
        return blockData;
    } catch (err) {
        console.error(`[LEDGER-INFO] ❌ Error fetching block ${blockNumber}:`, err);
        throw err;
    }
}

/**
 * Get blockchain info (height, latest block hash, etc.)
 * @param {string} userId - Identity to use
 * @param {string} org - Organization
 * @returns {Promise<Object>} Blockchain info
 */
async function getBlockchainInfo(userId = 'AdminOrg1', org = 'Org1') {
    try {
        const orgLabel = org === 'Org2' ? 'Org2' : 'Org1';
        const ccpPath = path.resolve(
            __dirname,
            '..',
            'fabric-samples',
            'test-network',
            'organizations',
            'peerOrganizations',
            `org${orgLabel.slice(-1)}.example.com`,
            `connection-org${orgLabel.slice(-1)}.json`
        );
        
        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found: ${ccpPath}`);
        }
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get(userId);
        if (!identity) {
            throw new Error(`Identity "${userId}" not found in wallet`);
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: false, asLocalhost: true },
        });

        const network = await gateway.getNetwork('mychannel');
        const channel = network.getChannel();
        
        const blockchainInfo = await channel.queryInfo();
        
        const info = {
            height: blockchainInfo.height.low,
            currentBlockHash: blockchainInfo.currentBlockHash.toString('hex'),
            previousBlockHash: blockchainInfo.previousBlockHash.toString('hex'),
            ledgerHeight: blockchainInfo.height.low
        };

        await gateway.disconnect();
        return info;
    } catch (err) {
        console.error('[LEDGER-INFO] ❌ Error fetching blockchain info:', err);
        throw err;
    }
}

/**
 * Get orderer TLS certificate from Docker container
 * @returns {Promise<string>} PEM certificate
 */
async function getOrdererTLSCertificate() {
    try {
        const cert = execSync('docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt', {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe']
        });
        return cert.trim();
    } catch (err) {
        console.error('[LEDGER-INFO] ❌ Failed to get orderer TLS certificate:', err.message);
        throw new Error(`Failed to get orderer TLS certificate: ${err.message}`);
    }
}

/**
 * Load TLS certificate from peerOrganizations folder
 * @param {string} org - Organization (Org1 or Org2)
 * @param {string} type - Type: 'peer' or 'ca'
 * @returns {Promise<string>} PEM certificate
 */
function loadTLSCertificate(org = 'Org1', type = 'peer') {
    try {
        const orgLabel = org === 'Org2' ? 'Org2' : 'Org1';
        const orgNum = orgLabel.slice(-1);
        
        let certPath;
        if (type === 'peer') {
            certPath = path.resolve(
                __dirname,
                '..',
                'fabric-samples',
                'test-network',
                'organizations',
                'peerOrganizations',
                `org${orgNum}.example.com`,
                'peers',
                `peer0.org${orgNum}.example.com`,
                'tls',
                'ca.crt'
            );
        } else if (type === 'ca') {
            certPath = path.resolve(
                __dirname,
                '..',
                'fabric-samples',
                'test-network',
                'organizations',
                'peerOrganizations',
                `org${orgNum}.example.com`,
                'msp',
                'tlscacerts',
                `tlsca.org${orgNum}.example.com-cert.pem`
            );
        }
        
        if (!fs.existsSync(certPath)) {
            throw new Error(`TLS certificate not found: ${certPath}`);
        }
        
        return fs.readFileSync(certPath, 'utf8').trim();
    } catch (err) {
        console.error(`[LEDGER-INFO] ❌ Failed to load TLS certificate for ${org}:`, err.message);
        throw err;
    }
}

module.exports = {
    getAllBlocks,
    getBlock,
    getBlockchainInfo,
    getOrdererTLSCertificate,
    loadTLSCertificate
};

