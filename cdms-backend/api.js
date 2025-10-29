// =========================================================
// --- User Registration, Login & CDMS API ---
// =========================================================
'use strict';

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const CDMSBackend = require('./backend');

// Registration scripts (must accept username, email where applicable)
const registerForensicsOfficerA = require('./registerForensicsOfficerA');
const registerInvestigatorA = require('./registerInvestigatorA');
const registerDistrictPoliceA = require('./registerDistrictPoliceA');
const registerForensicsOfficerB = require('./registerForensicsOfficerB');
const registerInvestigatorB = require('./registerInvestigatorB');
const registerDistrictPoliceB = require('./registerDistrictPoliceB');

// File paths
const PENDING_REG_PATH = path.join(__dirname, 'pending_registrations.json');
const APPROVED_PATH = path.join(__dirname, 'approved_users.json');

// Utility helpers
function loadJSON(filepath) {
  if (!fs.existsSync(filepath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return [];
  }
}
function saveJSON(filepath, data) {
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

// Ensure files exist
if (!fs.existsSync(PENDING_REG_PATH)) fs.writeFileSync(PENDING_REG_PATH, '[]');
if (!fs.existsSync(APPROVED_PATH)) fs.writeFileSync(APPROVED_PATH, '[]');

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------
// Registration endpoint
// ---------------------------------------------------------
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, org } = req.body;
    if (!username || !email || !password || !role || !org) {
      return res.status(400).json({ error: 'All fields required: username, email, password, role, org' });
    }

    const pending = loadJSON(PENDING_REG_PATH);
    const approved = loadJSON(APPROVED_PATH);

    if (pending.find(u => u.email === email) || approved.find(u => u.email === email)) {
      return res.status(409).json({ error: 'User already registered or pending approval' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    pending.push({ username, email, password: hashedPassword, role, org, status: 'pending' });
    saveJSON(PENDING_REG_PATH, pending);

    return res.json({ success: true, message: 'Registration request submitted. Awaiting admin approval.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed', message: err.message });
  }
});

// ---------------------------------------------------------
// Login endpoint
// Expects { email, password, org } where org is 'A' or 'B'
// ---------------------------------------------------------
app.post('/login', async (req, res) => {
  try {
    const { email, password, org } = req.body;
    if (!email || !password || !org) {
      return res.status(400).json({ error: 'Email, password, and org are required' });
    }

    const pending = loadJSON(PENDING_REG_PATH);
    if (pending.find(u => u.email === email)) {
      return res.status(403).json({ error: 'Registration pending admin approval' });
    }

    const approved = loadJSON(APPROVED_PATH);
    const foundUser = approved.find(u => u.email === email);
    if (!foundUser) {
      return res.status(401).json({ error: 'User not registered or approved yet' });
    }

    const match = await bcrypt.compare(password, foundUser.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Verify user exists in Fabric wallet
    try {
      const userOrg = foundUser.org === 'A' ? 'Org1' : 'Org2';

      // For admins, use AdminOrg1/AdminOrg2. For normal users, wallet id is derived from email.
      const walletId = foundUser.role === 'admin'
        ? (foundUser.org === 'A' ? 'AdminOrg1' : 'AdminOrg2')
        : foundUser.email.toLowerCase().replace(/[@.]/g, '_');

      // Confirm the identity exists in the wallet & can connect
      await backend.getContract(walletId, userOrg);

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
      console.error('Fabric identity not found:', err.message);
      return res.status(401).json({ error: 'Fabric identity not found', message: err.message });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed', message: err.message });
  }
});

// ---------------------------------------------------------
// Approve registration (admin action)
// Body: { email }
// This will call appropriate register* script to enroll user in Fabric
// ---------------------------------------------------------
app.post('/approve-registration', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    let pending = loadJSON(PENDING_REG_PATH);
    const user = pending.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'No pending registration for this email' });

    console.log(`Approving user ${user.username} (${user.role}) for ${user.org}...`);

    // Choose correct registration function based on org & role
    if (user.org === 'A') {
      if (user.role === 'forensics_officer') {
        await registerForensicsOfficerA(user.username, user.email);
      } else if (user.role === 'investigator') {
        await registerInvestigatorA(user.username, user.email);
      } else if (user.role === 'admin' || user.role === 'district_police') {
        await registerDistrictPoliceA(user.username, user.email);
      } else {
        throw new Error(`Unknown role: ${user.role}`);
      }
    } else if (user.org === 'B') {
      if (user.role === 'forensics_officer') {
        await registerForensicsOfficerB(user.username, user.email);
      } else if (user.role === 'investigator') {
        await registerInvestigatorB(user.username, user.email);
      } else if (user.role === 'admin' || user.role === 'district_police') {
        await registerDistrictPoliceB(user.username, user.email);
      } else {
        throw new Error(`Unknown role: ${user.role}`);
      }
    } else {
      throw new Error(`Unknown organization: ${user.org}`);
    }

    // Move to approved list (add walletId for frontend convenience)
    let approved = loadJSON(APPROVED_PATH);
    approved.push({
      ...user,
      walletId: user.email.toLowerCase().replace(/[@.]/g, '_'),
    });
    saveJSON(APPROVED_PATH, approved);

    // Remove from pending
    pending = pending.filter(u => u.email !== email);
    saveJSON(PENDING_REG_PATH, pending);

    return res.json({
      success: true,
      message: `User ${user.username} approved and enrolled in Fabric (${user.org}). Use your email and password to log in.`,
      walletId: user.email.toLowerCase().replace(/[@.]/g, '_')
    });
  } catch (err) {
    console.error('Approval error:', err);
    return res.status(500).json({ error: 'Failed to approve user', message: err.message });
  }
});

// ---------------------------------------------------------
// Multer config for file uploads (memory)
// ---------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ---------------------------------------------------------
// Initialize backend (Vault + Fabric helpers)
// ---------------------------------------------------------
const backend = new CDMSBackend({
  vaultAddr: process.env.VAULT_ADDR || 'http://127.0.0.1:8200',
  vaultToken: process.env.VAULT_TOKEN
});

// initialize vault transit (best-effort)
backend.initVaultTransit().catch(err => {
  console.error('Failed to initialize Vault:', err.message);
});

// ---------------------------------------------------------
// Authentication middleware for record endpoints
// Expects userId and org either in body or query (client must supply walletId and org)
// ---------------------------------------------------------
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

// Upload record
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

// Download record
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

// Get metadata
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

// List records by case
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

// List all records (admin)
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
