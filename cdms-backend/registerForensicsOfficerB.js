// registerForensicsOfficerB.js
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function registerForensicsOfficerB() {
  try {
    console.log('\n--- Registering Forensics Officer for Org2 (DistrictPoliceB) ---');

    const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network',
      'organizations', 'peerOrganizations', 'org2.example.com', 'connection-org2.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const userIdentity = await wallet.get('ForensicsOfficerA');
    if (userIdentity) {
      console.log('Identity "ForensicsOfficerA" already exists in wallet');
      return;
    }

    const adminIdentity = await wallet.get('AdminOrg2');
    if (!adminIdentity) throw new Error('AdminOrg2 not found in wallet');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'AdminOrg2');

    const secret = await ca.register({
      affiliation: 'org2.department1',
      enrollmentID: 'forensicsB',
      role: 'client',
      attrs: [
        { name: 'role', value: 'forensics_officer', ecert: true },
        { name: 'organization', value: 'DistrictPoliceB', ecert: true }
      ]
    }, adminUser);

    const enrollment = await ca.enroll({ enrollmentID: 'forensicsB', enrollmentSecret: secret });
    const identity = {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: 'Org2MSP',
      type: 'X.509',
    };
    await wallet.put('ForensicsOfficerB', identity);

    console.log('✅ ForensicsOfficerB enrolled and added to wallet');
  } catch (error) {
    console.error(`❌ Failed to register ForensicsOfficerB: ${error}`);
    throw error;
  }
}

module.exports = registerForensicsOfficerB;
