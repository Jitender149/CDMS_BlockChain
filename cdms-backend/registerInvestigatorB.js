// registerInvestigatorB.js
const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

/**
 * Registers and enrolls a new Investigator for Org2 (DistrictPoliceB)
 * @param {string} email - Unique email of the investigator (used as enrollmentID)
 */
async function registerInvestigatorB(email) {
  try {
    console.log(`\n--- Registering Investigator for Org2 (DistrictPoliceB): ${email} ---`);

    // ✅ Load connection profile for Org2
    const ccpPath = path.resolve(
      __dirname,
      '..',
      'fabric-samples',
      'test-network',
      'organizations',
      'peerOrganizations',
      'org2.example.com',
      'connection-org2.json'
    );
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // ✅ Create CA client for Org2
    const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
    const caTLSCACerts = caInfo.tlsCACerts.pem;
    const ca = new FabricCAServices(
      caInfo.url,
      { trustedRoots: caTLSCACerts, verify: false },
      caInfo.caName
    );

    // ✅ Create wallet
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    // ✅ Check if the identity already exists
    const userIdentity = await wallet.get(email);
    if (userIdentity) {
      console.log(`⚠️ Identity for ${email} already exists in the wallet`);
      return;
    }

    // ✅ Get admin identity for Org2
    const adminIdentity = await wallet.get('AdminOrg2');
    if (!adminIdentity) {
      throw new Error('❌ AdminOrg2 not found in wallet. Please enroll admin first.');
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'AdminOrg2');

    // ✅ Register the new investigator (email = enrollmentID)
    const secret = await ca.register(
      {
        affiliation: 'org2.department1',
        enrollmentID: email,
        role: 'client',
        attrs: [
          { name: 'role', value: 'investigator', ecert: true },
          { name: 'organization', value: 'DistrictPoliceB', ecert: true },
          { name: 'email', value: email, ecert: true },
        ],
      },
      adminUser
    );

    // ✅ Enroll the new investigator
    const enrollment = await ca.enroll({
      enrollmentID: email,
      enrollmentSecret: secret,
    });

    // ✅ Create and store identity
    const identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org2MSP',
      type: 'X.509',
    };

    await wallet.put(email, identity);
    console.log(`✅ Successfully registered and enrolled Investigator (${email}) for Org2`);
  } catch (error) {
    console.error(`❌ Failed to register InvestigatorB: ${error}`);
    throw error;
  }
}

// Run via command line for testing
// Example: node registerInvestigatorB.js investigatorB@example.com
if (require.main === module) {
  const email = process.argv[2];
  if (!email) {
    console.error('❌ Please provide an email. Usage: node registerInvestigatorB.js investigatorB@example.com');
    process.exit(1);
  }
  registerInvestigatorB(email);
}

module.exports = registerInvestigatorB;
