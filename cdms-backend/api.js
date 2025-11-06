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
const UPLOADS_FALLBACK_PATH = path.join(__dirname, 'uploads_fallback.json');

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
if (!fs.existsSync(UPLOADS_FALLBACK_PATH)) fs.writeFileSync(UPLOADS_FALLBACK_PATH, '[]');

// Helper functions for upload fallback storage
function loadUploadsFallback() {
    if (!fs.existsSync(UPLOADS_FALLBACK_PATH)) return [];
    try {
        return JSON.parse(fs.readFileSync(UPLOADS_FALLBACK_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function saveUploadFallback(uploadData) {
    const uploads = loadUploadsFallback();
    uploads.push(uploadData);
    fs.writeFileSync(UPLOADS_FALLBACK_PATH, JSON.stringify(uploads, null, 2));
}

// Helper function to group transactions into blocks for testing
// In production, blocks are created by the orderer, but for testing we simulate this
function groupIntoBlocks(transactions, transactionsPerBlock = 5) {
    if (!transactions || transactions.length === 0) return [];
    
    const blocks = [];
    const sortedTxs = transactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    for (let i = 0; i < sortedTxs.length; i += transactionsPerBlock) {
        const blockTxs = sortedTxs.slice(i, i + transactionsPerBlock);
        const blockNumber = Math.floor(i / transactionsPerBlock) + 1;
        const blockTimestamp = blockTxs[blockTxs.length - 1].timestamp; // Use last transaction timestamp
        
        // Create a simple block hash (in real blockchain, this would be calculated by orderer)
        const blockHash = require('crypto')
            .createHash('sha256')
            .update(JSON.stringify(blockTxs) + blockNumber + blockTimestamp)
            .digest('hex');
        
        blocks.push({
            blockNumber,
            blockHash: `0x${blockHash.substring(0, 64)}`,
            timestamp: blockTimestamp,
            transactionCount: blockTxs.length,
            transactions: blockTxs.map(tx => ({
                txId: tx.txId,
                recordId: tx.recordId || tx.value?.record_id,
                action: tx.action || tx.value?.action || 'UNKNOWN',
                actor: tx.actor || tx.value?.uploader_id || 'SYSTEM',
                timestamp: tx.timestamp,
                value: tx.value || {},
                source: tx.source || 'fallback',
                blockchainRecorded: tx.blockchainRecorded !== undefined ? tx.blockchainRecorded : false
            })),
            source: 'simulated' // Mark as simulated for testing
        });
    }
    
    return blocks;
}

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

        // Judiciary can only register for OrgB
        if (role === 'judiciary' && org !== 'B') {
            return res.status(400).json({ error: 'Judiciary can only register for Organization B' });
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
        // Roles: district_police, forensics_officer, investigator, admin, judiciary
        // Judiciary can only register for OrgB
        if (user.role === 'judiciary' && user.org !== 'B') {
            throw new Error('Judiciary can only register for Organization B');
        }
        
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
            } else if (user.role === 'admin' || user.role === 'district_police' || user.role === 'districtPoliceB' || user.role === 'judiciary') {
                // Judiciary uses the same registration function as district_police for OrgB
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
// Helper Functions
// =========================================================
/**
 * Get admin identity for blockchain operations (has Writers policy)
 * @param {string} org - Organization name (Org1 or Org2)
 * @returns {string} Admin identity (AdminOrg1 or AdminOrg2)
 */
function getAdminIdentity(org) {
    const orgForBlockchain = org === 'Org2' ? 'Org2' : 'Org1';
    return orgForBlockchain === 'Org2' ? 'AdminOrg2' : 'AdminOrg1';
}

// =========================================================
// Authentication Middleware
// =========================================================
function authenticateUser(req, res, next) {
    let userId, org;
    
    // Try to get from Authorization header first (for all requests)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const parts = token.split(':');
        if (parts.length === 2) {
            // Format: Bearer email:org - need to convert email to userId
            const email = parts[0];
            org = parts[1];
            
            // Look up user in approved_users.json to get walletId
            const approvedUsers = loadJSON(APPROVED_PATH);
            const user = approvedUsers.get(email);
            
            if (user) {
                // Use walletId if available, otherwise calculate
                userId = user.walletId || (user.role === 'admin'
                    ? (user.org === 'A' ? 'AdminOrg1' : 'AdminOrg2')
                    : user.username || email);
            } else {
                // Fallback: use email as-is (will need to handle in backend)
                userId = email;
            }
        }
    }
    
    // Fallback: try body or query params (for backward compatibility)
    if (!userId || !org) {
        const source = req.method === 'GET' ? req.query : req.body;
        userId = userId || source.userId;
        org = org || source.org;
    }

    if (!userId || !org) {
        return res.status(401).json({
            error: 'Missing authentication credentials',
            message: 'userId and org are required. Please ensure you are logged in.'
        });
    }

    req.auth = { userId, org };
    next();
}

// =========================================================
// RECORD MANAGEMENT ENDPOINTS WITH MINIO
// =========================================================
const { uploadFile, generatePresignedUrl, initializeBucket } = require('./minioClient');

// Initialize MinIO on startup
initializeBucket().catch(err => {
    console.error('Failed to initialize MinIO:', err.message);
});

// upload.single parses multipart/form-data, authenticateUser reads from Authorization header
app.post('/record/upload', upload.single('file'), authenticateUser, async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file provided' });

        const { case_id, record_type, description } = req.body;
        if (!case_id) return res.status(400).json({ error: 'case_id is required' });

        console.log(`[UPLOAD] User ${req.auth.userId} uploading file ${req.file.originalname} for case ${case_id}`);

        // Step 1: Upload to MinIO
        const minioResult = await uploadFile(
            req.file.buffer,
            req.file.originalname,
            case_id,
            req.auth.org
        );

        // Step 2: Create record metadata for blockchain
        const recordId = `REC_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const recordData = {
            record_id: recordId,
            case_id,
            record_type: record_type || 'Evidence',
            filename: req.file.originalname,
            file_hash: minioResult.hash,
            file_size: minioResult.size,
            minio_object_name: minioResult.objectName,
            minio_url: minioResult.url,
            mime_type: req.file.mimetype,
            description: description || '',
            uploader_org: req.auth.org,
            uploader_id: req.auth.userId,
            uploaded_at: minioResult.uploadedAt,
            created_at: new Date().toISOString()
        };

        // Step 3: Always store metadata locally as fallback (even if blockchain fails)
        const uploadFallbackData = {
            record_id: recordId,
            timestamp: new Date().toISOString(),
            action: 'UPLOAD',
            actor: req.auth.userId,
            details: `File uploaded: ${req.file.originalname} (${minioResult.size} bytes, hash: ${minioResult.hash.substring(0, 16)}...)`,
            value: recordData,
            txId: `LOCAL_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            blockchainRecorded: false
        };
        saveUploadFallback(uploadFallbackData);
        console.log(`[UPLOAD] 💾 Upload metadata saved locally as fallback`);

        // Step 4: Store on blockchain (OPTIONAL - skipped if SKIP_BLOCKCHAIN env var is set)
        // By default, blockchain recording is attempted but won't fail the upload if it doesn't work
        let blockchainSuccess = false;
        let blockchainError = null;
        
        // Skip blockchain if SKIP_BLOCKCHAIN is set to 'true'
        const skipBlockchain = process.env.SKIP_BLOCKCHAIN === 'true';
        
        if (skipBlockchain) {
            console.log('[UPLOAD] ⚠️ Blockchain recording SKIPPED (SKIP_BLOCKCHAIN=true). File stored only in MinIO.');
        } else {
            try {
                // Use admin identity for blockchain operations (has Writers policy)
                // User authentication is still maintained via req.auth.userId
                const adminId = getAdminIdentity(req.auth.org);
                
                console.log(`[UPLOAD] Using ${adminId} identity for blockchain operation (user: ${req.auth.userId})`);
                const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
                
                // Standard submission - uses peer from connection profile
                // Note: Multi-org endorsement requires both peers; with discovery disabled, 
                // this uses the peer from the connection profile. If multi-org policy requires 
                // both orgs, transactions may need explicit peer specification.
                await contract.submitTransaction('CreateRecord', JSON.stringify(recordData));

                console.log(`[UPLOAD] ✅ Record ${recordId} created on blockchain`);

                // Step 5: Add audit entry
                try {
                    await contract.submitTransaction(
                        'AddAudit',
                        recordId,
                        req.auth.userId,  // Keep actual user ID in audit trail
                        'UPLOAD',
                        `File uploaded: ${req.file.originalname} (${minioResult.size} bytes, hash: ${minioResult.hash.substring(0, 16)}...)`
                    );
                    
                    // Update fallback to mark as blockchain recorded
                    uploadFallbackData.blockchainRecorded = true;
                    const uploads = loadUploadsFallback();
                    const index = uploads.findIndex(u => u.record_id === recordId && u.timestamp === uploadFallbackData.timestamp);
                    if (index >= 0) {
                        uploads[index] = uploadFallbackData;
                        fs.writeFileSync(UPLOADS_FALLBACK_PATH, JSON.stringify(uploads, null, 2));
                    }
                } catch (auditErr) {
                    console.warn('[UPLOAD] Failed to add audit entry:', auditErr.message);
                }

                await gateway.disconnect();
                blockchainSuccess = true;
            } catch (blockchainErr) {
                console.error('[UPLOAD] Blockchain recording failed (file is still in MinIO):', blockchainErr.message);
                blockchainError = blockchainErr.message;
                // Don't fail the entire upload - file is already in MinIO
                // The blockchain record can be added later when peers are available
            }
        }

        // Return success even if blockchain recording failed
        // File is safely stored in MinIO and can be recorded on blockchain later
        return res.json({
            success: true,
            recordId,
            fileHash: minioResult.hash,
            minioUrl: minioResult.url,
            size: minioResult.size,
            blockchainRecorded: blockchainSuccess,
            message: blockchainSuccess 
                ? 'File uploaded to MinIO and recorded on blockchain successfully'
                : `File uploaded to MinIO successfully. Blockchain recording pending: ${blockchainError || 'Peers not responding'}`,
            warning: blockchainError ? `Blockchain not available: ${blockchainError}. File is safe in MinIO and will be recorded later.` : undefined
        });
    } catch (err) {
        console.error('Upload error:', err.message);
        return res.status(500).json({ error: 'Upload failed', message: err.message });
    }
});

app.get('/record/:id/download', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        
        // Check user role for download permission
        // Forensics Officer cannot download (view-only access)
        const approvedUsers = loadJSON(APPROVED_PATH);
        const userEmail = req.headers.authorization?.replace('Bearer ', '').split(':')[0];
        const user = approvedUsers.get(userEmail);
        
        if (!user) {
            return res.status(403).json({ error: 'User not found', message: 'User is not authorized' });
        }
        
        const userRole = user.role?.toLowerCase();
        if (userRole === 'forensics_officer' || userRole === 'forensicofficer' || userRole === 'forensics') {
            return res.status(403).json({ 
                error: 'Permission denied', 
                message: 'Forensics Officer role has view-only access. Download is not allowed.' 
            });
        }
        
        // Allowed roles: admin, district_police, investigator
        console.log(`[DOWNLOAD] User ${req.auth.userId} (role: ${userRole}) downloading record ${recordId}`);
        
        let metadata = null;
        
        // Try to get record metadata from blockchain first
        try {
            // Use admin identity for blockchain operations (has Writers policy)
            const adminId = getAdminIdentity(req.auth.org);
            const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
            const result = await contract.evaluateTransaction('ReadRecord', recordId);
            metadata = JSON.parse(result.toString());
            
            // Add audit entry for download
            try {
                await contract.submitTransaction(
                    'AddAudit',
                    recordId,
                    req.auth.userId,  // Keep actual user ID in audit trail
                    'DOWNLOAD',
                    `File downloaded: ${metadata.filename || recordId}`
                );
            } catch (auditErr) {
                console.warn('[DOWNLOAD] Failed to add audit entry:', auditErr.message);
            }
            
            await gateway.disconnect();
        } catch (blockchainErr) {
            console.warn('[DOWNLOAD] Blockchain query failed, trying fallback:', blockchainErr.message);
            
            // Fallback: Get metadata from local storage
            const fallbackUploads = loadUploadsFallback();
            const fallbackRecord = fallbackUploads.find(u => u.record_id === recordId);
            
            if (fallbackRecord && fallbackRecord.value) {
                metadata = fallbackRecord.value;
                console.log(`[DOWNLOAD] Using fallback metadata for record ${recordId}`);
            } else {
                throw new Error('Record not found in blockchain or local storage');
            }
        }
        
        if (!metadata) {
            return res.status(404).json({ error: 'Record not found', message: 'Record metadata not available' });
        }

        // If MinIO URL exists, download from MinIO
        if (metadata.minio_object_name) {
            const { downloadFile } = require('./minioClient');
            const fileBuffer = await downloadFile(metadata.minio_object_name);
            
            res.setHeader('Content-Type', metadata.mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${metadata.filename || recordId}"`);
            res.setHeader('Content-Length', fileBuffer.length);
            res.setHeader('X-File-Hash', metadata.file_hash || '');
            res.setHeader('X-Record-ID', recordId);

            console.log(`[DOWNLOAD] ✅ Successfully downloaded ${metadata.filename} (${fileBuffer.length} bytes)`);
            return res.send(fileBuffer);
        } else {
            // Fallback to old method if no MinIO URL (legacy records)
            const result = await backend.downloadRecord(req.auth.userId, req.auth.org, recordId);
            res.setHeader('Content-Type', result.metadata.mime_type || 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${result.metadata.filename}"`);
            res.setHeader('Content-Length', result.file.length);
            return res.send(result.file);
        }
    } catch (err) {
        console.error('Download error:', err.message);
        return res.status(500).json({ error: 'Download failed', message: err.message });
    }
});

app.get('/record/:id/metadata', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        let metadata = null;
        
        // Try to get from blockchain first
        try {
            // Use admin identity for blockchain operations (has Writers policy)
            const adminId = getAdminIdentity(req.auth.org);
            const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
            const result = await contract.evaluateTransaction('ReadRecord', recordId);
            metadata = JSON.parse(result.toString());
            delete metadata.wrapped_key_ref;
            await gateway.disconnect();
        } catch (blockchainErr) {
            console.warn('[METADATA] Blockchain query failed, trying fallback:', blockchainErr.message);
            
            // Fallback: Get metadata from local storage
            const fallbackUploads = loadUploadsFallback();
            const fallbackRecord = fallbackUploads.find(u => u.record_id === recordId);
            
            if (fallbackRecord && fallbackRecord.value) {
                metadata = fallbackRecord.value;
                delete metadata.wrapped_key_ref; // Remove sensitive fields
                console.log(`[METADATA] Using fallback metadata for record ${recordId}`);
            } else {
                throw new Error('Record not found in blockchain or local storage');
            }
        }
        
        if (!metadata) {
            return res.status(404).json({ error: 'Record not found', message: 'Record metadata not available' });
        }

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
        let records = [];
        let blockchainRecords = [];
        
        // Try to get records from blockchain
        try {
            // Use admin identity for blockchain operations (has Writers policy)
            const adminId = getAdminIdentity(req.auth.org);
            const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
            const result = await contract.evaluateTransaction('ListAllRecords');
            await gateway.disconnect();

            blockchainRecords = JSON.parse(result.toString());
            console.log(`[RECORDS] ✅ Retrieved ${blockchainRecords.length} records from blockchain`);
        } catch (blockchainErr) {
            console.warn('[RECORDS] Blockchain query failed, using fallback:', blockchainErr.message);
            console.warn('[RECORDS] This may indicate chaincode is not deployed or peer is not responding');
            console.warn('[RECORDS] Falling back to local storage...');
        }
        
        // Get fallback data from local storage (uploads_fallback.json)
        const fallbackUploads = loadUploadsFallback();
        const fallbackRecords = fallbackUploads.map(upload => {
            if (upload.value) {
                return {
                    record_id: upload.value.record_id || upload.record_id,
                    case_id: upload.value.case_id,
                    record_type: upload.value.record_type || 'Evidence',
                    filename: upload.value.filename,
                    file_hash: upload.value.file_hash,
                    file_size: upload.value.file_size,
                    mime_type: upload.value.mime_type,
                    uploader_id: upload.value.uploader_id || upload.actor,
                    uploader_org: upload.value.uploader_org,
                    uploaded_at: upload.value.uploaded_at || upload.timestamp,
                    created_at: upload.value.created_at || upload.timestamp,
                    description: upload.value.description || '',
                    minio_object_name: upload.value.minio_object_name,
                    minio_url: upload.value.minio_url,
                    blockchainRecorded: upload.blockchainRecorded || false,
                    source: 'fallback'
                };
            }
            return null;
        }).filter(r => r !== null);
        
        console.log(`[RECORDS] Found ${fallbackRecords.length} records in local storage`);
        
        // Combine blockchain and fallback records, removing duplicates
        const combinedRecords = [...blockchainRecords];
        const blockchainRecordIds = new Set(blockchainRecords.map(r => r.record_id));
        
        // Add fallback records that aren't in blockchain
        fallbackRecords.forEach(fallbackRecord => {
            if (!blockchainRecordIds.has(fallbackRecord.record_id)) {
                combinedRecords.push(fallbackRecord);
            }
        });
        
        // Sanitize records (remove sensitive fields)
        const sanitizedRecords = combinedRecords.map(r => {
            const { wrapped_key_ref, ...safe } = r;
            return safe;
        });

        return res.json({ 
            count: sanitizedRecords.length, 
            records: sanitizedRecords,
            note: blockchainRecords.length === 0 && fallbackRecords.length > 0 
                ? 'Showing records from local storage. Blockchain queries are currently unavailable.' 
                : undefined
        });
    } catch (err) {
        console.error('List all records error:', err.message);
        
        // Fallback: Try to return records from local storage even if everything fails
        try {
            const fallbackUploads = loadUploadsFallback();
            const fallbackRecords = fallbackUploads.map(upload => {
                if (upload.value) {
                    const { wrapped_key_ref, ...safe } = upload.value;
                    return safe;
                }
                return null;
            }).filter(r => r !== null);
            
            console.log(`[RECORDS] Fallback: Returning ${fallbackRecords.length} records from local storage`);
            
            return res.json({ 
                count: fallbackRecords.length, 
                records: fallbackRecords,
                warning: 'Blockchain queries failed. Showing records from local storage only.',
                error: err.message
            });
        } catch (fallbackErr) {
            return res.status(500).json({ 
                error: 'Failed to list records', 
                message: err.message,
                fallbackError: fallbackErr.message
            });
        }
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
        // Use admin identity for blockchain operations (has Writers policy)
        const adminId = getAdminIdentity(req.auth.org);
        const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
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

        // Use admin identity for blockchain operations (has Writers policy)
        const adminId = getAdminIdentity(req.auth.org);
        const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
        const result = await contract.submitTransaction('AddAudit', record_id, req.auth.userId, action, details || '');
        await gateway.disconnect();

        return res.json({ success: true, audit_id: result.toString(), message: 'Audit entry added' });
    } catch (err) {
        console.error('Add audit error:', err.message);
        return res.status(500).json({ error: 'Failed to add audit', message: err.message });
    }
});

