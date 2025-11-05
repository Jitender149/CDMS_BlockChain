// Quick script to check blockchain blocks
const { getAllBlocks } = require('./ledger-info.js');

async function checkBlocks() {
    try {
        console.log('🔍 Querying blockchain blocks...\n');
        const blocks = await getAllBlocks('AdminOrg1', 'Org1');
        
        console.log(`✅ Total blocks: ${blocks.length}\n`);
        
        blocks.forEach((block, idx) => {
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`📦 Block ${block.blockNumber} (Height: ${idx + 1})`);
            console.log(`   Hash: ${block.dataHash.substring(0, 32)}...`);
            console.log(`   Previous Hash: ${block.previousHash.substring(0, 32)}...`);
            console.log(`   Timestamp: ${block.blockTimestamp || 'N/A'}`);
            console.log(`   Transactions: ${block.txCount}`);
            
            if (block.transactions && block.transactions.length > 0) {
                console.log(`\n   Transaction Details:`);
                block.transactions.forEach((tx, txIdx) => {
                    console.log(`   [${txIdx + 1}] Type: ${tx.type || 'UNKNOWN'}`);
                    console.log(`       TX ID: ${tx.txId || 'N/A'}`);
                    console.log(`       Timestamp: ${tx.timestamp || 'N/A'}`);
                    console.log(`       Creator MSP: ${tx.creatorMspId || 'N/A'}`);
                    console.log(``);
                });
            } else {
                console.log(`   No transaction details available\n`);
            }
        });
        
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`\n✅ Block query complete!`);
        
    } catch (error) {
        console.error('❌ Error querying blocks:', error.message);
        console.error(error.stack);
    }
}

checkBlocks();

