# CDMS Blockchain Architecture - Executive Summary

## Quick Reference Guide

### Architecture Overview

```
Frontend (React) 
    ↓ HTTP/REST
Backend (Node.js/Express)
    ↓ Fabric Gateway SDK
Hyperledger Fabric Network
    ├─> Peers (Org1, Org2) - Endorse transactions
    ├─> Orderer - Creates blocks
    └─> CA - Manages identities
    ↓
Ledger (Blockchain)
```

**Supporting Services**:
- **Vault (KMS)**: Key encryption/decryption
- **MinIO**: File storage (encrypted evidence)

---

## Key Components

### 1. Certificate Authority (CA)
**What**: Issues X.509 certificates for user identities
**How**: 
- Admin enrollment: `enrollAdminA.js` → CA → Wallet
- User registration: `registerDistrictPoliceA.js` → CA → Wallet
**Files**: `enrollAdminA.js`, `enrollAdminB.js`, `register*.js`

### 2. Endorsement Process
**What**: Peers validate transactions before block creation
**Policy**: `AND('Org1MSP.member', 'Org2MSP.member')` - Requires BOTH orgs
**Flow**: 
1. Transaction proposal → Peers
2. Peers execute chaincode → Validate → Sign
3. Gateway checks both endorsements → Send to orderer
4. Orderer creates block → Commits to ledger

### 3. Policy Management
**Types**:
- **Endorsement Policy**: Requires both Org1 and Org2 to endorse
- **RBAC Policy**: Role-based access (admin, district_police, investigator, etc.)
- **Writers Policy**: Only admins can submit transactions (hence we use AdminOrg1/AdminOrg2)
**Location**: `chaincode/index.js` - `_isAllowed()` method

---

## Backend-Fabric Integration Points

### Integration Flow

```
API Request (api.js)
    ↓
Get Admin Identity (getAdminIdentity)
    ↓
Backend Gateway (backend.js)
    ├─> Load connection profile (connection-org1.json)
    ├─> Load identity from wallet (AdminOrg1)
    └─> Connect to Fabric Gateway
    ↓
Fabric Gateway SDK
    ├─> Send to Peer Org1 (endorse)
    ├─> Send to Peer Org2 (endorse)
    └─> Check endorsement policy
    ↓
Orderer Service
    ├─> Create block
    └─> Broadcast to peers
    ↓
Ledger (Blockchain)
```

### Key Files

| File | Purpose | Integration Point |
|------|---------|-------------------|
| `api.js` | REST API endpoints | Calls `backend.getContract()` |
| `backend.js` | Fabric Gateway integration | Connects to Fabric network |
| `chaincode/index.js` | Smart contract logic | Executes on peers |
| `enrollAdminA.js` | Admin enrollment | Connects to CA |
| `register*.js` | User registration | Connects to CA |
| `minioClient.js` | File storage | Stores evidence files |
| `ledger-info.js` | Block querying | Queries blockchain blocks |

---

## Transaction Types

### 1. Write Transactions (Submit)
**Examples**: CreateRecord, UpdateRecord, DeleteRecord
**Flow**: 
- Proposal → Peers (endorse) → Orderer → Block → Ledger
- Requires endorsement from both Org1 and Org2
- Creates new block

### 2. Read Transactions (Query)
**Examples**: ReadRecord, ListAllRecords, GetAuditTrail
**Flow**:
- Query → One peer → Returns results
- No endorsement needed
- No block created

---

## Data Storage

### Where Data is Stored

| Data Type | Storage Location | Purpose |
|-----------|------------------|---------|
| **Evidence Files** | MinIO (encrypted) | Actual file storage |
| **File Metadata** | Blockchain (ledger) | Record details, hash, key ref |
| **Encryption Keys** | Vault (wrapped) | Key management |
| **User Identities** | Wallet (certificates) | Fabric authentication |
| **User Database** | `approved_users.json` | User accounts |
| **System Events** | `system_events_fallback.json` | Login, logout, etc. |
| **Upload Metadata** | `uploads_fallback.json` | Local backup |

---

## Security Features

### 1. Encryption
- **Files**: Encrypted with DEK (Data Encryption Key) before storage
- **Keys**: DEK wrapped with KEK (Master Key) stored in Vault
- **Storage**: Encrypted files in MinIO, wrapped key ref in blockchain

