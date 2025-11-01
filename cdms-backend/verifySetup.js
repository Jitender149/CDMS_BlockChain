// verifySetup.js
// Diagnostic script to verify Fabric network setup before login

const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

const WALLET_PATH = path.join(__dirname, 'wallet');
const CCP_BASE_PATH = path.join(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations');

async function verifySetup() {
    console.log('\n🔍 CDMS Setup Verification\n');
    console.log('=' .repeat(60));

    // 1. Check wallet directory
    console.log('\n1. Checking Wallet Directory...');
    if (fs.existsSync(WALLET_PATH)) {
        console.log(`   ✅ Wallet directory exists: ${WALLET_PATH}`);
        const walletFiles = fs.readdirSync(WALLET_PATH);
        console.log(`   📁 Wallet contains ${walletFiles.length} identities:`);
        walletFiles.forEach(file => {
            if (file.endsWith('.id')) {
                const identityName = file.replace('.id', '');
                console.log(`      - ${identityName}`);
            }
        });
    } else {
        console.log(`   ❌ Wallet directory not found: ${WALLET_PATH}`);
    }

    // 2. Check connection profiles
    console.log('\n2. Checking Connection Profiles...');
    const org1CCP = path.join(CCP_BASE_PATH, 'org1.example.com', 'connection-org1.json');
    const org2CCP = path.join(CCP_BASE_PATH, 'org2.example.com', 'connection-org2.json');

    if (fs.existsSync(org1CCP)) {
        console.log(`   ✅ Org1 connection profile exists: ${org1CCP}`);
        try {
            const ccp = JSON.parse(fs.readFileSync(org1CCP, 'utf8'));
            console.log(`      - Channel: ${Object.keys(ccp.channels || {})[0] || 'Not found'}`);
            console.log(`      - Peers: ${Object.keys(ccp.peers || {}).length}`);
            console.log(`      - Orderers: ${Object.keys(ccp.orderers || {}).length}`);
        } catch (err) {
            console.log(`   ⚠️  Could not parse connection profile: ${err.message}`);
        }
    } else {
        console.log(`   ❌ Org1 connection profile not found: ${org1CCP}`);
    }

    if (fs.existsSync(org2CCP)) {
        console.log(`   ✅ Org2 connection profile exists: ${org2CCP}`);
    } else {
        console.log(`   ❌ Org2 connection profile not found: ${org2CCP}`);
    }

    // 3. Check environment variables
    console.log('\n3. Checking Environment Variables...');
    const required = ['CHANNEL_NAME', 'CONTRACT_NAME', 'VAULT_TOKEN'];
    required.forEach(key => {
        if (process.env[key]) {
            console.log(`   ✅ ${key} = ${key === 'VAULT_TOKEN' ? '***' : process.env[key]}`);
        } else {
            console.log(`   ⚠️  ${key} not set (check .env file)`);
        }
    });

    // 4. Check wallet identities
    console.log('\n4. Verifying Wallet Identities...');
    try {
        const wallet = await Wallets.newFileSystemWallet(WALLET_PATH);
        const identities = await wallet.list();

        if (identities && identities.length > 0) {
            console.log(`   ✅ Found ${identities.length} identities in wallet:`);
            identities.forEach(id => {
                console.log(`      - ${id}`);
            });

            // Check specific identities
            const requiredIds = ['AdminOrg1', 'AdminOrg2'];
            for (const id of requiredIds) {
                const identity = await wallet.get(id);
                if (identity) {
                    console.log(`      ✅ ${id} - Valid`);
                } else {
                    console.log(`      ❌ ${id} - Missing (run enrollAdminA.js or enrollAdminB.js)`);
                }
            }
        } else {
            console.log(`   ❌ No identities found in wallet`);
            console.log(`      Run: node enrollAdminA.js`);
            console.log(`      Run: node enrollAdminB.js`);
        }
    } catch (err) {
        console.log(`   ❌ Error accessing wallet: ${err.message}`);
    }

    // 5. Check Docker network
    console.log('\n5. Checking Docker Network...');
    const { execSync } = require('child_process');
    try {
        const dockerNetworks = execSync('docker network ls', { encoding: 'utf8' });
        if (dockerNetworks.includes('fabric_test')) {
            console.log(`   ✅ Fabric Docker network exists`);
        } else {
            console.log(`   ⚠️  Fabric Docker network not found (run ./network.sh up)`);
        }

        const dockerContainers = execSync('docker ps --format "{{.Names}}"', { encoding: 'utf8' });
        const containers = dockerContainers.split('\n').filter(c => c);
        const fabricContainers = containers.filter(c => 
            c.includes('peer') || c.includes('orderer') || c.includes('ca')
        );

        if (fabricContainers.length > 0) {
            console.log(`   ✅ Found ${fabricContainers.length} Fabric containers running:`);
            fabricContainers.forEach(c => console.log(`      - ${c}`));
        } else {
            console.log(`   ❌ No Fabric containers running (run ./network.sh up)`);
        }
    } catch (err) {
        console.log(`   ⚠️  Could not check Docker: ${err.message}`);
        console.log(`      (Docker might not be accessible from this environment)`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification complete!\n');
}

// Run verification
verifySetup().catch(err => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
});

