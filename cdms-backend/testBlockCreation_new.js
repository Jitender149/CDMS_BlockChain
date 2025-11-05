'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const userId = process.argv[2] || 'AdminOrg1';
    
    console.log(`🔑 Using identity: ${userId}`);
    
    // Load connection profile
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Load wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const identity = await wallet.get(userId);
    if (!identity) {
      console.log(`❌ Identity ${userId} not found in wallet`);
      process.exit(1);
    }

    // Connect to gateway
    const gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: userId,
      discovery: { 
        enabled: false,
        asLocalhost: true 
      }
    });

    console.log('✅ Connected to gateway');

    // Get network and contract
    const network = await gateway.getNetwork('mychannel');
    console.log('✅ Got network: mychannel');
    
    const contract = network.getContract('cdmscontract');
    console.log('✅ Got contract: cdmscontract\n');

    // Add block listener
    console.log('📡 Setting up block listener...\n');
    let blockCount = 0;
    
    const listener = await network.addBlockListener(
      async (event) => {
        blockCount++;
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
                console.log(`      TX ${idx + 1}: ${shortTxId}`);
              }
            } catch (err) {
              // Skip if can't parse
            }
          });
        }
        console.log('');
      },
      { 
        type: 'full',
        startBlock: 'newest'
      }
    );
    
    console.log('✅ Block listener is now active!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Instructions for user
    console.log('📋 Your block listener is working! Here\'s what to do:\n');
    console.log('1️⃣  Open a NEW terminal window');
    console.log('2️⃣  Navigate to: fabric-samples/test-network');
    console.log('3️⃣  Run this command to invoke the chaincode:\n');
    console.log('   export PATH=${PWD}/../bin:$PATH');
    console.log('   export FABRIC_CFG_PATH=$PWD/../config/\n');
    console.log('   peer chaincode invoke -o localhost:7050 \\');
    console.log('     --ordererTLSHostnameOverride orderer.example.com \\');
    console.log('     --tls \\');
    console.log('     --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" \\');
    console.log('     -C mychannel \\');
    console.log('     -n cdmscontract \\');
    console.log('     --peerAddresses localhost:7051 \\');
    console.log('     --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" \\');
    console.log('     --peerAddresses localhost:9051 \\');
    console.log('     --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" \\');
    console.log('     -c \'{"function":"InitLedger","Args":[]}\'\n');
    console.log('4️⃣  Watch this terminal for new block events! 🎉\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⏳ Listening for new blocks... (Press Ctrl+C to exit)\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📊 Session Summary:`);
      console.log(`   Total blocks detected: ${blockCount}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🛑 Shutting down...');
      try {
        network.removeBlockListener(listener);
        await gateway.disconnect();
        console.log('✅ Disconnected gracefully\n');
      } catch (err) {
        console.log('⚠️  Error during shutdown:', err.message);
      }
      process.exit(0);
    });

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();