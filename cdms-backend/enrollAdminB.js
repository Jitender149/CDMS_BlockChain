'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function enrollAdminB() {
    try {
        // Load Org2 connection profile
        const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network',
            'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client
        const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
        const ca = new FabricCAServices(caInfo.url);

        // Create wallet
        const walletPath = path.join(__dirname, 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check if admin already exists
        const identity = await wallet.get('AdminOrg2');
        if (identity) {
            console.log('An identity for the admin user "AdminOrg2" already exists in the wallet');
            return;
        }

        // Enroll admin user
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
        console.log('✅ Successfully enrolled admin user "AdminOrg2" and imported it into the wallet');
    } catch (error) {
        console.error(`Failed to enroll admin user "AdminOrg2": ${error}`);
        process.exit(1);
    }
}

enrollAdminB();
