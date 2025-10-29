// backend.js
'use strict';

const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const CDMSStorage = require('./storage');

class CDMSBackend {
    constructor(config = {}) {
        this.walletPath = config.walletPath || path.join(__dirname, 'wallet');
        this.filesPath = config.filesPath || path.join(__dirname, 'files');
        this.channelName = config.channelName || 'mychannel';
        this.contractName = config.contractName || 'cdmscontract';
        
        // Vault configuration
        this.vaultAddr = config.vaultAddr || process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
        this.vaultToken = config.vaultToken || process.env.VAULT_TOKEN;
        this.vaultMountPath = config.vaultMountPath || 'cdms-kms';
        
        // Validate Vault configuration
        if (!this.vaultToken) {
            throw new Error('Vault token is required. Set VAULT_TOKEN environment variable or pass vaultToken in config');
        }
        
        // Ensure files directory exists
        this._ensureFilesDir();
    }

    async _ensureFilesDir() {
        try {
            await fs.access(this.filesPath);
        } catch {
            await fs.mkdir(this.filesPath, { recursive: true });
        }
    }

    // ============================================
    // VAULT HEALTH CHECK
    // ============================================

    /**
     * Check Vault connectivity and authentication
     */
    async checkVaultHealth() {
        try {
            const response = await axios.get(
                `${this.vaultAddr}/v1/sys/health`,
                { 
                    headers: { 'X-Vault-Token': this.vaultToken },
                    validateStatus: () => true // Accept any status
                }
            );
            
            if (response.status === 200) {
                console.log('✓ Vault is initialized, unsealed, and active');
                return { healthy: true, sealed: false, initialized: true };
            } else if (response.status === 429) {
                console.log('⚠ Vault is unsealed and in standby mode');
                return { healthy: true, sealed: false, initialized: true };
            } else if (response.status === 501) {
                console.log('✗ Vault is not initialized');
                return { healthy: false, sealed: true, initialized: false };
            } else if (response.status === 503) {
                console.log('✗ Vault is sealed');
                return { healthy: false, sealed: true, initialized: true };
            }
            
            return { healthy: false, error: 'Unknown status' };
        } catch (err) {
            throw new Error(`Cannot connect to Vault at ${this.vaultAddr}: ${err.message}`);
        }
    }

    // ============================================
    // VAULT KEY MANAGEMENT
    // ============================================

