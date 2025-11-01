// setup-test-admin.js - Set up a test admin with known credentials
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const TEST_ADMIN = {
    username: 'adminA',
    email: 'admin@cdms.local',
    password: 'Admin@123',  // Clear password for testing
    role: 'admin',
    org: 'A'
};

async function setupTestAdmin() {
    try {
        console.log('Setting up test admin user...\n');
        console.log('Test Admin Credentials:');
        console.log('========================');
        console.log(`Email:    ${TEST_ADMIN.email}`);
        console.log(`Password: ${TEST_ADMIN.password}`);
        console.log(`Role:     ${TEST_ADMIN.role}`);
        console.log(`Org:      ${TEST_ADMIN.org}`);
        console.log('========================\n');
        
        // Hash the password
        const hashedPassword = await bcrypt.hash(TEST_ADMIN.password, 10);
        
        // Read approved users
        const approvedPath = path.join(__dirname, 'approved_users.json');
        let approved = [];
        
        if (fs.existsSync(approvedPath)) {
            approved = JSON.parse(fs.readFileSync(approvedPath, 'utf8'));
        }
        
        // Remove test admin if exists
        approved = approved.filter(u => u.email !== TEST_ADMIN.email);
        
        // Add test admin
        approved.push({
            email: TEST_ADMIN.email,
            username: TEST_ADMIN.username,
            password: hashedPassword,
            role: TEST_ADMIN.role,
            org: TEST_ADMIN.org
        });
        
        // Save
        fs.writeFileSync(approvedPath, JSON.stringify(approved, null, 2));
        
        console.log('✅ Test admin added to approved_users.json');
        console.log('\nNOTE: This admin uses the existing AdminOrg1 Fabric identity.');
        console.log('You can now login using the credentials above.\n');
        console.log('To test via API:');
        console.log('curl -X POST http://localhost:3000/login \\');
        console.log('  -H "Content-Type: application/json" \\');
        console.log(`  -d '{"email":"${TEST_ADMIN.email}","password":"${TEST_ADMIN.password}","org":"${TEST_ADMIN.org}"}'`);
        console.log('\nOr use the frontend at http://localhost:5173\n');
        
    } catch (error) {
        console.error('❌ Failed to setup test admin:', error.message);
        process.exit(1);
    }
}

setupTestAdmin();

