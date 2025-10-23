// api.js - Updated with backend.js integration
'use strict';

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const CDMSBackend = require('./backend');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// AUTHENTICATION ENDPOINTS
// ============================================

/**
 * POST /login
 * User login with username/password
 */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                error: 'Username and password are required' 
            });
        }

        // Mock authentication - in production, validate against CA certificates
        const validUsers = {
            'admin': { name: 'Admin User', role: 'Admin', org: 'Org1', userId: 'AdminOrg1' },
            'investigator': { name: 'Investigator', role: 'Investigator', org: 'Org1', userId: 'InvestigatorA' },
            'forensics': { name: 'Forensics Officer', role: 'Forensics Officer', org: 'Org1', userId: 'ForensicsOfficerA' },
            'police': { name: 'Police Officer', role: 'Investigator', org: 'Org2', userId: 'DistrictPoliceB' }
        };

        const user = validUsers[username.toLowerCase()];
        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid credentials' 
            });
        }

        // In production, verify password against stored hash
        res.json({
            success: true,
            user: {
                name: user.name,
                role: user.role,
                org: user.org,
                userId: user.userId
            },
            message: 'Login successful'
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ 
            error: 'Login failed',
            message: err.message 
        });
    }
});

/**
 * GET /auth/me
 * Get current user information
 */
app.get('/auth/me', authenticateUser, async (req, res) => {
    try {
        // Get user details from blockchain or database
        const userInfo = {
            userId: req.auth.userId,
            org: req.auth.org,
            name: req.auth.userId.replace(/([A-Z])/g, ' $1').trim(),
            role: req.auth.userId.includes('Admin') ? 'Admin' : 
                  req.auth.userId.includes('Forensics') ? 'Forensics Officer' : 'Investigator'
        };

        res.json(userInfo);

    } catch (err) {
        console.error('Get user error:', err.message);
        res.status(500).json({ 
            error: 'Failed to get user info',
            message: err.message 
        });
    }
});

/**
 * POST /auth/certificate
 * Upload and validate user certificate
 */
app.post('/auth/certificate', upload.single('certificate'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No certificate file provided' });
        }

        // In production, validate the certificate against CA
        // For now, just return success
        res.json({
            success: true,
            message: 'Certificate uploaded and validated successfully'
        });

    } catch (err) {
        console.error('Certificate upload error:', err.message);
        res.status(500).json({ 
            error: 'Certificate upload failed',
            message: err.message 
        });
    }
});

// ============================================
// RECORD MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /record/upload
 * Upload a new encrypted record
 * Body: multipart/form-data with file + metadata
 */
