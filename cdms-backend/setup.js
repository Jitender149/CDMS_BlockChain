// setup.js
// CDMS Backend Setup and Initialization Script

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class CDMSSetup {
    constructor() {
        this.projectRoot = __dirname;
        this.walletPath = path.join(this.projectRoot, 'wallet');
        this.filesPath = path.join(this.projectRoot, 'files');
        this.logsPath = path.join(this.projectRoot, 'logs');
    }

    async run() {
        console.log('🚀 Starting CDMS Backend Setup...\n');

        try {
            await this.createDirectories();
            await this.checkDependencies();
            await this.setupEnvironment();
            await this.initializeVault();
            await this.registerUsers();
            await this.verifySetup();
            
            console.log('\n✅ CDMS Backend setup completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('1. Start the API server: npm start');
            console.log('2. Check health: curl http://localhost:3000/health');
            console.log('3. Verify Vault: curl http://localhost:3000/vault/status');
            console.log('4. Check storage: curl http://localhost:3000/storage/status');
            
        } catch (error) {
            console.error('\n❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async createDirectories() {
        console.log('📁 Creating required directories...');
        
        const directories = [
            this.walletPath,
            this.filesPath,
            this.logsPath
        ];

        for (const dir of directories) {
            try {
                await fs.access(dir);
                console.log(`   ✓ ${path.basename(dir)} directory exists`);
            } catch {
                await fs.mkdir(dir, { recursive: true });
                console.log(`   ✓ Created ${path.basename(dir)} directory`);
            }
        }
    }

    async checkDependencies() {
        console.log('\n📦 Checking dependencies...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        
        const requiredDeps = [
            'express',
            'fabric-network',
            'fabric-ca-client',
            'multer',
            'uuid',
            'axios',
            'cors',
            'dotenv'
        ];

        const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
        
        if (missingDeps.length > 0) {
            console.log(`   ⚠️  Missing dependencies: ${missingDeps.join(', ')}`);
            console.log('   Run: npm install to install missing dependencies');
        } else {
            console.log('   ✓ All required dependencies found');
        }
    }

    async setupEnvironment() {
        console.log('\n⚙️  Setting up environment...');
        
        const envExamplePath = path.join(this.projectRoot, 'env.example');
        const envPath = path.join(this.projectRoot, '.env');
        
        try {
            await fs.access(envPath);
            console.log('   ✓ .env file already exists');
        } catch {
            try {
                await fs.copyFile(envExamplePath, envPath);
                console.log('   ✓ Created .env file from template');
                console.log('   ⚠️  Please update .env file with your configuration');
            } catch {
                console.log('   ⚠️  Could not create .env file. Please create it manually.');
            }
        }
    }

    async initializeVault() {
        console.log('\n🔐 Initializing Vault...');
        
        try {
            // Check if Vault is running
            const { stdout } = await execAsync('curl -s http://127.0.0.1:8200/v1/sys/health || echo "Vault not running"');
            
            if (stdout.includes('Vault not running')) {
                console.log('   ⚠️  Vault is not running. Please start Vault first:');
                console.log('      vault server -dev');
                console.log('   Then set VAULT_TOKEN in your .env file');
            } else {
                console.log('   ✓ Vault is running');
            }
        } catch (error) {
            console.log('   ⚠️  Could not check Vault status');
        }
    }

    async registerUsers() {
        console.log('\n👥 Registering users...');
        
        const registrationScripts = [
            'registerDistrictPoliceA.js',
            'registerDistrictPoliceB.js',
            'registerForensicsOfficerA.js',
            'registerForensicsOfficerB.js',
            'registerInvestigatorA.js',
            'registerInvestigatorB.js'
        ];

        for (const script of registrationScripts) {
            const scriptPath = path.join(this.projectRoot, script);
            try {
                await fs.access(scriptPath);
                console.log(`   ✓ ${script} found`);
            } catch {
                console.log(`   ⚠️  ${script} not found`);
            }
        }

        console.log('   ℹ️  Run individual registration scripts as needed:');
        console.log('      node registerDistrictPoliceA.js');
        console.log('      node registerDistrictPoliceB.js');
        console.log('      node registerForensicsOfficerA.js');
        console.log('      node registerForensicsOfficerB.js');
        console.log('      node registerInvestigatorA.js');
        console.log('      node registerInvestigatorB.js');
    }

    async verifySetup() {
        console.log('\n🔍 Verifying setup...');
        
        // Check if wallet directory has identities
        try {
            const walletContents = await fs.readdir(this.walletPath);
            const identityFiles = walletContents.filter(file => file.endsWith('.id'));
            
            if (identityFiles.length > 0) {
                console.log(`   ✓ Found ${identityFiles.length} identity files in wallet`);
            } else {
                console.log('   ⚠️  No identity files found. Run user registration scripts.');
            }
        } catch {
            console.log('   ⚠️  Wallet directory not accessible');
        }

        // Check if files directory is writable
        try {
            const testFile = path.join(this.filesPath, 'test.txt');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            console.log('   ✓ Files directory is writable');
        } catch {
            console.log('   ⚠️  Files directory is not writable');
        }
    }

    async generateAPIKeys() {
        console.log('\n🔑 Generating API keys...');
        
        const crypto = require('crypto');
        const jwtSecret = crypto.randomBytes(64).toString('hex');
        const sessionSecret = crypto.randomBytes(32).toString('hex');
        
        console.log('   JWT_SECRET:', jwtSecret);
        console.log('   SESSION_SECRET:', sessionSecret);
        console.log('   ⚠️  Add these to your .env file');
    }

    async showSystemInfo() {
        console.log('\n📊 System Information:');
        
        try {
            const { stdout: nodeVersion } = await execAsync('node --version');
            console.log(`   Node.js: ${nodeVersion.trim()}`);
        } catch {
            console.log('   Node.js: Not found');
        }

        try {
            const { stdout: npmVersion } = await execAsync('npm --version');
            console.log(`   npm: ${npmVersion.trim()}`);
        } catch {
            console.log('   npm: Not found');
        }

        console.log(`   Platform: ${process.platform}`);
        console.log(`   Architecture: ${process.arch}`);
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    const setup = new CDMSSetup();
    setup.run().catch(console.error);
}

module.exports = CDMSSetup;
