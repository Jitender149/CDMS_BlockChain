const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function registerDistrictPoliceA() {
    try {
        // Load the connection profile for Org1 (District Police A)
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 
            'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for Org1
        const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // ==================== STEP 1: Enroll Admin for Org1 ====================
        console.log('\n--- Step 1: Enrolling Admin for Org1 ---');
        
        const adminIdentity = await wallet.get('AdminOrg1');
        if (adminIdentity) {
            console.log('Admin identity "AdminOrg1" already exists in the wallet');
        } else {
            // Enroll the admin user
            const adminEnrollment = await ca.enroll({ 
                enrollmentID: 'admin', 
                enrollmentSecret: 'adminpw' 
            });
            
            const adminX509Identity = {
                credentials: {
                    certificate: adminEnrollment.certificate,
                    privateKey: adminEnrollment.key.toBytes(),
                },
                mspId: 'Org1MSP',
                type: 'X.509',
            };
            
            await wallet.put('AdminOrg1', adminX509Identity);
            console.log('Successfully enrolled admin user "AdminOrg1" for Org1 and imported it into the wallet');
        }

        // ==================== STEP 2: Register and Enroll DistrictPoliceA ====================
        console.log('\n--- Step 2: Registering and Enrolling DistrictPoliceA User ---');
        
        // Check if District Police A user already exists
        const userIdentity = await wallet.get('DistrictPoliceA');
        if (userIdentity) {
            console.log('User identity "DistrictPoliceA" already exists in the wallet');
            return;
        }

        // Get admin identity for registration
        const adminIdentityForReg = await wallet.get('AdminOrg1');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentityForReg.type);
        const adminUser = await provider.getUserContext(adminIdentityForReg, 'AdminOrg1');

        // Register the user with the CA
        const secret = await ca.register({
            affiliation: 'org1.department1',
            enrollmentID: 'districtPoliceA',
            role: 'client',
            attrs: [
                { name: 'role', value: 'investigator', ecert: true },
                { name: 'organization', value: 'DistrictPoliceA', ecert: true }
            ]
        }, adminUser);

        console.log('Successfully registered user "districtPoliceA" with CA');

        // Enroll the user
        const userEnrollment = await ca.enroll({
            enrollmentID: 'districtPoliceA',
            enrollmentSecret: secret
        });

        // Create X.509 identity
        const userX509Identity = {
            credentials: {
                certificate: userEnrollment.certificate,
                privateKey: userEnrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Import identity into wallet
        await wallet.put('DistrictPoliceA', userX509Identity);
        console.log('Successfully enrolled user "DistrictPoliceA" for Org1 and imported it into the wallet');
        
        console.log('\n✅ All identities for District Police A (Org1) have been created successfully!');

    } catch (error) {
        console.error(`Failed to register District Police A: ${error}`);
        process.exit(1);
    }
}

registerDistrictPoliceA();