app.get('/audit/trail', authenticateUser, async (req, res) => {
    try {
        const recordId = req.query.record_id;
        
        let auditData = [];
        let blockchainData = [];
        
        // Try to get data from blockchain
        try {
            // Use admin identity for blockchain operations (has Writers policy)
            const adminId = getAdminIdentity(req.auth.org);
            const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
            
            if (recordId) {
                // Get audit trail for specific record
                const result = await contract.evaluateTransaction('GetAuditTrail', recordId);
                blockchainData = JSON.parse(result.toString());
            } else {
                // Get all audit entries across all records
                const result = await contract.evaluateTransaction('GetAllHistory', '1000');
                const allHistory = JSON.parse(result.toString());
                
                // Filter for audit-related transactions
                blockchainData = allHistory.filter(entry => 
                    entry.value && (
                        entry.value.action || 
                        entry.value.audit_id ||
                        entry.value.uploader_id
                    )
                ).map(entry => ({
                    timestamp: entry.timestamp,
                    recordId: entry.recordId || entry.value.record_id,
                    action: entry.value.action || 'UNKNOWN',
                    actor: entry.value.actor || entry.value.uploader_id || 'SYSTEM',
                    details: entry.value.details || JSON.stringify(entry.value),
                    txId: entry.txId,
                    source: 'blockchain'
                }));
            }
            
            await gateway.disconnect();
        } catch (blockchainErr) {
            console.warn('[AUDIT TRAIL] Blockchain query failed, using fallback:', blockchainErr.message);
        }
        
        // Get fallback data from local storage
        const fallbackUploads = loadUploadsFallback();
        const fallbackData = fallbackUploads
            .filter(upload => !recordId || upload.record_id === recordId)
            .map(upload => ({
                timestamp: upload.timestamp,
                recordId: upload.record_id,
                action: upload.action || 'UPLOAD',
                actor: upload.actor || upload.value?.uploader_id || 'SYSTEM',
                details: upload.details || `File uploaded: ${upload.value?.filename || 'Unknown'}`,
                txId: upload.txId,
                source: 'fallback',
                blockchainRecorded: upload.blockchainRecorded || false
            }));
        
        // Combine blockchain and fallback data, removing duplicates
        const combinedData = [...blockchainData];
        const blockchainRecordIds = new Set(blockchainData.map(a => a.txId));
        
        // Add fallback entries that aren't already in blockchain
        fallbackData.forEach(fallback => {
            if (!blockchainRecordIds.has(fallback.txId) && 
                (!recordId || fallback.recordId === recordId)) {
                combinedData.push(fallback);
            }
        });
        
        // Sort by timestamp (newest first)
        auditData = combinedData.sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        return res.json({ 
            success: true, 
            count: auditData.length,
            record_id: recordId || 'ALL',
            audit_trail: auditData 
        });
    } catch (err) {
        console.error('Get audit trail error:', err.message);
        return res.status(500).json({ error: 'Failed to get audit trail', message: err.message });
    }
});

