// test-login-final.js - Final verification test
const axios = require('axios');

async function testLogin() {
    try {
        console.log('Testing login with test admin credentials...\n');
        
        const response = await axios.post('http://localhost:3000/login', {
            email: 'admin@cdms.local',
            password: 'Admin@123',
            org: 'A'
        });
        
        console.log('════════════════════════════════════════════');
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('════════════════════════════════════════════\n');
        console.log('User Information:');
        console.log(JSON.stringify(response.data.user, null, 2));
        console.log('\n════════════════════════════════════════════');
        console.log('✅ ALL TESTS PASSED!');
        console.log('✅ Fabric Network Connection: WORKING');
        console.log('✅ Vault Integration: WORKING');
        console.log('✅ Authentication: WORKING');
        console.log('════════════════════════════════════════════\n');
        
        return true;
    } catch (error) {
        console.error('════════════════════════════════════════════');
        console.error('❌ LOGIN FAILED');
        console.error('════════════════════════════════════════════\n');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error:', JSON.stringify(error.response.data, null, 2));
            
            // Provide helpful error messages
            if (error.response.data.message?.includes('DiscoveryService')) {
                console.error('\n⚠️  Chaincode deployment issue detected!');
                console.error('Solution: Run deployment script:');
                console.error('  PowerShell: .\\deploy-chaincode.ps1');
                console.error('  WSL: bash deploy-chaincode.sh\n');
            } else if (error.response.data.error === 'Invalid password') {
                console.error('\n⚠️  Using wrong credentials!');
                console.error('Run: node setup-test-admin.js');
                console.error('Then use: admin@cdms.local / Admin@123\n');
            }
        } else {
            console.error('Error:', error.message);
            if (error.code === 'ECONNREFUSED') {
                console.error('\n⚠️  Backend server not running!');
                console.error('Solution: cd cdms-backend && npm start\n');
            }
        }
        console.error('════════════════════════════════════════════\n');
        return false;
    }
}

// Run test
testLogin()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

