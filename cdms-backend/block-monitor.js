// block-monitor.js - Monitor blockchain blocks in real-time
// Based on testBlockCreation_new.js
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

class BlockMonitor {
    constructor(userId = 'AdminOrg1', org = 'Org1') {
        this.userId = userId;
        this.org = org;
        this.gateway = null;
        this.network = null;
        this.listener = null;
        this.blockCount = 0;
        this.isRunning = false;
    }

    async start() {
        try {
            const orgLabel = this.org === 'Org2' ? 'Org2' : 'Org1';
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
            
            const identity = await wallet.get(this.userId);
            if (!identity) {
                throw new Error(`Identity "${this.userId}" not found in wallet`);
            }

            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet,
                identity: this.userId,
                discovery: { 
                    enabled: false,
                    asLocalhost: true 
                }
            });

            console.log('✅ Connected to gateway');

            this.network = await this.gateway.getNetwork('mychannel');
            console.log('✅ Got network: mychannel');
            
            const contract = this.network.getContract('cdmscontract');
            console.log('✅ Got contract: cdmscontract\n');

            // Add block listener
            console.log('📡 Setting up block listener...\n');
            
            this.listener = await this.network.addBlockListener(
                async (event) => {
                    this.blockCount++;
                    const blockNum = event.blockNumber.toString();
                    
                    console.log(`🧱 BLOCK #${blockNum} COMMITTED`);
                    console.log(`   ⏰ Time: ${new Date().toLocaleTimeString()}`);
                    
                    // Show transaction count and details
                    if (event.blockData && event.blockData.data && event.blockData.data.data) {
                        const txCount = event.blockData.data.data.length;
                        console.log(`   📦 Transactions: ${txCount}`);
                        
                        // Show transaction IDs and validation codes
                        event.blockData.data.data.forEach((tx, idx) => {
                            try {
                                const payload = tx.payload;
                                if (payload && payload.header && payload.header.channel_header) {
                                    const txId = payload.header.channel_header.tx_id;
                                    const shortTxId = txId.substring(0, 16) + '...';
                                    const type = payload.header.channel_header.typeString || 'UNKNOWN';
                                    console.log(`      TX ${idx + 1}: ${shortTxId} (${type})`);
                                }
                            } catch (err) {
                                // Skip if can't parse
                            }
                        });
                    }
                    console.log('');
                    
                    // Emit event if callback is provided
                    if (this.onBlockCallback) {
                        this.onBlockCallback({
                            blockNumber: blockNum,
                            timestamp: new Date().toISOString(),
                            transactionCount: event.blockData?.data?.data?.length || 0
                        });
                    }
                },
                { 
                    type: 'full',
                    startBlock: 'newest'
                }
            );
            
            console.log('✅ Block listener is now active!\n');
            this.isRunning = true;
            
            return true;
        } catch (error) {
            console.error('\n❌ Error starting block monitor:', error.message);
            throw error;
        }
    }

    async stop() {
        try {
            if (this.listener && this.network) {
                this.network.removeBlockListener(this.listener);
                console.log('✅ Block listener removed');
            }
            
            if (this.gateway) {
                await this.gateway.disconnect();
                console.log('✅ Disconnected from gateway');
            }
            
            this.isRunning = false;
            
            console.log(`\n📊 Session Summary:`);
            console.log(`   Total blocks detected: ${this.blockCount}`);
            
            return true;
        } catch (err) {
            console.error('⚠️  Error during shutdown:', err.message);
            throw err;
        }
    }

    setOnBlockCallback(callback) {
        this.onBlockCallback = callback;
    }

    getBlockCount() {
        return this.blockCount;
    }

    isActive() {
        return this.isRunning;
    }
}

// CLI usage
if (require.main === module) {
    const userId = process.argv[2] || 'AdminOrg1';
    const org = process.argv[3] || 'Org1';
    
    const monitor = new BlockMonitor(userId, org);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  CDMS Block Monitor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Identity: ${userId}`);
    console.log(`Organization: ${org}\n`);
    
    monitor.start().then(() => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('⏳ Listening for new blocks... (Press Ctrl+C to exit)\n');
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🛑 Shutting down...');
            await monitor.stop();
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            process.exit(0);
        });
    }).catch(err => {
        console.error('Failed to start block monitor:', err);
        process.exit(1);
    });
}

module.exports = BlockMonitor;

