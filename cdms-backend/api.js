// =========================================================
// --- User Registration, Login & CDMS API (Map Version) ---
// =========================================================
'use strict';

// Load environment variables from .env file
require('dotenv').config();

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const CDMSBackend = require('./backend');

// Registration scripts
const registerForensicsOfficerA = require('./registerForensicsOfficerA');
const registerInvestigatorA = require('./registerInvestigatorA');
const registerDistrictPoliceA = require('./registerDistrictPoliceA');
const registerForensicsOfficerB = require('./registerForensicsOfficerB');
const registerInvestigatorB = require('./registerInvestigatorB');
const registerDistrictPoliceB = require('./registerDistrictPoliceB');

// File paths
const PENDING_REG_PATH = path.join(__dirname, 'pending_registrations.json');
const APPROVED_PATH = path.join(__dirname, 'approved_users.json');

// =========================================================
// Utility Helpers
// =========================================================
function loadJSON(filepath) {
    if (!fs.existsSync(filepath)) return new Map();
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        // Handle both array format (legacy) and ensure Map conversion
        if (Array.isArray(data)) {
            return new Map(data.map(u => [u.email, u]));
        } else if (typeof data === 'object' && data !== null) {
            // If it's a single object, convert to Map with single entry
            return new Map([[data.email, data]]);
        }
        return new Map();
    } catch {
        return new Map();
    }
}

function saveJSON(filepath, map) {
    const arr = Array.from(map.values());
    fs.writeFileSync(filepath, JSON.stringify(arr, null, 2));
}

// Ensure files exist
if (!fs.existsSync(PENDING_REG_PATH)) fs.writeFileSync(PENDING_REG_PATH, '[]');
if (!fs.existsSync(APPROVED_PATH)) fs.writeFileSync(APPROVED_PATH, '[]');

// =========================================================
// Express Setup
// =========================================================
const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// Backend Initialization (MUST BE BEFORE ENDPOINTS THAT USE IT)
// =========================================================
const backend = new CDMSBackend({
    vaultAddr: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
    vaultToken: process.env.VAULT_TOKEN
});

// Initialize vault transit (best-effort)
backend.initVaultTransit().catch(err => {
    console.error('Failed to initialize Vault:', err.message);
});

