// minioClient.js - MinIO Configuration and Utilities
const Minio = require('minio');
const crypto = require('crypto');
const { Readable } = require('stream');

// MinIO Configuration
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true' || false,
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'cdms-evidence';

/**
 * Initialize MinIO bucket if it doesn't exist
 */
async function initializeBucket() {
    try {
        const exists = await minioClient.bucketExists(BUCKET_NAME);
        if (!exists) {
            await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' created successfully`);
        } else {
            console.log(`✅ MinIO bucket '${BUCKET_NAME}' already exists`);
        }
    } catch (err) {
        console.error('❌ Error initializing MinIO bucket:', err.message);
        throw err;
    }
}

/**
 * Calculate SHA-256 hash of file buffer
 */
function calculateFileHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload file to MinIO
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} filename - Original filename
 * @param {string} caseId - Case ID for organizing files
 * @param {string} uploaderOrg - Organization of uploader
 * @returns {Promise<Object>} Object containing objectName, hash, url, size
 */
async function uploadFile(fileBuffer, filename, caseId, uploaderOrg) {
    try {
        // Generate unique object name: caseId/timestamp_hash_filename
        const timestamp = Date.now();
        const fileHash = calculateFileHash(fileBuffer);
        const fileExtension = filename.split('.').pop();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        const objectName = `${caseId}/${timestamp}_${fileHash.substring(0, 8)}_${sanitizedFilename}`;

        // Upload to MinIO
        const metaData = {
            'Content-Type': 'application/octet-stream',
            'X-Uploader-Org': uploaderOrg,
            'X-Case-Id': caseId,
            'X-Upload-Timestamp': new Date().toISOString(),
            'X-File-Hash': fileHash
        };

        await minioClient.putObject(
            BUCKET_NAME,
            objectName,
            fileBuffer,
            fileBuffer.length,
            metaData
        );

        // Generate presigned URL (valid for 7 days)
        const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, 7 * 24 * 60 * 60);

        console.log(`✅ File uploaded to MinIO: ${objectName}`);

        return {
            objectName,
            hash: fileHash,
            url,
            size: fileBuffer.length,
            bucket: BUCKET_NAME,
            uploadedAt: new Date().toISOString()
        };
    } catch (err) {
        console.error('❌ Error uploading file to MinIO:', err.message);
        throw new Error(`MinIO upload failed: ${err.message}`);
    }
}

/**
 * Download file from MinIO
 * @param {string} objectName - Object name in MinIO
 * @returns {Promise<Buffer>} File buffer
 */
async function downloadFile(objectName) {
    try {
        const stream = await minioClient.getObject(BUCKET_NAME, objectName);
        
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    } catch (err) {
        console.error('❌ Error downloading file from MinIO:', err.message);
        throw new Error(`MinIO download failed: ${err.message}`);
    }
}

/**
 * Get file metadata from MinIO
 * @param {string} objectName - Object name in MinIO
 * @returns {Promise<Object>} File metadata
 */
async function getFileMetadata(objectName) {
    try {
        const stat = await minioClient.statObject(BUCKET_NAME, objectName);
        return {
            size: stat.size,
            etag: stat.etag,
            lastModified: stat.lastModified,
            metaData: stat.metaData
        };
    } catch (err) {
        console.error('❌ Error getting file metadata from MinIO:', err.message);
        throw new Error(`MinIO metadata fetch failed: ${err.message}`);
    }
}

/**
 * Generate presigned URL for file access
 * @param {string} objectName - Object name in MinIO
 * @param {number} expirySeconds - URL expiry time in seconds (default 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
async function generatePresignedUrl(objectName, expirySeconds = 3600) {
    try {
        const url = await minioClient.presignedGetObject(BUCKET_NAME, objectName, expirySeconds);
        return url;
    } catch (err) {
        console.error('❌ Error generating presigned URL:', err.message);
        throw new Error(`Presigned URL generation failed: ${err.message}`);
    }
}

/**
 * Delete file from MinIO
 * @param {string} objectName - Object name in MinIO
 */
async function deleteFile(objectName) {
    try {
        await minioClient.removeObject(BUCKET_NAME, objectName);
        console.log(`✅ File deleted from MinIO: ${objectName}`);
    } catch (err) {
        console.error('❌ Error deleting file from MinIO:', err.message);
        throw new Error(`MinIO delete failed: ${err.message}`);
    }
}

/**
 * List all files for a case
 * @param {string} caseId - Case ID
 * @returns {Promise<Array>} Array of file objects
 */
async function listCaseFiles(caseId) {
    try {
        const stream = minioClient.listObjects(BUCKET_NAME, `${caseId}/`, true);
        const files = [];

        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => {
                files.push({
                    name: obj.name,
                    size: obj.size,
                    lastModified: obj.lastModified,
                    etag: obj.etag
                });
            });
            stream.on('end', () => resolve(files));
            stream.on('error', reject);
        });
    } catch (err) {
        console.error('❌ Error listing case files:', err.message);
        throw new Error(`MinIO list failed: ${err.message}`);
    }
}

module.exports = {
    minioClient,
    initializeBucket,
    calculateFileHash,
    uploadFile,
    downloadFile,
    getFileMetadata,
    generatePresignedUrl,
    deleteFile,
    listCaseFiles,
    BUCKET_NAME
};

