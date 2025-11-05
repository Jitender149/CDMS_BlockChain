// add-org2-admin.js - Add Org2 admin user to approved_users.json
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function addOrg2Admin() {
    try {
        const ORG2_ADMIN = {
            username: 'admin2',
            email: 'example2@gmail.com',
            password: 'pass',  // Plain password
            role: 'admin',
            org: 'B'  // Org2 (Org1 is 'A')
        };

        console.log('Adding Org2 admin user...\n');
        console.log('Org2 Admin Credentials:');
        console.log('========================');
        console.log(`Email:    ${ORG2_ADMIN.email}`);
        console.log(`Password: ${ORG2_ADMIN.password}`);
        console.log(`Username: ${ORG2_ADMIN.username}`);
        console.log(`Role:     ${ORG2_ADMIN.role}`);
        console.log(`Org:      ${ORG2_ADMIN.org} (Org2)`);
        console.log(`WalletId: AdminOrg2`);
        console.log('========================\n');

        // Hash the password
        const hashedPassword = await bcrypt.hash(ORG2_ADMIN.password, 10);
        console.log('✅ Password hashed successfully');

        // Read approved users
        const approvedPath = path.join(__dirname, 'approved_users.json');
        let approved = [];

        if (fs.existsSync(approvedPath)) {
            approved = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
        }

        // Remove existing Org2 admin if exists
        approved = approved.filter(u => u.email !== ORG2_ADMIN.email);

        // Add Org2 admin
        approved.push({
            username: ORG2_ADMIN.username,
            email: ORG2_ADMIN.email,
            password: hashedPassword,
            role: ORG2_ADMIN.role,
            org: ORG2_ADMIN.org,
            walletId: 'AdminOrg2'  // Uses AdminOrg2 Fabric identity
        });

        // Save
        fs.writeFileSync(approvedPath, JSON.stringify(approved, null, 2));
        console.log('✅ Org2 admin added to approved_users.json\n');

        console.log('Summary:');
        console.log('--------');
        console.log('✅ Email: example2@gmail.com');
        console.log('✅ Password: pass');
        console.log('✅ Organization: B (Org2)');
        console.log('✅ Wallet Identity: AdminOrg2');
        console.log('✅ Role: admin');
        console.log('\nYou can now login using these credentials!\n');

    } catch (error) {
        console.error('❌ Failed to add Org2 admin:', error.message);
        process.exit(1);
    }
}

addOrg2Admin();

