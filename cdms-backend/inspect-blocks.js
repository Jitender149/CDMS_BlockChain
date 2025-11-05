// Inspect blockchain blocks to see what transactions are included
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function inspectBlocks() {
    try {
        console.log('🔍 Inspecting blockchain blocks to see transaction types...\n');
        
        // Get blockchain height
        const peerInfoOutput = execSync(
            'docker exec peer0.org1.example.com peer channel getinfo -c mychannel 2>&1',
            { encoding: 'utf8' }
        );
        
        const heightMatch = peerInfoOutput.match(/"height":(\d+)/);
        const height = heightMatch ? parseInt(heightMatch[1], 10) : 0;
        
        console.log(`📊 Blockchain Height: ${height} blocks\n`);
        
        // Load connection profile
        const ccpPath = path.resolve(
            __dirname,
            '..',
            'fabric-samples',
            'test-network',
            'organizations',
            'peerOrganizations',
            'org1.example.com',
            'connection-org1.json'
        );
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        
        // Load wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const identity = await wallet.get('AdminOrg1');
        if (!identity) {
            throw new Error('AdminOrg1 identity not found in wallet');
        }
        
        // Connect to gateway
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: 'AdminOrg1',
            discovery: { enabled: false, asLocalhost: true },
        });
        
        const network = await gateway.getNetwork('mychannel');
        const channel = network.getChannel();
        
        // Inspect each block
        let userTxCount = 0;
        let configTxCount = 0;
        let chaincodeLifecycleTxCount = 0;
        let otherTxCount = 0;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        for (let i = 0; i < height; i++) {
            try {
                const block = await channel.queryBlock(i);
                
                console.log(`\n📦 Block ${i}:`);
                console.log(`   Transactions: ${block.data.data.length}`);
                
                block.data.data.forEach((tx, idx) => {
                    try {
                        const payload = tx.payload || tx;
                        if (payload && payload.header && payload.header.channel_header) {
                            const channelHeader = payload.header.channel_header;
                            const txType = channelHeader.typeString || channelHeader.type || 'UNKNOWN';
                            const txId = channelHeader.tx_id || 'N/A';
                            
                            // Check transaction type
                            if (txType === 'ENDORSER_TRANSACTION') {
                                // This is an application transaction - check if it's our chaincode
                                try {
                                    const chaincodeActionPayload = payload.data.actions?.[0]?.payload?.action?.proposal_response_payload?.extension?.chaincode_id;
                                    if (chaincodeActionPayload) {
                                        const chaincodeName = chaincodeActionPayload.name || 'UNKNOWN';
                                        console.log(`   [${idx + 1}] ✅ USER TRANSACTION: ${chaincodeName} (TX: ${txId.substring(0, 16)}...)`);
                                        userTxCount++;
                                    } else {
                                        console.log(`   [${idx + 1}] ✅ USER TRANSACTION: Application (TX: ${txId.substring(0, 16)}...)`);
                                        userTxCount++;
                                    }
                                } catch (e) {
                                    console.log(`   [${idx + 1}] ✅ USER TRANSACTION: Application (TX: ${txId.substring(0, 16)}...)`);
                                    userTxCount++;
                                }
                            } else if (txType === 'CONFIG') {
                                console.log(`   [${idx + 1}] ⚙️  CONFIG TRANSACTION (TX: ${txId.substring(0, 16)}...)`);
                                configTxCount++;
                            } else if (txType === 'CONFIG_UPDATE') {
                                console.log(`   [${idx + 1}] ⚙️  CONFIG UPDATE (TX: ${txId.substring(0, 16)}...)`);
                                configTxCount++;
                            } else {
                                console.log(`   [${idx + 1}] ❓ OTHER: ${txType} (TX: ${txId.substring(0, 16)}...)`);
                                otherTxCount++;
                            }
                        }
                    } catch (txErr) {
                        console.log(`   [${idx + 1}] ⚠️  Failed to parse transaction: ${txErr.message}`);
                        otherTxCount++;
                    }
                });
            } catch (blockErr) {
                console.log(`\n❌ Failed to query block ${i}: ${blockErr.message}`);
            }
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📊 Transaction Summary:');
        console.log(`   ✅ User Transactions (CreateRecord, AddAudit, etc.): ${userTxCount}`);
        console.log(`   ⚙️  Config Transactions (channel setup): ${configTxCount}`);
        console.log(`   ❓ Other Transactions: ${otherTxCount}`);
        console.log(`   📦 Total Blocks: ${height}`);
        
        if (userTxCount > 0) {
            console.log('\n✅ YES! Your user transactions ARE being added to the blockchain!');
        } else {
            console.log('\n⚠️  NO user transactions found. Only orderer/config transactions.');
            console.log('   This might mean:');
            console.log('   - No file uploads have been submitted yet');
            console.log('   - Transactions are failing during submission');
            console.log('   - Transactions are not being endorsed properly');
        }
        
        await gateway.disconnect();
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

inspectBlocks();