// =========================================================
// BLOCK HISTORY & BLOCKCHAIN QUERIES
// =========================================================

// Get real blocks from blockchain
app.get('/blocks', authenticateUser, async (req, res) => {
    try {
        const adminId = getAdminIdentity(req.auth.org);
        console.log('[BLOCKS] Querying real blockchain blocks...');
        
        const blocks = await backend.getAllBlocks(adminId, req.auth.org);
        
        console.log(`[BLOCKS] ✅ Retrieved ${blocks.length} blocks from blockchain`);
        
        return res.json({
            success: true,
            count: blocks.length,
            blocks: blocks,
            source: 'blockchain'
        });
    } catch (err) {
        console.error('[BLOCKS] Error querying blocks:', err.message);
        return res.status(500).json({
            error: 'Failed to query blocks',
            message: err.message
        });
    }
});

// Get a specific block by number
app.get('/blocks/:blockNumber', authenticateUser, async (req, res) => {
    try {
        const blockNumber = parseInt(req.params.blockNumber);
        if (isNaN(blockNumber) || blockNumber < 0) {
            return res.status(400).json({ error: 'Invalid block number' });
        }
        
        const adminId = getAdminIdentity(req.auth.org);
        console.log(`[BLOCKS] Querying block #${blockNumber}...`);
        
        const block = await backend.getBlock(blockNumber, adminId, req.auth.org);
        
        console.log(`[BLOCKS] ✅ Retrieved block #${blockNumber}`);
        
        return res.json({
            success: true,
            block: block,
            source: 'blockchain'
        });
    } catch (err) {
        console.error(`[BLOCKS] Error querying block ${req.params.blockNumber}:`, err.message);
        return res.status(500).json({
            error: 'Failed to query block',
            message: err.message
        });
    }
});

