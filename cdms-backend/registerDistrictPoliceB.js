
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function registerDistrictPoliceB() {
    try {
        // Load the connection profile for Org2 (District Police B)
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 
            'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
        
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for Org2
        const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        // Create wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check if District Police B user already exists
        const userIdentity = await wallet.get('DistrictPoliceB');
        if (userIdentity) {
            console.log('An identity for "DistrictPoliceB" already exists in the wallet');
            return;
        }

        // For Org2, we need to register Org2's admin first
        const adminIdentity = await wallet.get('AdminOrg2');
        if (!adminIdentity) {
            console.log('AdminOrg2 identity does not exist. Enrolling Org2 admin first...');
            
            // Enroll Org2 admin
            const enrollment = await ca.enroll({ 
                enrollmentID: 'admin', 
                enrollmentSecret: 'adminpw' 
            });
            
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes(),
                },
                mspId: 'Org2MSP',
                type: 'X.509',
            };
            
            await wallet.put('AdminOrg2', x509Identity);
            console.log('Successfully enrolled admin user "AdminOrg2" for Org2');
        }

        // Get admin identity for registration
        const adminIdentityOrg2 = await wallet.get('AdminOrg2');
        const provider = wallet.getProviderRegistry().getProvider(adminIdentityOrg2.type);
        const adminUser = await provider.getUserContext(adminIdentityOrg2, 'AdminOrg2');

        // Register the user with the CA
        const secret = await ca.register({
            affiliation: 'org2.department1',
            enrollmentID: 'districtPoliceB',
            role: 'client',
            attrs: [
                { name: 'role', value: 'investigator', ecert: true },
                { name: 'organization', value: 'DistrictPoliceB', ecert: true }
            ]
        }, adminUser);

        // Enroll the user
        const enrollment = await ca.enroll({
            enrollmentID: 'districtPoliceB',
            enrollmentSecret: secret
        });

        // Create X.509 identity
        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org2MSP',
            type: 'X.509',
        };

        // Import identity into wallet
        await wallet.put('DistrictPoliceB', x509Identity);
        console.log('Successfully registered and enrolled user "DistrictPoliceB" for Org2 and imported it into the wallet');

    } catch (error) {
        console.error(`Failed to register user "DistrictPoliceB": ${error}`);
        process.exit(1);
    }
}

registerDistrictPoliceB();