### 2. Access Control
- **RBAC**: Role-based permissions in chaincode
- **Endorsement Policy**: Multi-org consensus required
- **Writers Policy**: Only admins can submit transactions

### 3. Audit Trail
- All operations logged to blockchain
- System events tracked locally (login, logout, etc.)
- Record history maintained in ledger

---

## File-by-File Summary

### Core Backend Files

**`api.js`** (2,000+ lines)
- Main Express server
- All REST API endpoints
- User management, record operations, audit, block history
- System event logging

**`backend.js`** (600+ lines)
- Fabric Gateway integration
- Vault KMS operations
- Block querying methods
- Connection management

**`chaincode/index.js`** (900+ lines)
- Smart contract logic
- RBAC enforcement
- Record CRUD operations
- Audit trail management
- System event logging

**`minioClient.js`**
- MinIO storage operations
- File upload/download
- Bucket management

**`ledger-info.js`**
- Raw block querying
- Blockchain info retrieval
- TLS certificate loading

### CA & Enrollment Files

- `enrollAdminA.js` / `enrollAdminB.js`: Admin enrollment
- `registerDistrictPoliceA.js` / `registerDistrictPoliceB.js`: User registration
- `registerInvestigator*.js`: Investigator registration
- `registerForensicsOfficer*.js`: Forensics officer registration

### Utility Files

- `setup-test-admin.js`: Initial admin setup
- `add-org2-admin.js`: Add Org2 admin
- `list-wallet-identities.js`: List wallet identities
- `block-monitor.js`: Real-time block monitoring
- `check-blocks.js`: Block querying utilities

### Configuration Files

- `connection-org1.json` / `connection-org2.json`: Fabric connection profiles
- `approved_users.json`: User database
- `pending_registrations.json`: Pending registrations
- `uploads_fallback.json`: Upload metadata backup
- `system_events_fallback.json`: System events storage

---

## Key Interactions

### How Backend Interacts with Fabric

1. **Identity Management**:
   - `enrollAdminA.js` → CA → Wallet
   - `api.js` → `register*.js` → CA → Wallet

2. **Transaction Submission**:
   - `api.js` → `backend.getContract()` → Gateway → Peers → Orderer → Ledger

3. **Query Execution**:
   - `api.js` → `backend.getContract()` → Gateway → Peer → Results

4. **Block Querying**:
   - `api.js` → `backend.getAllBlocks()` → `ledger-info.js` → Peer CLI → Blocks

### How Components Interact

```
Vault (KMS)
    ↑ (wrap/unwrap keys)
Backend (backend.js)
    ↓ (encrypted files)
MinIO (Storage)
    ↑ (file storage)
API (api.js)
    ↓ (metadata + key ref)
Fabric (Blockchain)
```

---

## Presentation Tips

### 1. Start with Architecture
- Show overall system diagram
- Explain 3-tier architecture (Frontend → Backend → Blockchain)

### 2. Explain CA Flow
- Show how identities are created
- Demonstrate enrollment process
- Show wallet contents

### 3. Demonstrate Endorsement
- Explain why both orgs must endorse
- Show transaction flow diagram
- Highlight security benefits

### 4. Show Integration Points
- Walk through `api.js` → `backend.js` → Fabric
- Show code examples
- Explain data flow

### 5. Highlight Security
- Encryption (Vault + MinIO)
- RBAC (chaincode)
- Endorsement policy
- Audit trail

### 6. Live Demo
- Upload file → Show block creation
- View records → Show blockchain query
- Check block history → Show all transactions

---

## Common Questions & Answers

**Q: Why use admin identity for transactions?**
A: Regular users don't have Writers policy. Admin identity has necessary permissions. User info still tracked in audit trail.

**Q: Why local storage for events?**
A: Ensures events are always logged even if blockchain is unavailable. Can be migrated to blockchain later.

**Q: How does multi-org endorsement work?**
A: Gateway sends proposal to both peers. Both must endorse. Only then transaction sent to orderer.

**Q: What is the difference between submit and evaluate?**
A: Submit requires endorsement and creates block. Evaluate is read-only, no endorsement, no block.

**Q: Where are files actually stored?**
A: Encrypted files in MinIO, metadata in blockchain, encryption keys in Vault.

---

This executive summary provides a quick reference for your presentation. Use the detailed `PROJECT_PRESENTATION_BLOCKCHAIN_ARCHITECTURE.md` for in-depth explanations.