// Get blockchain info (height, latest block hash, etc.)
app.get('/blockchain/info', authenticateUser, async (req, res) => {
    try {
        const adminId = getAdminIdentity(req.auth.org);
        console.log('[BLOCKCHAIN-INFO] Querying blockchain info...');
        
        const info = await backend.getBlockchainInfo(adminId, req.auth.org);
        
        console.log(`[BLOCKCHAIN-INFO] ✅ Blockchain height: ${info.height}`);
        
        return res.json({
            success: true,
            info: info,
            source: 'blockchain'
        });
    } catch (err) {
        console.error('[BLOCKCHAIN-INFO] Error querying blockchain info:', err.message);
        return res.status(500).json({
            error: 'Failed to query blockchain info',
            message: err.message
        });
    }
});

// Enhanced block history endpoint - tries real blocks first, then falls back
app.get('/block-history', authenticateUser, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit || 100);
        const useRealBlocks = req.query.real === 'true' || req.query.real === '1';
        
        // Try to get real blocks from blockchain first
        let realBlocks = [];
        let blockchainInfo = null;
        
        if (useRealBlocks) {
            try {
                const adminId = getAdminIdentity(req.auth.org);
                console.log('[BLOCK HISTORY] Attempting to query real blockchain blocks...');
                
                // Get blockchain info
                blockchainInfo = await backend.getBlockchainInfo(adminId, req.auth.org);
                
                // Get all blocks
                realBlocks = await backend.getAllBlocks(adminId, req.auth.org);
                
                // Limit to requested number
                if (limit > 0) {
                    realBlocks = realBlocks.slice(-limit); // Get latest blocks
                }
                
                console.log(`[BLOCK HISTORY] ✅ Retrieved ${realBlocks.length} real blocks from blockchain`);
            } catch (realBlocksErr) {
                console.warn('[BLOCK HISTORY] Failed to get real blocks, falling back to chaincode queries:', realBlocksErr.message);
            }
        }
        
        // Fallback: Try chaincode queries (GetAllHistory, ListAllRecords)
        let blockchainHistory = [];
        let fallbackHistory = [];
        
        try {
            const adminId = getAdminIdentity(req.auth.org);
            const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
            
            try {
                console.log('[BLOCK HISTORY] Attempting to call GetAllHistory...');
                const result = await contract.evaluateTransaction('GetAllHistory', limit.toString());
                blockchainHistory = JSON.parse(result.toString());
                console.log(`[BLOCK HISTORY] Successfully retrieved ${blockchainHistory.length} history entries from blockchain`);
            } catch (methodErr) {
                console.warn('[BLOCK HISTORY] GetAllHistory method not available, trying ListAllRecords');
                
                try {
                    const recordsResult = await contract.evaluateTransaction('ListAllRecords');
                    const records = JSON.parse(recordsResult.toString());
                    
                    blockchainHistory = records.map(record => ({
                        txId: `BLOCKCHAIN_${record.record_id || record.id}`,
                        recordId: record.record_id || record.id,
                        timestamp: record.created_at || record.updated_at || new Date().toISOString(),
                        isDelete: false,
                        action: 'CREATE',
                        actor: record.uploader_id || 'SYSTEM',
                        value: {
                            record_id: record.record_id || record.id,
                            case_id: record.case_id,
                            record_type: record.record_type,
                            uploader_org: record.uploader_org || record.org
                        },
                        source: 'blockchain'
                    })).slice(0, limit);
                    
                    console.log(`[BLOCK HISTORY] Fallback: Created ${blockchainHistory.length} entries from current records`);
                } catch (listErr) {
                    console.warn('[BLOCK HISTORY] ListAllRecords also failed:', listErr.message);
                }
            }
            
            await gateway.disconnect();
        } catch (blockchainErr) {
            console.warn('[BLOCK HISTORY] Blockchain query failed, using local fallback:', blockchainErr.message);
        }
        
        // Get fallback data from local storage
        const fallbackUploads = loadUploadsFallback();
        fallbackHistory = fallbackUploads.map(upload => ({
            txId: upload.txId,
            recordId: upload.record_id,
            timestamp: upload.timestamp,
            isDelete: false,
            action: upload.action || 'UPLOAD',
            actor: upload.actor || upload.value?.uploader_id || 'SYSTEM',
            value: upload.value || {},
            source: 'fallback',
            blockchainRecorded: upload.blockchainRecorded || false
        }));
        
        // If we have real blocks, return them
        if (realBlocks.length > 0) {
            return res.json({
                success: true,
                count: realBlocks.length,
                blockCount: realBlocks.length,
                blockchainInfo: blockchainInfo,
                blocks: realBlocks,
                source: 'blockchain',
                note: 'Real blocks from blockchain ledger'
            });
        }
        
        // Otherwise, combine chaincode history and fallback
        const combinedHistory = [...blockchainHistory];
        const blockchainTxIds = new Set(blockchainHistory.map(h => h.txId));
        
        fallbackHistory.forEach(fallback => {
            if (!blockchainTxIds.has(fallback.txId)) {
                combinedHistory.push(fallback);
            }
        });
        
        const sortedHistory = combinedHistory
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .slice(0, limit);
        
        // Group transactions into blocks for display (if no real blocks available)
        const transactionsPerBlock = parseInt(req.query.blockSize || 5);
        const blocks = groupIntoBlocks(sortedHistory, transactionsPerBlock);
        
        const transactions = sortedHistory
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        console.log(`[BLOCK HISTORY] Created ${blocks.length} simulated blocks from ${sortedHistory.length} transactions`);

        return res.json({ 
            success: true, 
            count: sortedHistory.length,
            blockCount: blocks.length,
            transactionsPerBlock: transactionsPerBlock,
            blocks: blocks,
            transactions: transactions,
            source: 'simulated',
            note: sortedHistory.length === 0 
                ? 'No history available. Upload some files to see block history.' 
                : 'Using simulated blocks. Query with ?real=true to get real blockchain blocks.'
        });
    } catch (err) {
        console.error('Get block history error:', err.message);
        return res.status(500).json({ 
            error: 'Failed to get block history', 
            message: err.message
        });
    }
});

