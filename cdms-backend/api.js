// api.js - Updated with backend.js integration
'use strict';

const express = require('express');
const multer = require('multer');
const CDMSBackend = require('./backend');

const app = express();
app.use(express.json());

// Configure multer for file uploads (memory storage)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Initialize backend
const backend = new CDMSBackend({
    vaultAddr: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    vaultToken: process.env.VAULT_TOKEN
});

// Initialize Vault on startup
backend.initVaultTransit().catch(err => {
    console.error('Failed to initialize Vault:', err.message);
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
function authenticateUser(req, res, next) {
    const { userId, org } = req.body.userId ? req.body : req.query;
    
    if (!userId || !org) {
        return res.status(401).json({ 
            error: 'Missing authentication credentials',
            message: 'userId and org are required' 
        });
    }
    
    req.auth = { userId, org };
    next();
}

// ============================================
// RECORD MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /record/upload
 * Upload a new encrypted record
 * Body: multipart/form-data with file + metadata
 */
app.post('/record/upload', authenticateUser, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const metadata = {
            case_id: req.body.case_id,
            record_type: req.body.record_type || 'Evidence',
            policy_id: req.body.policy_id || 'default-policy',
            filename: req.file.originalname,
            mime_type: req.file.mimetype,
            uploader_org: req.auth.org
        };

        if (!metadata.case_id) {
            return res.status(400).json({ error: 'case_id is required' });
        }

        const result = await backend.uploadRecord(
            req.auth.userId,
            req.auth.org,
            req.file.buffer,
            metadata
        );

        res.json({
            success: true,
            recordId: result.recordId,
            fileHash: result.fileHash,
            message: 'Record uploaded and encrypted successfully'
        });

    } catch (err) {
        console.error('Upload error:', err.message);
        res.status(500).json({ 
            error: 'Upload failed',
            message: err.message 
        });
    }
});

/**
 * GET /record/:id/download
 * Download and decrypt a record
 */
app.get('/record/:id/download', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;

        const result = await backend.downloadRecord(
            req.auth.userId,
            req.auth.org,
            recordId
        );

        // Set appropriate headers
        res.setHeader('Content-Type', result.metadata.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${result.metadata.filename}"`);
        res.setHeader('Content-Length', result.file.length);

        res.send(result.file);

    } catch (err) {
        console.error('Download error:', err.message);
        res.status(500).json({ 
            error: 'Download failed',
            message: err.message 
        });
    }
});

/**
 * GET /record/:id/metadata
 * Get record metadata only (no file download)
 */
app.get('/record/:id/metadata', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        const result = await contract.evaluateTransaction('ReadRecord', recordId);
        await gateway.disconnect();
        
        const metadata = JSON.parse(result.toString());
        
        // Remove sensitive fields before sending
        delete metadata.wrapped_key_ref;
        
        res.json(metadata);

    } catch (err) {
        console.error('Metadata fetch error:', err.message);
        res.status(500).json({ 
            error: 'Failed to fetch metadata',
            message: err.message 
        });
    }
});

/**
 * GET /records/case/:caseId
 * List all records for a case
 */
app.get('/records/case/:caseId', authenticateUser, async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const records = await backend.listRecordsByCase(
            req.auth.userId,
            req.auth.org,
            caseId
        );

        // Remove sensitive fields
        const sanitizedRecords = records.map(r => {
            const { wrapped_key_ref, ...safe } = r;
            return safe;
        });

        res.json({
            case_id: caseId,
            count: sanitizedRecords.length,
            records: sanitizedRecords
        });

    } catch (err) {
        console.error('List records error:', err.message);
        res.status(500).json({ 
            error: 'Failed to list records',
            message: err.message 
        });
    }
});

/**
 * GET /records
 * List all records (admin only)
 */
app.get('/records', authenticateUser, async (req, res) => {
    try {
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('ListAllRecords');
        await gateway.disconnect();
        
        const records = JSON.parse(result.toString());
        
        // Remove sensitive fields
        const sanitizedRecords = records.map(r => {
            const { wrapped_key_ref, ...safe } = r;
            return safe;
        });

        res.json({
            count: sanitizedRecords.length,
            records: sanitizedRecords
        });

    } catch (err) {
        console.error('List all records error:', err.message);
        res.status(500).json({ 
            error: 'Failed to list records',
            message: err.message 
        });
    }
});

// ============================================
// POLICY MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /policy
 * Create a new access policy (admin only)
 */
app.post('/policy', authenticateUser, async (req, res) => {
    try {
        const { policy_id, rules, categories } = req.body;

        if (!policy_id || !rules) {
            return res.status(400).json({ 
                error: 'policy_id and rules are required' 
            });
        }

        const policyData = {
            policy_id,
            rules,
            categories: categories || []
        };

        const result = await backend.createPolicy(
            req.auth.userId,
            req.auth.org,
            policy_id,
            policyData
        );

        res.json({
            success: true,
            policy_id: result,
            message: 'Policy created successfully'
        });

    } catch (err) {
        console.error('Create policy error:', err.message);
        res.status(500).json({ 
            error: 'Failed to create policy',
            message: err.message 
        });
    }
});

/**
 * GET /policy/:id
 * Get policy details
 */
app.get('/policy/:id', authenticateUser, async (req, res) => {
    try {
        const policyId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        const result = await contract.evaluateTransaction('GetPolicy', policyId);
        await gateway.disconnect();
        
        res.json(JSON.parse(result.toString()));

    } catch (err) {
        console.error('Get policy error:', err.message);
        res.status(500).json({ 
            error: 'Failed to get policy',
            message: err.message 
        });
    }
});

// ============================================
// AUDIT ENDPOINTS
// ============================================

/**
 * POST /audit
 * Add manual audit entry
 */
app.post('/audit', authenticateUser, async (req, res) => {
    try {
        const { record_id, action, details } = req.body;

        if (!record_id || !action) {
            return res.status(400).json({ 
                error: 'record_id and action are required' 
            });
        }

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.submitTransaction('AddAudit', record_id, action, details || '');
        await gateway.disconnect();

        res.json({
            success: true,
            audit_id: result.toString(),
            message: 'Audit entry added'
        });

    } catch (err) {
        console.error('Add audit error:', err.message);
        res.status(500).json({ 
            error: 'Failed to add audit',
            message: err.message 
        });
    }
});

// ============================================
// HEALTH & STATUS ENDPOINTS
// ============================================

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'CDMS API',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /vault/status
 * Check Vault connection status
 */
app.get('/vault/status', async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.get(`${backend.vaultAddr}/v1/sys/health`, {
            headers: { 'X-Vault-Token': backend.vaultToken },
            validateStatus: () => true // Don't throw on non-200
        });

        res.json({
            vault_connected: response.status === 200,
            vault_address: backend.vaultAddr,
            initialized: response.data.initialized,
            sealed: response.data.sealed
        });
    } catch (err) {
        res.status(503).json({
            vault_connected: false,
            error: err.message
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   CDMS API Server                                 ║
║   Port: ${PORT}                                      ║
║   Vault: ${backend.vaultAddr}         ║
╚═══════════════════════════════════════════════════╝
    `);
});

module.exports = app;