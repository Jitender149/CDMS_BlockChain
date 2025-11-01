// test-direct-login.js - Direct backend connection test
const CDMSBackend = require('./backend');

async function testDirectConnection() {
    console.log('════════════════════════════════════════════');
    console.log('  Direct Backend Connection Test');
    console.log('════════════════════════════════════════════\n');
    
    try {
        console.log('Initializing backend...');
        const backend = new CDMSBackend({
            vaultAddr: 'http://127.0.0.1:8200',
            vaultToken: 'root'
        });
        
        console.log('Backend initialized');
        console.log(`Wallet path: ${backend.walletPath}`);
        console.log(`Channel: ${backend.channelName}`);
        console.log(`Contract: ${backend.contractName}`);
        console.log('');
        
        console.log('Attempting to connect to Fabric network...');
        console.log('Using identity: AdminOrg1');
        console.log('Organization: Org1');
        console.log('');
        
        const result = await backend.getContract('AdminOrg1', 'Org1');
        
        console.log('════════════════════════════════════════════');
        console.log('✅ SUCCESS! Connected to Fabric network!');
        console.log('════════════════════════════════════════════\n');
        console.log('Gateway connected');
        console.log('Network accessed');
        console.log('Contract obtained:', backend.contractName);
        console.log('');
        
        // Try a simple query to verify chaincode is working
        console.log('Testing chaincode query...');
        const queryResult = await result.contract.evaluateTransaction('ListAllRecords');
        const records = JSON.parse(queryResult.toString());
        console.log('✅ Chaincode is responding!');
        console.log(`   Found ${records.length} records`);
        console.log('');
        
        await result.gateway.disconnect();
        console.log('✅ Connection test PASSED');
        return true;
        
    } catch (error) {
        console.error('════════════════════════════════════════════');
        console.error('❌ CONNECTION FAILED');
        console.error('════════════════════════════════════════════\n');
        console.error('Error:', error.message);
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
        console.error('');
        
        if (error.message.includes('DiscoveryService')) {
            console.error('⚠️  Discovery Service Error');
            console.error('This usually means:');
            console.error('  1. Chaincode not deployed (but we just deployed it!)');
            console.error('  2. Backend code not restarted with fix');
            console.error('  3. Fabric network configuration issue');
            console.error('');
            console.error('Let\'s verify chaincode deployment:');
            console.error('  Run: docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel');
            console.error('');
        }
        
        return false;
    }
}

testDirectConnection()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