    /**
     * Initialize Vault transit engine (one-time setup)
     */
    async initVaultTransit() {
        // Check Vault health first
        const health = await this.checkVaultHealth();
        if (!health.healthy) {
            throw new Error('Vault is not ready. Please ensure Vault is initialized and unsealed.');
        }

        try {
            // Enable transit secrets engine
            await axios.post(
                `${this.vaultAddr}/v1/sys/mounts/${this.vaultMountPath}`,
                { type: 'transit' },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );
            console.log(`✓ Vault transit engine enabled at ${this.vaultMountPath}`);
        } catch (err) {
            if (err.response?.status === 400 && (
            err.response?.data?.errors?.[0]?.includes('already in use') ||
            err.response?.data?.errors?.[0]?.includes('path is already in use')
        )) {
            console.log(`✓ Vault transit engine already exists at ${this.vaultMountPath}`);
        }
 else {
                throw new Error(`Failed to enable Vault transit: ${err.message}`);
            }
        }

        // Create master encryption key (KEK)
        try {
            await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/keys/master-kek`,
                { 
                    type: 'aes256-gcm96',
                    exportable: false, // Key cannot be exported
                    allow_plaintext_backup: false // Enhanced security
                },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );
            console.log('✓ Master KEK created in Vault');
        } catch (err) {
            if (err.response?.status === 400) {
                console.log('✓ Master KEK already exists');
            } else {
                throw new Error(`Failed to create KEK: ${err.message}`);
            }
        }

        // Enable key rotation policy (optional but recommended)
        try {
            await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/keys/master-kek/config`,
                { 
                    auto_rotate_period: '2160h' // 90 days
                },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );
            console.log('✓ Auto-rotation policy set (90 days)');
        } catch (err) {
            console.warn('⚠ Could not set auto-rotation policy:', err.message);
        }
    }

    /**
     * Generate a Data Encryption Key (DEK) for a record
     * Returns both plaintext and Vault-wrapped versions
     */
    async generateRecordKey(recordId) {
        // Generate random 256-bit key
        const dek = crypto.randomBytes(32);
        const dekBase64 = dek.toString('base64');

        // Wrap DEK with Vault's KEK
        try {
            const response = await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/encrypt/master-kek`,
                { 
                    plaintext: dekBase64,
                    context: Buffer.from(recordId).toString('base64') // Additional authenticated data
                },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );

            return {
                dek: dek, // plaintext key (use immediately, don't store)
                wrappedKey: response.data.data.ciphertext, // store this
                keyId: `vault:${this.vaultMountPath}/master-kek:${recordId}`
            };
        } catch (err) {
            throw new Error(`Failed to wrap key with Vault: ${err.message}`);
        }
    }

    /**
     * Unwrap a wrapped DEK using Vault
     */
    async unwrapRecordKey(wrappedKey, recordId) {
        try {
            const response = await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/decrypt/master-kek`,
                { 
                    ciphertext: wrappedKey,
                    context: Buffer.from(recordId).toString('base64')
                },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );

            const dekBase64 = response.data.data.plaintext;
            return Buffer.from(dekBase64, 'base64');
        } catch (err) {
            throw new Error(`Failed to unwrap key from Vault: ${err.message}`);
        }
    }

    /**
     * Rotate the master KEK (forces re-wrap of all DEKs)
     */
    async rotateKEK() {
        try {
            await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/keys/master-kek/rotate`,
                {},
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );
            console.log('✓ Master KEK rotated successfully');
            return { success: true };
        } catch (err) {
            throw new Error(`Failed to rotate KEK: ${err.message}`);
        }
    }

    /**
     * Rewrap a DEK with the latest KEK version (after rotation)
     */
    async rewrapRecordKey(wrappedKey, recordId) {
        try {
            const response = await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/rewrap/master-kek`,
                { 
                    ciphertext: wrappedKey,
                    context: Buffer.from(recordId).toString('base64')
                },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );

            return response.data.data.ciphertext;
        } catch (err) {
            throw new Error(`Failed to rewrap key: ${err.message}`);
        }
    }

    // ============================================
    // FILE ENCRYPTION & STORAGE
    // ============================================

    /**
     * Encrypt file using AES-256-GCM
     * Returns: { encryptedData, iv, authTag, fileHash }
     */
    encryptFile(fileBuffer, dek) {
        const iv = crypto.randomBytes(12); // 96-bit IV for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
        
        const encrypted = Buffer.concat([
            cipher.update(fileBuffer),
            cipher.final()
        ]);
        
        const authTag = cipher.getAuthTag();
        
        // Calculate SHA-256 hash of original file
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        return {
            encryptedData: encrypted,
            iv: iv,
            authTag: authTag,
            fileHash: `sha256:${fileHash}`
        };
    }

    /**
     * Decrypt file using AES-256-GCM
     */
    decryptFile(encryptedBuffer, dek, iv, authTag) {
        try {
            const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
            decipher.setAuthTag(authTag);
            
            const decrypted = Buffer.concat([
                decipher.update(encryptedBuffer),
                decipher.final()
            ]);
            
            return decrypted;
        } catch (err) {
            throw new Error(`Decryption failed: ${err.message}`);
        }
    }

    /**
     * Store encrypted file using storage system
     */
    async storeEncryptedFile(recordId, encryptedData, iv, authTag) {
        const metadata = {
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            timestamp: new Date().toISOString()
        };
        
        // Store encrypted file
        const filePath = path.join(this.filesPath, `${recordId}.enc`);
        await fs.writeFile(filePath, encryptedData);
        
        // Store metadata separately
        const metaPath = path.join(this.filesPath, `${recordId}.meta.json`);
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2));
        
        return `file://${this.filesPath}/${recordId}.enc`;
    }

    /**
     * Retrieve encrypted file using storage system
     */
    async retrieveEncryptedFile(recordId) {
        return await this.storage.retrieveEncryptedFile(recordId);
    }

    // ============================================
    // BLOCKCHAIN INTERACTION
    // ============================================

   /**
 * Get Fabric contract instance (supports DistrictPoliceA & DistrictPoliceB)
 */
