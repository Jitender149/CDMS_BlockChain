// registerForensicsOfficerA.js
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function registerForensicsOfficerA() {
  try {
    console.log('\n--- Registering Forensics Officer for Org1 (DistrictPoliceA) ---');

    const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network',
      'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const userIdentity = await wallet.get('ForensicsOfficerA');
    if (userIdentity) {
      console.log('Identity "ForensicsOfficerA" already exists in wallet');
      return;
    }

    const adminIdentity = await wallet.get('AdminOrg1');
    if (!adminIdentity) throw new Error('AdminOrg1 not found in wallet');
    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'AdminOrg1');

    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID: 'forensicsA',
      role: 'client',
      attrs: [
        { name: 'role', value: 'forensics_officer', ecert: true },
        { name: 'organization', value: 'DistrictPoliceA', ecert: true }
      ]
    }, adminUser);

    const enrollment = await ca.enroll({ enrollmentID: 'forensicsA', enrollmentSecret: secret });
    const identity = {
      credentials: { certificate: enrollment.certificate, privateKey: enrollment.key.toBytes() },
      mspId: 'Org1MSP',
      type: 'X.509',
    };
    await wallet.put('ForensicsOfficerA', identity);

    console.log('✅ ForensicsOfficerA enrolled and added to wallet');
  } catch (error) {
    console.error(`❌ Failed to register ForensicsOfficerA: ${error}`);
    throw error;
  }
}

module.exports = registerForensicsOfficerA;
