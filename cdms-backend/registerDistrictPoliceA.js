// registerDistrictPoliceA.js
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function getCAAndWallet() {
  const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network',
    'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
  const caTLSCACerts = caInfo.tlsCACerts.pem;
  const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

  const walletPath = path.join(__dirname, 'wallet');
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  return { ca, wallet, ccp };
}

async function registerAdmin() {
  const { ca, wallet } = await getCAAndWallet();

  const adminExists = await wallet.get('AdminOrg1');
  if (adminExists) {
    console.log('✅ AdminOrg1 already exists in wallet');
    return;
  }

  const enrollment = await ca.enroll({
    enrollmentID: 'admin',
    enrollmentSecret: 'adminpw'
  });

  const x509Identity = {
    credentials: {
      certificate: enrollment.certificate,
      privateKey: enrollment.key.toBytes(),
    },
    mspId: 'Org1MSP',
    type: 'X.509',
  };

  await wallet.put('AdminOrg1', x509Identity);
  console.log('✅ Successfully enrolled AdminOrg1 and imported it into the wallet');
}

async function registerUser(username, enrollmentID, role, organization) {
  try {
    console.log(`\n--- Registering ${username} for Org1 (${organization}) ---`);
    const { ca, wallet } = await getCAAndWallet();

    const adminIdentity = await wallet.get('AdminOrg1');
    if (!adminIdentity) throw new Error('❌ AdminOrg1 not found in wallet. Run registerAdmin first.');

    const userExists = await wallet.get(username);
    if (userExists) {
      console.log(`ℹ️ Identity "${username}" already exists in wallet`);
      return;
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'AdminOrg1');

    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID,
      role: 'client',
      attrs: [
        { name: 'role', value: role, ecert: true },
        { name: 'organization', value: organization, ecert: true }
      ]
    }, adminUser);

    const enrollment = await ca.enroll({ enrollmentID, enrollmentSecret: secret });

    const identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put(username, identity);
    console.log(`✅ ${username} successfully enrolled and added to wallet`);
  } catch (err) {
    console.error(`❌ Failed to register ${username}:`, err);
    throw err;
  }
}

// CLI usage
(async () => {
  const args = process.argv.slice(2);
  if (args[0] === 'admin') {
    await registerAdmin();
  } else if (args.length === 3) {
    const [username, role, organization] = args;
    const enrollmentID = username.toLowerCase(); // could also be email if preferred
    await registerUser(username, enrollmentID, role, organization);
  } else {
    console.log(`
Usage:
  node registerDistrictPoliceA.js admin
  node registerDistrictPoliceA.js <username> <role> <organization>

Examples:
  node registerDistrictPoliceA.js ForensicsOfficerA forensics_officer DistrictPoliceA
  node registerDistrictPoliceA.js InvestigatorA investigator DistrictPoliceA
`);
  }
})();