app.get('/record/:id/history', authenticateUser, async (req, res) => {
    try {
        const recordId = req.params.id;
        // Use admin identity for blockchain operations (has Writers policy)
        const adminId = getAdminIdentity(req.auth.org);
        const { contract, gateway } = await backend.getContract(adminId, req.auth.org);
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

// Get TLS certificates (for connection profile generation)
app.get('/certificates/orderer', async (req, res) => {
    try {
        const ledgerInfo = require('./ledger-info');
        const cert = await ledgerInfo.getOrdererTLSCertificate();
        return res.json({
            success: true,
            certificate: cert,
            type: 'orderer'
        });
    } catch (err) {
        console.error('[CERTIFICATES] Error getting orderer certificate:', err.message);
        return res.status(500).json({
            error: 'Failed to get orderer certificate',
            message: err.message
        });
    }
});

app.get('/certificates/peer/:org', async (req, res) => {
    try {
        const org = req.params.org || 'Org1';
        const ledgerInfo = require('./ledger-info');
        const cert = ledgerInfo.loadTLSCertificate(org, 'peer');
        return res.json({
            success: true,
            certificate: cert,
            organization: org,
            type: 'peer'
        });
    } catch (err) {
        console.error(`[CERTIFICATES] Error getting peer certificate for ${req.params.org}:`, err.message);
        return res.status(500).json({
            error: 'Failed to get peer certificate',
            message: err.message
        });
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