// =========================================================
// Registration Endpoint
// =========================================================
app.post('/register', async (req, res) => {
    try {
        const { username, email, password, role, org } = req.body;
        if (!username || !email || !password || !role || !org) {
            return res.status(400).json({ error: 'All fields required: username, email, password, role, org' });
        }

        const pending = loadJSON(PENDING_REG_PATH);
        const approved = loadJSON(APPROVED_PATH);

        if (pending.has(email) || approved.has(email)) {
            return res.status(409).json({ error: 'User already registered or pending approval' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        pending.set(email, { username, email, password: hashedPassword, role, org, status: 'pending' });
        saveJSON(PENDING_REG_PATH, pending);

        return res.json({ success: true, message: 'Registration request submitted. Awaiting admin approval.' });
    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ error: 'Registration failed', message: err.message });
    }
});

// =========================================================
// Login Endpoint
// =========================================================
app.post('/login', async (req, res) => {
    try {
        const { email, password, org } = req.body;
        if (!email || !password || !org) {
            return res.status(400).json({ error: 'Email, password, and org are required' });
        }

        const pending = loadJSON(PENDING_REG_PATH);
        if (pending.has(email)) {
            return res.status(403).json({ error: 'Registration pending admin approval' });
        }

        const approved = loadJSON(APPROVED_PATH);
        const foundUser = approved.get(email);

        if (!foundUser) {
            return res.status(401).json({ error: 'User not registered or approved yet' });
        }

        // Check if user access is revoked
        if (foundUser.status === 'revoked') {
            return res.status(403).json({ 
                error: 'Access revoked', 
                message: 'Your access has been revoked by an administrator. Please contact support.',
                revoked_at: foundUser.revoked_at,
                revoke_reason: foundUser.revoke_reason
            });
        }

        // Verify password
        const match = await bcrypt.compare(password, foundUser.password);
        if (!match) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Verify user exists in Fabric wallet (wrap in try-catch for better error messages)
        const userOrg = foundUser.org === 'A' ? 'Org1' : 'Org2';
        // Use walletId from approved_users.json if available, otherwise fallback to admin logic
        const walletId = foundUser.walletId || (foundUser.role === 'admin'
            ? (foundUser.org === 'A' ? 'AdminOrg1' : 'AdminOrg2')
            : foundUser.username);

        console.log(`[LOGIN DEBUG] Attempting login for: ${foundUser.email}`);
        console.log(`[LOGIN DEBUG] Organization: ${userOrg}, Wallet ID: ${walletId}, Role: ${foundUser.role}`);

        try {
            console.log(`[LOGIN DEBUG] Step 1: Getting Fabric contract...`);
            const contractResult = await backend.getContract(walletId, userOrg);
            console.log(`[LOGIN DEBUG] Step 1: ✅ Successfully connected to Fabric`);
            console.log(`[LOGIN DEBUG] Gateway connected, network accessed, contract obtained`);
        } catch (fabricError) {
            console.error('[LOGIN DEBUG] Step 1: ❌ Fabric connection failed');
            console.error('[LOGIN DEBUG] Error details:', {
                message: fabricError.message,
                stack: fabricError.stack,
                walletId,
                userOrg,
                walletPath: backend.walletPath
            });
            // Check if it's a network setup issue
            if (fabricError.message.includes('Fabric network not set up') || 
                fabricError.message.includes('ENOENT') ||
                fabricError.message.includes('connection')) {
                return res.status(503).json({ 
                    error: 'Fabric network not available', 
                    message: 'Please set up the Hyperledger Fabric test network first. See FABRIC_SETUP.md for instructions.',
                    details: fabricError.message
                });
            }
            // Check if it's a wallet/identity issue
            if (fabricError.message.includes('does not exist in wallet') || 
                fabricError.message.includes('Identity')) {
                return res.status(401).json({ 
                    error: 'Fabric identity not found', 
                    message: 'User has been approved but Fabric identity is missing. Please contact administrator to re-enroll.',
                    details: fabricError.message
                });
            }
            // Re-throw other errors
            throw fabricError;
        }

        return res.json({
            success: true,
            message: 'Login successful',
            user: {
                username: foundUser.username,
                email: foundUser.email,
                role: foundUser.role,
                org: foundUser.org,
                walletId
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        // Ensure error message is always included
        const errorMessage = err.message || 'Unknown error occurred';
        return res.status(500).json({ 
            error: 'Login failed', 
            message: errorMessage,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// =========================================================
// Get Pending Registrations (Admin Only)
// =========================================================
app.get('/pending-registrations', async (req, res) => {
    try {
        const { adminEmail } = req.query;
        
        // Verify admin
        const approved = loadJSON(APPROVED_PATH);
        const admin = approved.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const pending = loadJSON(PENDING_REG_PATH);
        const pendingList = Array.from(pending.values());
        
        return res.json({
            success: true,
            count: pendingList.length,
            pending: pendingList
        });
    } catch (err) {
        console.error('Get pending registrations error:', err);
        return res.status(500).json({ error: 'Failed to retrieve pending registrations', message: err.message });
    }
});

// =========================================================
// Approve Registration (Admin)
// =========================================================
app.post('/approve-registration', async (req, res) => {
    try {
        const { email, adminEmail } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        if (!adminEmail) return res.status(400).json({ error: 'Admin email required' });

        // Verify admin
        const approvedUsers = loadJSON(APPROVED_PATH);
        const admin = approvedUsers.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const pending = loadJSON(PENDING_REG_PATH);
        const user = pending.get(email);
        if (!user) return res.status(404).json({ error: 'No pending registration for this email' });

        console.log(`Admin ${adminEmail} approving user ${user.username} (${user.role}) for ${user.org}...`);

        // Register based on org and role
        // Roles: district_police, forensics_officer, investigator, admin
        if (user.org === 'A') {
            if (user.role === 'forensics_officer' || user.role === 'forensicsOfficerA') {
                await registerForensicsOfficerA(user.username, user.email);
            } else if (user.role === 'investigator' || user.role === 'investigatorA') {
                await registerInvestigatorA(user.username, user.email);
            } else if (user.role === 'admin' || user.role === 'district_police' || user.role === 'districtPoliceA') {
                await registerDistrictPoliceA(user.username, user.email);
            } else {
                throw new Error(`Unknown role: ${user.role}`);
            }
        } else if (user.org === 'B') {
            if (user.role === 'forensics_officer' || user.role === 'forensicsOfficerB') {
                await registerForensicsOfficerB(user.username, user.email);
            } else if (user.role === 'investigator' || user.role === 'investigatorB') {
                await registerInvestigatorB(user.username, user.email);
            } else if (user.role === 'admin' || user.role === 'district_police' || user.role === 'districtPoliceB') {
                await registerDistrictPoliceB(user.username, user.email);
            } else {
                throw new Error(`Unknown role: ${user.role}`);
            }
        } else {
            throw new Error(`Unknown organization: ${user.org}`);
        }

        const approvedFinal = loadJSON(APPROVED_PATH);
        // Use username as walletId since that's what the registration functions create
        const walletId = user.username;
        approvedFinal.set(email, {
            ...user,
            walletId: walletId,
        });

        pending.delete(email);
        saveJSON(APPROVED_PATH, approvedFinal);
        saveJSON(PENDING_REG_PATH, pending);

        return res.json({
            success: true,
            message: `User ${user.username} approved and enrolled in Fabric (${user.org}). Use your email and password to log in.`,
            walletId: walletId
        });
    } catch (err) {
        console.error('Approval error:', err);
        return res.status(500).json({ error: 'Failed to approve user', message: err.message });
    }
});

// =========================================================
// Reject Registration (Admin)
// =========================================================
app.post('/reject-registration', async (req, res) => {
    try {
        const { email, adminEmail, reason } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        if (!adminEmail) return res.status(400).json({ error: 'Admin email required' });

        // Verify admin
        const approvedUsers = loadJSON(APPROVED_PATH);
        const admin = approvedUsers.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const pending = loadJSON(PENDING_REG_PATH);
        const user = pending.get(email);
        if (!user) return res.status(404).json({ error: 'No pending registration for this email' });

        console.log(`Admin ${adminEmail} rejecting user ${user.username} (${user.role}) for ${user.org}. Reason: ${reason || 'Not specified'}`);

        // Remove from pending
        pending.delete(email);
        saveJSON(PENDING_REG_PATH, pending);

        return res.json({
            success: true,
            message: `User ${user.username} registration rejected.`,
            reason: reason || 'Not specified'
        });
    } catch (err) {
        console.error('Rejection error:', err);
        return res.status(500).json({ error: 'Failed to reject user', message: err.message });
    }
});

// =========================================================
// Revoke User Access (Admin)
// =========================================================
app.post('/revoke-access', async (req, res) => {
    try {
        const { email, adminEmail, reason } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        if (!adminEmail) return res.status(400).json({ error: 'Admin email required' });

        // Verify admin
        const approved = loadJSON(APPROVED_PATH);
        const admin = approved.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const user = approved.get(email);
        if (!user) return res.status(404).json({ error: 'User not found in approved users' });

        // Prevent admin from revoking themselves
        if (email === adminEmail) {
            return res.status(400).json({ error: 'Cannot revoke your own access' });
        }

        console.log(`Admin ${adminEmail} revoking access for ${user.username} (${user.role}). Reason: ${reason || 'Not specified'}`);

        // Mark as revoked instead of deleting (for audit trail)
        user.status = 'revoked';
        user.revoked_at = new Date().toISOString();
        user.revoked_by = adminEmail;
        user.revoke_reason = reason || 'Not specified';

        approved.set(email, user);
        saveJSON(APPROVED_PATH, approved);

        return res.json({
            success: true,
            message: `Access revoked for user ${user.username}.`,
            user: {
                email: user.email,
                username: user.username,
                status: 'revoked'
            }
        });
    } catch (err) {
        console.error('Revoke access error:', err);
        return res.status(500).json({ error: 'Failed to revoke access', message: err.message });
    }
});

// =========================================================
// Restore User Access (Admin)
// =========================================================
app.post('/restore-access', async (req, res) => {
    try {
        const { email, adminEmail } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });
        if (!adminEmail) return res.status(400).json({ error: 'Admin email required' });

        // Verify admin
        const approved = loadJSON(APPROVED_PATH);
        const admin = approved.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const user = approved.get(email);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.status !== 'revoked') {
            return res.status(400).json({ error: 'User access is not revoked' });
        }

        console.log(`Admin ${adminEmail} restoring access for ${user.username} (${user.role})`);

        // Restore access
        delete user.status; // Remove revoked status
        delete user.revoked_at;
        delete user.revoked_by;
        delete user.revoke_reason;

        approved.set(email, user);
        saveJSON(APPROVED_PATH, approved);

        return res.json({
            success: true,
            message: `Access restored for user ${user.username}.`,
            user: {
                email: user.email,
                username: user.username,
                status: 'active'
            }
        });
    } catch (err) {
        console.error('Restore access error:', err);
        return res.status(500).json({ error: 'Failed to restore access', message: err.message });
    }
});

// =========================================================
// Get All Approved Users (Admin)
// =========================================================
app.get('/approved-users', async (req, res) => {
    try {
        const { adminEmail } = req.query;
        
        // Verify admin
        const approved = loadJSON(APPROVED_PATH);
        const admin = approved.get(adminEmail);
        
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const usersList = Array.from(approved.values()).map(u => ({
            email: u.email,
            username: u.username,
            role: u.role,
            org: u.org,
            status: u.status || 'active',
            walletId: u.walletId,
            revoked_at: u.revoked_at,
            revoked_by: u.revoked_by,
            revoke_reason: u.revoke_reason
        }));
        
        return res.json({
            success: true,
            count: usersList.length,
            users: usersList
        });
    } catch (err) {
        console.error('Get approved users error:', err);
        return res.status(500).json({ error: 'Failed to retrieve approved users', message: err.message });
    }
});

// =========================================================
// Multer Config for File Uploads
// =========================================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// =========================================================
// Authentication Middleware
// =========================================================
function authenticateUser(req, res, next) {
    const source = req.method === 'GET' ? req.query : req.body;
    const { userId, org } = source;

    if (!userId || !org) {
        return res.status(401).json({
            error: 'Missing authentication credentials',
            message: 'userId and org are required'
        });
    }

    req.auth = { userId, org };
    next();
}

// =========================================================
// RECORD MANAGEMENT ENDPOINTS
// =========================================================
app.post('/record/upload', authenticateUser, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const metadata = {
            case_id: req.body.case_id,
            record_type: req.body.record_type || 'Evidence',
            policy_id: req.body.policy_id || 'default-policy',
            filename: req.file.originalname,
            mime_type: req.file.mimetype,
            uploader_org: req.auth.org
        };

        if (!metadata.case_id) return res.status(400).json({ error: 'case_id is required' });

        const result = await backend.uploadRecord(req.auth.userId, req.auth.org, req.file.buffer, metadata);
        return res.json({ success: true, recordId: result.recordId, fileHash: result.fileHash, message: 'Record uploaded and encrypted successfully' });
    } catch (err) {
        console.error('Upload error:', err.message);
        return res.status(500).json({ error: 'Upload failed', message: err.message });
    }
});

app.get('/record/:id/download', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        const result = await backend.downloadRecord(req.auth.userId, req.auth.org, recordId);

        res.setHeader('Content-Type', result.metadata.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${result.metadata.filename}"`);
        res.setHeader('Content-Length', result.file.length);

        return res.send(result.file);
    } catch (err) {
        console.error('Download error:', err.message);
        return res.status(500).json({ error: 'Download failed', message: err.message });
    }
});

app.get('/record/:id/metadata', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('ReadRecord', recordId);
        await gateway.disconnect();

        const metadata = JSON.parse(result.toString());
        delete metadata.wrapped_key_ref;

        return res.json(metadata);
    } catch (err) {
        console.error('Metadata fetch error:', err.message);
        return res.status(500).json({ error: 'Failed to fetch metadata', message: err.message });
    }
});

app.get('/records/case/:caseId', authenticateUser, async (req, res) => {
    try {
        const caseId = req.params.caseId;
        const records = await backend.listRecordsByCase(req.auth.userId, req.auth.org, caseId);

        const sanitizedRecords = records.map(r => {
            const { wrapped_key_ref, ...safe } = r;
            return safe;
        });

        return res.json({ case_id: caseId, count: sanitizedRecords.length, records: sanitizedRecords });
    } catch (err) {
        console.error('List records error:', err.message);
        return res.status(500).json({ error: 'Failed to list records', message: err.message });
    }
});

app.get('/records', authenticateUser, async (req, res) => {
    try {
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('ListAllRecords');
        await gateway.disconnect();

        const records = JSON.parse(result.toString());
        const sanitizedRecords = records.map(r => {
            const { wrapped_key_ref, ...safe } = r;
            return safe;
        });

        return res.json({ count: sanitizedRecords.length, records: sanitizedRecords });
    } catch (err) {
        console.error('List all records error:', err.message);
        return res.status(500).json({ error: 'Failed to list records', message: err.message });
    }
});

// =========================================================
// POLICY MANAGEMENT
// =========================================================
app.post('/policy', authenticateUser, async (req, res) => {
    try {
        const { policy_id, rules, categories } = req.body;
        if (!policy_id || !rules) return res.status(400).json({ error: 'policy_id and rules are required' });

        const policyData = { policy_id, rules, categories: categories || [] };
        const result = await backend.createPolicy(req.auth.userId, req.auth.org, policy_id, policyData);

        return res.json({ success: true, policy_id: result, message: 'Policy created successfully' });
    } catch (err) {
        console.error('Create policy error:', err.message);
        return res.status(500).json({ error: 'Failed to create policy', message: err.message });
    }
});

app.get('/policy/:id', authenticateUser, async (req, res) => {
    try {
        const policyId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('GetPolicy', policyId);
        await gateway.disconnect();

        return res.json(JSON.parse(result.toString()));
    } catch (err) {
        console.error('Get policy error:', err.message);
        return res.status(500).json({ error: 'Failed to get policy', message: err.message });
    }
});

// =========================================================
// AUDIT
// =========================================================
app.post('/audit', authenticateUser, async (req, res) => {
    try {
        const { record_id, action, details } = req.body;
        if (!record_id || !action) return res.status(400).json({ error: 'record_id and action are required' });

        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.submitTransaction('AddAudit', record_id, action, details || '');
        await gateway.disconnect();

        return res.json({ success: true, audit_id: result.toString(), message: 'Audit entry added' });
    } catch (err) {
        console.error('Add audit error:', err.message);
        return res.status(500).json({ error: 'Failed to add audit', message: err.message });
    }
});

// =========================================================
// BLOCK HISTORY
// =========================================================
app.get('/block-history', authenticateUser, async (req, res) => {
    try {
        const limit = req.query.limit || 100;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        
        // Try to call GetAllHistory method
        // If it doesn't exist, fallback to ListAllRecords and build history from that
        let result;
        let history = [];
        
        try {
            console.log('[BLOCK HISTORY] Attempting to call GetAllHistory...');
            result = await contract.evaluateTransaction('GetAllHistory', limit.toString());
            history = JSON.parse(result.toString());
            console.log(`[BLOCK HISTORY] Successfully retrieved ${history.length} history entries`);
        } catch (methodErr) {
            console.warn('[BLOCK HISTORY] GetAllHistory method not available, using fallback approach');
            console.warn(`[BLOCK HISTORY] Error: ${methodErr.message}`);
            
            // Fallback: Get all records and create simple history entries
            try {
                const recordsResult = await contract.evaluateTransaction('ListAllRecords');
                const records = JSON.parse(recordsResult.toString());
                
                // Create history entries from current records
                // This won't show full history but will show current state
                history = records.map(record => ({
                    txId: 'current',
                    recordId: record.record_id || record.id,
                    timestamp: record.created_at || record.updated_at || new Date().toISOString(),
                    isDelete: false,
                    value: {
                        record_id: record.record_id || record.id,
                        case_id: record.case_id,
                        record_type: record.record_type,
                        uploader_org: record.uploader_org || record.org
                    }
                })).slice(0, parseInt(limit));
                
                console.log(`[BLOCK HISTORY] Fallback: Created ${history.length} entries from current records`);
            } catch (fallbackErr) {
                console.error('[BLOCK HISTORY] Fallback also failed:', fallbackErr.message);
                // Return empty array if both methods fail
                history = [];
            }
        }
        
        await gateway.disconnect();

        return res.json({ 
            success: true, 
            count: history.length, 
            history: history,
            note: history.length === 0 ? 'No history available. Chaincode may need to be redeployed with GetAllHistory method.' : undefined
        });
    } catch (err) {
        console.error('Get block history error:', err.message);
        return res.status(500).json({ 
            error: 'Failed to get block history', 
            message: err.message,
            hint: 'The GetAllHistory chaincode method may not be deployed. Please redeploy chaincode version 1.1 or later.'
        });
    }
});

app.get('/record/:id/history', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);
        const result = await contract.evaluateTransaction('GetRecordHistory', recordId);
        await gateway.disconnect();

        const history = JSON.parse(result.toString());
        return res.json({ 
            success: true, 
            record_id: recordId,
            count: history.length, 
            history: history 
        });
    } catch (err) {
        console.error('Get record history error:', err.message);
        return res.status(500).json({ error: 'Failed to get record history', message: err.message });
    }
});

// =========================================================
// HEALTH & VAULT STATUS
// =========================================================
app.get('/health', (req, res) => {
    return res.json({ status: 'healthy', service: 'CDMS API', timestamp: new Date().toISOString() });
});

app.get('/vault/status', async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.get(`${backend.vaultAddr}/v1/sys/health`, {
            headers: { 'X-Vault-Token': backend.vaultToken },
            validateStatus: () => true
        });

        return res.json({
            vault_connected: response.status === 200,
            vault_address: backend.vaultAddr,
            initialized: response.data?.initialized,
            sealed: response.data?.sealed
        });
    } catch (err) {
        return res.status(503).json({ vault_connected: false, error: err.message });
    }
});

// =========================================================
// START SERVER
// =========================================================
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
