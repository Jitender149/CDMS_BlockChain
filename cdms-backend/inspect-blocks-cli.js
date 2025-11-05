// Inspect blockchain blocks using peer CLI to see transaction types
const { execSync } = require('child_process');

function inspectBlocks() {
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
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Check orderer logs for block creation
        console.log('\n📋 Checking orderer logs for block creation events...\n');
        
        const ordererLogs = execSync(
            'docker logs orderer.example.com --tail 200 2>&1',
            { encoding: 'utf8' }
        );
        
        // Find all "Created block" entries
        const createdBlockMatches = ordererLogs.match(/Created block \[(\d+)\]/g);
        const writtenBlockMatches = ordererLogs.match(/Writing block \[(\d+)\]/g);
        
        if (createdBlockMatches) {
            console.log(`✅ Found ${createdBlockMatches.length} blocks created by orderer:`);
            createdBlockMatches.forEach(match => {
                const blockNum = match.match(/\[(\d+)\]/)[1];
                console.log(`   Block [${blockNum}]`);
            });
        }
        
        // Check what types of blocks they are
        console.log('\n📊 Analyzing block types from orderer logs:\n');
        
        // Block 0: Genesis block (always config)
        console.log('Block 0: Genesis block (CONFIG)');
        
        // Block 1-2: Usually config blocks (channel setup)
        console.log('Block 1-2: Likely CONFIG blocks (channel configuration)');
        
        // Block 3-5: Check if they're chaincode lifecycle or user transactions
        console.log('Block 3-5: Check if chaincode lifecycle or user transactions');
        
        // Now check if we have any records in the chaincode
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🔍 Checking chaincode for user records...\n');
        
        try {
            // Try to query chaincode for records
            const queryOutput = execSync(
                'docker exec peer0.org1.example.com peer chaincode query -C mychannel -n cdmscontract -c \'{"Args":["ListAllRecords"]}\' 2>&1',
                { encoding: 'utf8', timeout: 10000 }
            );
            
            if (queryOutput.includes('Error') || queryOutput.includes('error')) {
                console.log('⚠️  Could not query chaincode (might be RBAC issue or no records)');
            } else {
                const records = queryOutput.trim();
                if (records && records !== '[]' && records !== 'null') {
                    console.log(`✅ Found records in chaincode:`);
                    console.log(records.substring(0, 500));
                    console.log('\n✅ YES! User transactions ARE in the blockchain!');
                } else {
                    console.log('⚠️  No records found in chaincode');
                    console.log('   This means no user transactions (CreateRecord) have been submitted yet');
                }
            }
        } catch (queryErr) {
            console.log('⚠️  Could not query chaincode:', queryErr.message);
            console.log('   This might mean:');
            console.log('   - No records have been created yet');
            console.log('   - RBAC permissions issue');
            console.log('   - Chaincode query is failing');
        }
        
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📊 Summary:');
        console.log(`   📦 Total blocks: ${height}`);
        console.log(`   ✅ Blocks 0-2: Genesis and config blocks (orderer)`);
        console.log(`   ❓ Blocks 3-5: Need to check if user transactions or chaincode lifecycle`);
        
        console.log('\n💡 To verify user transactions:');
        console.log('   1. Try uploading a file through the frontend');
        console.log('   2. Check backend logs for "Record created on blockchain"');
        console.log('   3. Check if a new block is created after upload');
        console.log('   4. Query chaincode for records');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    }
}

inspectBlocks();

