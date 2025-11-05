// Simple script to check blockchain blocks using peer CLI
const { execSync } = require('child_process');

function checkBlocks() {
    try {
        console.log('🔍 Querying blockchain blocks using peer CLI...\n');
        
        // Get blockchain info
        const peerInfoOutput = execSync(
            'docker exec peer0.org1.example.com peer channel getinfo -c mychannel 2>&1',
            { encoding: 'utf8' }
        );
        
        console.log('📊 Blockchain Info:');
        console.log(peerInfoOutput);
        
        // Parse height
        const heightMatch = peerInfoOutput.match(/"height":(\d+)/);
        const currentHashMatch = peerInfoOutput.match(/"currentBlockHash":"([^"]+)"/);
        const prevHashMatch = peerInfoOutput.match(/"previousBlockHash":"([^"]+)"/);
        
        if (heightMatch) {
            const height = parseInt(heightMatch[1], 10);
            console.log(`\n✅ Total blocks: ${height}`);
            console.log(`   Current block hash: ${currentHashMatch ? currentHashMatch[1].substring(0, 32) + '...' : 'N/A'}`);
            console.log(`   Previous block hash: ${prevHashMatch ? prevHashMatch[1].substring(0, 32) + '...' : 'N/A'}`);
            
            console.log(`\n📦 Block Summary:`);
            console.log(`   Block 0: Genesis block`);
            console.log(`   Blocks 1-${height - 1}: Application blocks`);
            console.log(`\n✅ Blocks ARE being added to the blockchain!`);
        } else {
            console.log('\n❌ Could not parse blockchain height');
        }
        
        // Check orderer logs for recent block creation
        console.log(`\n📋 Recent block creation from orderer logs:`);
        const ordererLogs = execSync(
            'docker logs orderer.example.com --tail 50 2>&1',
            { encoding: 'utf8' }
        );
        
        const blockMatches = ordererLogs.match(/Created block \[(\d+)\]/g);
        if (blockMatches) {
            console.log(`   Found ${blockMatches.length} "Created block" entries in recent logs`);
            blockMatches.slice(-5).forEach(match => {
                console.log(`   ${match}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkBlocks();