async getContract(userId, org) {
    let orgName, orgLabel, ccpPath, mspId;

    // Normalize org argument
    if (org === 'DistrictPoliceA' || org === 'Org1' || org === 'A') {
        orgName = 'org1.example.com';
        orgLabel = 'Org1';
        mspId = 'Org1MSP';
    } else if (org === 'DistrictPoliceB' || org === 'Org2' || org === 'B') {
        orgName = 'org2.example.com';
        orgLabel = 'Org2';
        mspId = 'Org2MSP';
    } else {
        throw new Error(`Unknown organization: ${org}`);
    }

    // Load the corresponding connection profile
    ccpPath = path.resolve(
        __dirname,
        `../fabric-samples/test-network/organizations/peerOrganizations/${orgName}/connection-${orgLabel.toLowerCase()}.json`
    );


    const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
    const wallet = await Wallets.newFileSystemWallet(this.walletPath);

    const identity = await wallet.get(userId);
    if (!identity) {
        throw new Error(`Identity "${userId}" does not exist in wallet for ${orgLabel}`);
    }

    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true }
    });

    const network = await gateway.getNetwork(this.channelName);
    const contract = network.getContract(this.contractName);

    console.log(`✅ Connected to Fabric network as ${userId} from ${orgLabel}`);

    return { contract, gateway, mspId };
}

    


    // ============================================
    // HIGH-LEVEL OPERATIONS
    // ============================================

    /**
     * Upload a new record (file + metadata to blockchain)
     */
    async uploadRecord(userId, org, fileBuffer, metadata) {
        const recordId = metadata.record_id || uuidv4();
        
        try {
            // 1. Generate and wrap encryption key
            console.log(`[${recordId}] Generating encryption key...`);
            const { dek, wrappedKey, keyId } = await this.generateRecordKey(recordId);

            // 2. Encrypt file
            console.log(`[${recordId}] Encrypting file...`);
            const { encryptedData, iv, authTag, fileHash } = this.encryptFile(fileBuffer, dek);

            // 3. Store encrypted file
            console.log(`[${recordId}] Storing encrypted file...`);
            const offchainUri = await this.storeEncryptedFile(recordId, encryptedData, iv, authTag);

            // 4. Prepare blockchain record
            const blockchainRecord = {
                record_id: recordId,
                case_id: metadata.case_id,
                record_type: metadata.record_type || 'Evidence',
                uploader_org: metadata.uploader_org || org,
                offchain_uri: offchainUri,
                file_hash: fileHash,
                wrapped_key_ref: wrappedKey,
                policy_id: metadata.policy_id || 'default-policy',
                filename: metadata.filename,
                file_size: fileBuffer.length,
                mime_type: metadata.mime_type
            };

            // 5. Submit to blockchain
            console.log(`[${recordId}] Submitting to blockchain...`);
            const { contract, gateway } = await this.getContract(userId, org);
            
            const result = await contract.submitTransaction(
                'CreateRecord',
                JSON.stringify(blockchainRecord)
            );
            
            await gateway.disconnect();

            console.log(`[${recordId}] ✓ Upload complete`);
            
            return {
                recordId: recordId,
                fileHash,
                offchainUri,
                status: 'success'
            };

        } catch (err) {
            console.error(`[${recordId}] Upload failed:`, err.message);
            throw new Error(`Upload failed: ${err.message}`);
        }
    }

    /**
     * Download a record (retrieve from blockchain + decrypt file)
     */
    async downloadRecord(userId, org, recordId) {
        try {
            // 1. Fetch metadata from blockchain
            console.log(`[${recordId}] Fetching metadata from blockchain...`);
            const { contract, gateway } = await this.getContract(userId, org);
            
            const metadataResult = await contract.evaluateTransaction('ReadRecord', recordId);
            const metadata = JSON.parse(metadataResult.toString());
            
            await gateway.disconnect();

            // 2. Retrieve encrypted file
            console.log(`[${recordId}] Retrieving encrypted file...`);
            const { encryptedData, iv, authTag } = await this.retrieveEncryptedFile(recordId);

            // 3. Unwrap decryption key from Vault
            console.log(`[${recordId}] Unwrapping decryption key...`);
            const dek = await this.unwrapRecordKey(metadata.wrapped_key_ref, recordId);

            // 4. Decrypt file
            console.log(`[${recordId}] Decrypting file...`);
            const decryptedFile = this.decryptFile(encryptedData, dek, iv, authTag);

            // 5. Verify file hash
            const computedHash = `sha256:${crypto.createHash('sha256').update(decryptedFile).digest('hex')}`;
            if (computedHash !== metadata.file_hash) {
                throw new Error('File integrity check failed: hash mismatch');
            }

            console.log(`[${recordId}] ✓ Download complete`);

            return {
                file: decryptedFile,
                metadata: {
                    filename: metadata.filename,
                    mime_type: metadata.mime_type,
                    file_size: metadata.file_size,
                    created_at: metadata.created_at,
                    uploader: metadata.uploader
                }
            };

        } catch (err) {
            console.error(`[${recordId}] Download failed:`, err.message);
            throw new Error(`Download failed: ${err.message}`);
        }
    }

    /**
     * List records by case
     */
    async listRecordsByCase(userId, org, caseId) {
        try {
            const { contract, gateway } = await this.getContract(userId, org);
            const result = await contract.evaluateTransaction('QueryRecordsByCase', caseId);
            await gateway.disconnect();
            
            return JSON.parse(result.toString());
        } catch (err) {
            throw new Error(`Failed to list records: ${err.message}`);
        }
    }

    /**
     * Create a policy
     */
    async createPolicy(userId, org, policyId, policyData) {
        try {
            const { contract, gateway } = await this.getContract(userId, org);
            const result = await contract.submitTransaction(
                'CreatePolicy',
                policyId,
                JSON.stringify(policyData)
            );
            await gateway.disconnect();
            
            return result.toString();
        } catch (err) {
            throw new Error(`Failed to create policy: ${err.message}`);
        }
    }

    /**
     * Get audit trail for a record
     */
    async getAuditTrail(userId, org, recordId) {
        try {
            const { contract, gateway } = await this.getContract(userId, org);
            const result = await contract.evaluateTransaction('GetAuditTrail', recordId);
            await gateway.disconnect();
            
            return JSON.parse(result.toString());
        } catch (err) {
            throw new Error(`Failed to get audit trail: ${err.message}`);
        }
    }
}

module.exports = CDMSBackend;

// Example usage:
if (require.main === module) {
    (async () => {
        const backend = new CDMSBackend({
            vaultAddr: 'http://127.0.0.1:8200',
            vaultToken: process.env.VAULT_TOKEN
        });

        // Check Vault health
        await backend.checkVaultHealth();

        // Initialize Vault (one-time)
        await backend.initVaultTransit();

        console.log('CDMS Backend initialized and ready');
    })();
}