// storage.js
// File storage implementation using MinIO (S3-compatible object storage)

const Minio = require('minio');
const fs = require('fs').promises;
const path = require('path');

class CDMSStorage {
    constructor(config = {}) {
        this.minioClient = null;
        this.useMinio = config.useMinio || process.env.USE_MINIO === 'true';
        this.bucketName = config.bucketName || process.env.MINIO_BUCKET || 'cdms-files';
        this.localPath = config.localPath || process.env.FILES_PATH || './files';
        
        if (this.useMinio) {
            this.minioClient = new Minio.Client({
                endPoint: config.endPoint || process.env.MINIO_ENDPOINT || 'localhost',
                port: parseInt(config.port || process.env.MINIO_PORT || 9000),
                useSSL: config.useSSL || process.env.MINIO_USE_SSL === 'true',
                accessKey: config.accessKey || process.env.MINIO_ACCESS_KEY || 'minioadmin',
                secretKey: config.secretKey || process.env.MINIO_SECRET_KEY || 'minioadmin'
            });
            
            this.initializeBucket();
        } else {
            // Ensure local files directory exists
            this.ensureLocalDir();
        }
    }

    async initializeBucket() {
        try {
            const exists = await this.minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
                console.log(`✓ MinIO bucket '${this.bucketName}' created`);
            } else {
                console.log(`✓ MinIO bucket '${this.bucketName}' already exists`);
            }
        } catch (err) {
            console.error('Failed to initialize MinIO bucket:', err.message);
            throw err;
        }
    }

    async ensureLocalDir() {
        try {
            await fs.access(this.localPath);
        } catch {
            await fs.mkdir(this.localPath, { recursive: true });
            console.log(`✓ Local storage directory '${this.localPath}' created`);
        }
    }

    /**
     * Store encrypted file
     * @param {string} recordId - Record identifier
     * @param {Buffer} encryptedData - Encrypted file data
     * @param {Buffer} iv - Initialization vector
     * @param {Buffer} authTag - Authentication tag
     * @returns {string} - Storage URI
     */
    async storeEncryptedFile(recordId, encryptedData, iv, authTag) {
        const metadata = {
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64')
        };
        
        if (this.useMinio) {
            return await this.storeInMinIO(recordId, encryptedData, metadata);
        } else {
            return await this.storeLocally(recordId, encryptedData, metadata);
        }
    }

    async storeInMinIO(recordId, encryptedData, metadata) {
        try {
            // Store encrypted file
            const fileKey = `encrypted/${recordId}.enc`;
            await this.minioClient.putObject(
                this.bucketName,
                fileKey,
                encryptedData,
                encryptedData.length,
                {
                    'Content-Type': 'application/octet-stream',
                    'X-Record-ID': recordId
                }
            );

            // Store metadata
            const metaKey = `metadata/${recordId}.meta.json`;
            const metaBuffer = Buffer.from(JSON.stringify(metadata));
            await this.minioClient.putObject(
                this.bucketName,
                metaKey,
                metaBuffer,
                metaBuffer.length,
                {
                    'Content-Type': 'application/json',
                    'X-Record-ID': recordId
                }
            );

            return `minio://${this.bucketName}/${fileKey}`;
        } catch (err) {
            throw new Error(`Failed to store file in MinIO: ${err.message}`);
        }
    }

    async storeLocally(recordId, encryptedData, metadata) {
        try {
            // Store encrypted file
            const filePath = path.join(this.localPath, `${recordId}.enc`);
            await fs.writeFile(filePath, encryptedData);
            
            // Store metadata
            const metaPath = path.join(this.localPath, `${recordId}.meta.json`);
            await fs.writeFile(metaPath, JSON.stringify(metadata));
            
            return `file://${this.localPath}/${recordId}.enc`;
        } catch (err) {
            throw new Error(`Failed to store file locally: ${err.message}`);
        }
    }

    /**
     * Retrieve encrypted file
     * @param {string} recordId - Record identifier
     * @returns {Object} - { encryptedData, iv, authTag }
     */
    async retrieveEncryptedFile(recordId) {
        if (this.useMinio) {
            return await this.retrieveFromMinIO(recordId);
        } else {
            return await this.retrieveLocally(recordId);
        }
    }

    async retrieveFromMinIO(recordId) {
        try {
            // Retrieve encrypted file
            const fileKey = `encrypted/${recordId}.enc`;
            const encryptedDataStream = await this.minioClient.getObject(this.bucketName, fileKey);
            
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of encryptedDataStream) {
                chunks.push(chunk);
            }
            const encryptedData = Buffer.concat(chunks);

            // Retrieve metadata
            const metaKey = `metadata/${recordId}.meta.json`;
            const metaStream = await this.minioClient.getObject(this.bucketName, metaKey);
            
            const metaChunks = [];
            for await (const chunk of metaStream) {
                metaChunks.push(chunk);
            }
            const metadata = JSON.parse(Buffer.concat(metaChunks).toString());

            return {
                encryptedData,
                iv: Buffer.from(metadata.iv, 'base64'),
                authTag: Buffer.from(metadata.authTag, 'base64')
            };
        } catch (err) {
            throw new Error(`Failed to retrieve file from MinIO: ${err.message}`);
        }
    }

    async retrieveLocally(recordId) {
        try {
            const filePath = path.join(this.localPath, `${recordId}.enc`);
            const metaPath = path.join(this.localPath, `${recordId}.meta.json`);
            
            const encryptedData = await fs.readFile(filePath);
            const metadata = JSON.parse(await fs.readFile(metaPath, 'utf8'));
            
            return {
                encryptedData,
                iv: Buffer.from(metadata.iv, 'base64'),
                authTag: Buffer.from(metadata.authTag, 'base64')
            };
        } catch (err) {
            throw new Error(`Failed to retrieve file locally: ${err.message}`);
        }
    }

    /**
     * Delete encrypted file
     * @param {string} recordId - Record identifier
     */
    async deleteEncryptedFile(recordId) {
        if (this.useMinio) {
            await this.deleteFromMinIO(recordId);
        } else {
            await this.deleteLocally(recordId);
        }
    }

    async deleteFromMinIO(recordId) {
        try {
            const fileKey = `encrypted/${recordId}.enc`;
            const metaKey = `metadata/${recordId}.meta.json`;
            
            await this.minioClient.removeObject(this.bucketName, fileKey);
            await this.minioClient.removeObject(this.bucketName, metaKey);
        } catch (err) {
            throw new Error(`Failed to delete file from MinIO: ${err.message}`);
        }
    }

    async deleteLocally(recordId) {
        try {
            const filePath = path.join(this.localPath, `${recordId}.enc`);
            const metaPath = path.join(this.localPath, `${recordId}.meta.json`);
            
            await fs.unlink(filePath);
            await fs.unlink(metaPath);
        } catch (err) {
            throw new Error(`Failed to delete file locally: ${err.message}`);
        }
    }

    /**
     * Get storage statistics
     * @returns {Object} - Storage statistics
     */
    async getStorageStats() {
        if (this.useMinio) {
            return await this.getMinIOStats();
        } else {
            return await this.getLocalStats();
        }
    }

    async getMinIOStats() {
        try {
            const objects = [];
            const stream = this.minioClient.listObjects(this.bucketName, '', true);
            
            for await (const obj of stream) {
                objects.push(obj);
            }
            
            const totalSize = objects.reduce((sum, obj) => sum + obj.size, 0);
            const fileCount = objects.filter(obj => obj.name.endsWith('.enc')).length;
            
            return {
                storage_type: 'MinIO',
                bucket_name: this.bucketName,
                total_files: fileCount,
                total_size: totalSize,
                total_objects: objects.length
            };
        } catch (err) {
            throw new Error(`Failed to get MinIO stats: ${err.message}`);
        }
    }

    async getLocalStats() {
        try {
            const files = await fs.readdir(this.localPath);
            const encFiles = files.filter(f => f.endsWith('.enc'));
            
            let totalSize = 0;
            for (const file of encFiles) {
                const stats = await fs.stat(path.join(this.localPath, file));
                totalSize += stats.size;
            }
            
            return {
                storage_type: 'Local',
                path: this.localPath,
                total_files: encFiles.length,
                total_size: totalSize
            };
        } catch (err) {
            throw new Error(`Failed to get local stats: ${err.message}`);
        }
    }

    /**
     * Health check
     * @returns {Object} - Health status
     */
    async healthCheck() {
        try {
            if (this.useMinio) {
                await this.minioClient.bucketExists(this.bucketName);
                return {
                    status: 'healthy',
                    storage_type: 'MinIO',
                    bucket: this.bucketName
                };
            } else {
                await fs.access(this.localPath);
                return {
                    status: 'healthy',
                    storage_type: 'Local',
                    path: this.localPath
                };
            }
        } catch (err) {
            return {
                status: 'unhealthy',
                error: err.message
            };
        }
    }
}

module.exports = CDMSStorage;
