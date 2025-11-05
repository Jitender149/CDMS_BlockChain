// List all identities in the Fabric wallet
const { Wallets } = require('fabric-network');
const path = require('path');

async function listIdentities() {
    try {
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        
        const identities = await wallet.list();
        
        console.log('📋 Wallet Identities:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (identities && identities.length > 0) {
            console.log(`✅ Found ${identities.length} identity(ies):\n`);
            
            for (const identityName of identities) {
                const identity = await wallet.get(identityName);
                if (identity) {
                    console.log(`   ✅ ${identityName}`);
                    console.log(`      MSP ID: ${identity.mspId}`);
                    console.log(`      Type: ${identity.type}`);
                    console.log('');
                }
            }
            
            // Check for AdminOrg2 specifically
            const adminOrg2 = await wallet.get('AdminOrg2');
            if (adminOrg2) {
                console.log('✅ AdminOrg2 identity is present in wallet!');
            } else {
                console.log('❌ AdminOrg2 identity is NOT in wallet');
            }
        } else {
            console.log('❌ No identities found in wallet');
            console.log('\n💡 To enroll identities:');
            console.log('   node enrollAdminA.js  (for AdminOrg1)');
            console.log('   node enrollAdminB.js  (for AdminOrg2)');
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
    } catch (error) {
        console.error('❌ Error listing wallet identities:', error.message);
        process.exit(1);
    }
}

listIdentities();

