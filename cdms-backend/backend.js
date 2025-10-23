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
        
        // Initialize storage system
        this.storage = new CDMSStorage({
            useMinio: config.useMinio || process.env.USE_MINIO === 'true',
            bucketName: config.bucketName || process.env.MINIO_BUCKET,
            localPath: this.filesPath
        });
    }

    async _ensureFilesDir() {
        try {
            await fs.access(this.filesPath);
        } catch {
            await fs.mkdir(this.filesPath, { recursive: true });
        }
    }

    // ============================================
    // VAULT KEY MANAGEMENT
    // ============================================

    /**
     * Initialize Vault transit engine (one-time setup)
     */
    async initVaultTransit() {
        try {
            // Enable transit secrets engine
            await axios.post(
                `${this.vaultAddr}/v1/sys/mounts/${this.vaultMountPath}`,
                { type: 'transit' },
                { headers: { 'X-Vault-Token': this.vaultToken } }
            );
            console.log(`✓ Vault transit engine enabled at ${this.vaultMountPath}`);
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.errors?.[0]?.includes('already in use')) {
                console.log(`✓ Vault transit engine already exists at ${this.vaultMountPath}`);
            } else {
                throw new Error(`Failed to enable Vault transit: ${err.message}`);
            }
        }

        // Create master encryption key (KEK)
        try {
            await axios.post(
                `${this.vaultAddr}/v1/${this.vaultMountPath}/keys/master-kek`,
                { type: 'aes256-gcm96' },
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
        return await this.storage.storeEncryptedFile(recordId, encryptedData, iv, authTag);
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
     * Get Fabric contract instance
     */
    async getContract(userId, org) {
        let orgName, ccpPath;
        
        if (org === 'Org1') {
            orgName = 'org1.example.com';
        } else if (org === 'Org2') {
            orgName = 'org2.example.com';
        } else {
            throw new Error(`Unknown organization: ${org}`);
        }

        ccpPath = path.resolve(
            __dirname,
            `../fabric-samples/test-network/organizations/peerOrganizations/${orgName}/connection-${orgName}.json`
        );
        
        const ccp = JSON.parse(await fs.readFile(ccpPath, 'utf8'));
        const wallet = await Wallets.newFileSystemWallet(this.walletPath);

        const identity = await wallet.get(userId);
        if (!identity) {
            throw new Error(`Identity ${userId} does not exist in wallet`);
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: userId,
            discovery: { enabled: true, asLocalhost: true }
        });

        const network = await gateway.getNetwork(this.channelName);
        const contract = network.getContract(this.contractName);

        return { contract, gateway };
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
                recordId: result.toString(),
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
            // Note: You may need to add GetAuditTrail method to chaincode
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
            vaultToken: 'your-vault-token-here'
        });

        // Initialize Vault (one-time)
        await backend.initVaultTransit();

        console.log('CDMS Backend initialized and ready');
    })();
}