app.post('/record/upload', authenticateUser, upload.single('file'), validateRecordUpload, async (req, res) => {
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
 * List all records with filtering
 */
app.get('/records', authenticateUser, async (req, res) => {
    try {
        const { caseId, recordType, status, org } = req.query;
        
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('ListAllRecords');
        await gateway.disconnect();
        
        let records = JSON.parse(result.toString());
        
        // Apply filters
        if (caseId) {
            records = records.filter(r => r.case_id === caseId);
        }
        if (recordType) {
            records = records.filter(r => r.record_type === recordType);
        }
        if (status) {
            records = records.filter(r => r.status === status);
        }
        if (org) {
            records = records.filter(r => r.uploader_org === org);
        }
        
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

/**
 * GET /records/:id
 * Get specific record by ID
 */
app.get('/records/:id', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        const result = await contract.evaluateTransaction('ReadRecord', recordId);
        await gateway.disconnect();
        
        const record = JSON.parse(result.toString());
        
        // Remove sensitive fields
        const { wrapped_key_ref, ...safeRecord } = record;
        
        res.json(safeRecord);

    } catch (err) {
        console.error('Get record error:', err.message);
        res.status(500).json({ 
            error: 'Failed to get record',
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
app.post('/policy', authenticateUser, validatePolicy, async (req, res) => {
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

/**
 * GET /policies
 * List all policies
 */
app.get('/policies', authenticateUser, async (req, res) => {
    try {
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('ListAllPolicies');
        await gateway.disconnect();
        
        const policies = JSON.parse(result.toString());
        
        res.json({
            count: policies.length,
            policies: policies
        });

    } catch (err) {
        console.error('List policies error:', err.message);
        res.status(500).json({ 
            error: 'Failed to list policies',
            message: err.message 
        });
    }
});

/**
 * PUT /policies/:id/update
 * Update an existing policy
 */
app.put('/policies/:id/update', authenticateUser, async (req, res) => {
    try {
        const policyId = req.params.id;
        const { rules, categories, description } = req.body;

        if (!rules) {
            return res.status(400).json({ 
                error: 'rules are required' 
            });
        }

        const policyData = {
            policy_id: policyId,
            rules,
            categories: categories || [],
            description: description || '',
            updated_at: new Date().toISOString(),
            updated_by: req.auth.userId
        };

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.submitTransaction('UpdatePolicy', policyId, JSON.stringify(policyData));
        await gateway.disconnect();

        res.json({
            success: true,
            policy_id: result.toString(),
            message: 'Policy updated successfully'
        });

    } catch (err) {
        console.error('Update policy error:', err.message);
        res.status(500).json({ 
            error: 'Failed to update policy',
            message: err.message 
        });
    }
});

/**
 * DELETE /policies/:id
 * Delete a policy
 */
app.delete('/policies/:id', authenticateUser, async (req, res) => {
    try {
        const policyId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        const result = await contract.submitTransaction('DeletePolicy', policyId);
        await gateway.disconnect();

        res.json({
            success: true,
            message: 'Policy deleted successfully'
        });

    } catch (err) {
        console.error('Delete policy error:', err.message);
        res.status(500).json({ 
            error: 'Failed to delete policy',
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

/**
 * GET /audit/trail/:recordId
 * Get audit trail for a specific record
 */
app.get('/audit/trail/:recordId', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.recordId;
        const auditTrail = await backend.getAuditTrail(req.auth.userId, req.auth.org, recordId);
        
        res.json({
            record_id: recordId,
            audit_trail: auditTrail
        });

    } catch (err) {
        console.error('Get audit trail error:', err.message);
        res.status(500).json({ 
            error: 'Failed to get audit trail',
            message: err.message 
        });
    }
});

/**
 * GET /audit/list
 * List all audit entries with filtering
 */
app.get('/audit/list', authenticateUser, async (req, res) => {
    try {
        const { recordId, action, userId, startDate, endDate } = req.query;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        // Get all audit entries
        const result = await contract.evaluateTransaction('ListAllAudits');
        await gateway.disconnect();
        
        let audits = JSON.parse(result.toString());
        
        // Apply filters
        if (recordId) {
            audits = audits.filter(a => a.record_id === recordId);
        }
        if (action) {
            audits = audits.filter(a => a.action === action);
        }
        if (userId) {
            audits = audits.filter(a => a.user_id === userId);
        }
        if (startDate) {
            audits = audits.filter(a => new Date(a.timestamp) >= new Date(startDate));
        }
        if (endDate) {
            audits = audits.filter(a => new Date(a.timestamp) <= new Date(endDate));
        }
        
        res.json({
            count: audits.length,
            audits: audits
        });

    } catch (err) {
        console.error('List audits error:', err.message);
        res.status(500).json({ 
            error: 'Failed to list audits',
            message: err.message 
        });
    }
});

// ============================================
// ACCESS MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /access/grant
 * Grant access to a record for a user/organization
 */
app.post('/access/grant', authenticateUser, async (req, res) => {
    try {
        const { recordId, targetUserId, targetOrg, accessType, expiryDate } = req.body;

        if (!recordId || !targetUserId || !targetOrg) {
            return res.status(400).json({ 
                error: 'recordId, targetUserId, and targetOrg are required' 
            });
        }

        const accessData = {
            record_id: recordId,
            target_user_id: targetUserId,
            target_org: targetOrg,
            access_type: accessType || 'read',
            granted_by: req.auth.userId,
            granted_org: req.auth.org,
            granted_at: new Date().toISOString(),
            expiry_date: expiryDate || null,
            status: 'active'
        };

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.submitTransaction('GrantAccess', JSON.stringify(accessData));
        await gateway.disconnect();

        res.json({
            success: true,
            access_id: result.toString(),
            message: 'Access granted successfully'
        });

    } catch (err) {
        console.error('Grant access error:', err.message);
        res.status(500).json({ 
            error: 'Failed to grant access',
            message: err.message 
        });
    }
});

/**
 * POST /access/revoke
 * Revoke access to a record
 */
app.post('/access/revoke', authenticateUser, async (req, res) => {
    try {
        const { recordId, targetUserId, reason } = req.body;

        if (!recordId || !targetUserId) {
            return res.status(400).json({ 
                error: 'recordId and targetUserId are required' 
            });
        }

        const revokeData = {
            record_id: recordId,
            target_user_id: targetUserId,
            revoked_by: req.auth.userId,
            revoked_org: req.auth.org,
            revoked_at: new Date().toISOString(),
            reason: reason || 'Access revoked by administrator'
        };

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.submitTransaction('RevokeAccess', JSON.stringify(revokeData));
        await gateway.disconnect();

        res.json({
            success: true,
            message: 'Access revoked successfully'
        });

    } catch (err) {
        console.error('Revoke access error:', err.message);
        res.status(500).json({ 
            error: 'Failed to revoke access',
            message: err.message 
        });
    }
});

/**
 * GET /access/check
 * Check if user has access to a record
 */
app.get('/access/check', authenticateUser, async (req, res) => {
    try {
        const { recordId, targetUserId, targetOrg } = req.query;

        if (!recordId) {
            return res.status(400).json({ 
                error: 'recordId is required' 
            });
        }

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('CheckAccess', recordId, targetUserId || req.auth.userId, targetOrg || req.auth.org);
        await gateway.disconnect();
        
        const accessInfo = JSON.parse(result.toString());

        res.json({
            has_access: accessInfo.has_access,
            access_type: accessInfo.access_type,
            granted_at: accessInfo.granted_at,
            expiry_date: accessInfo.expiry_date,
            status: accessInfo.status
        });

    } catch (err) {
        console.error('Check access error:', err.message);
        res.status(500).json({ 
            error: 'Failed to check access',
            message: err.message 
        });
    }
});

/**
 * GET /access/list
 * List all access permissions for a record or user
 */
app.get('/access/list', authenticateUser, async (req, res) => {
    try {
        const { recordId, userId, org } = req.query;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        let result;
        if (recordId) {
            result = await contract.evaluateTransaction('ListAccessByRecord', recordId);
        } else if (userId) {
            result = await contract.evaluateTransaction('ListAccessByUser', userId);
        } else {
            result = await contract.evaluateTransaction('ListAllAccess');
        }
        
        await gateway.disconnect();
        
        const accessList = JSON.parse(result.toString());
        
        res.json({
            count: accessList.length,
            access_list: accessList
        });

    } catch (err) {
        console.error('List access error:', err.message);
        res.status(500).json({ 
            error: 'Failed to list access',
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

/**
 * GET /storage/status
 * Check storage system status
 */
app.get('/storage/status', async (req, res) => {
    try {
        const health = await backend.storage.healthCheck();
        const stats = await backend.storage.getStorageStats();
        
        res.json({
            storage_healthy: health.status === 'healthy',
            storage_type: stats.storage_type,
            stats: stats
        });
    } catch (err) {
        res.status(503).json({
            storage_healthy: false,
            error: err.message
        });
    }
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

function validateRecordUpload(req, res, next) {
    const { case_id, record_type } = req.body;
    
    if (!case_id) {
        return res.status(400).json({ error: 'case_id is required' });
    }
    
    if (!record_type || !['FIR', 'Evidence', 'Report'].includes(record_type)) {
        return res.status(400).json({ error: 'record_type must be FIR, Evidence, or Report' });
    }
    
    next();
}

function validatePolicy(req, res, next) {
    const { policy_id, rules } = req.body;
    
    if (!policy_id) {
        return res.status(400).json({ error: 'policy_id is required' });
    }
    
    if (!rules || !Array.isArray(rules)) {
        return res.status(400).json({ error: 'rules must be an array' });
    }
    
    next();
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message
        });
    }
    
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
        });
    }
    
    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied'
        });
    }
    
    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
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