# CDMS Blockchain Architecture - Complete Presentation Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Blockchain Architecture Flow](#blockchain-architecture-flow)
3. [Certificate Authority (CA) System](#certificate-authority-ca-system)
4. [Endorsement Process](#endorsement-process)
5. [Policy Management](#policy-management)
6. [Component Details](#component-details)
7. [Backend-Fabric Integration](#backend-fabric-integration)
8. [File-by-File Backend Breakdown](#file-by-file-backend-breakdown)
9. [Transaction Flow](#transaction-flow)
10. [Data Flow Diagrams](#data-flow-diagrams)

---

## 1. System Overview

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│  - Dashboard, Records, Upload, Audit, Block History            │
└───────────────────────────┬───────────────────────────────────┘
                             │ HTTP/REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js/Express)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   API.js    │  │  Backend.js  │  │  MinIO Client │           │
│  │  (Routes)   │  │ (Fabric GW)  │  │  (Storage)   │            │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                │                  │                   │
│         │                │                  │                   │
│         └────────────────┼──────────────────┘                   │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
            ▼                   ▼                   ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  Hyperledger │  │  HashiCorp   │  │    MinIO     │
        │    Fabric    │  │    Vault     │  │  (S3 Storage)│
        │  (Blockchain)│  │    (KMS)     │  │              │
        └──────────────┘  └──────────────┘  └──────────────┘
```

### Components

1. **Frontend**: React.js application for user interface
2. **Backend**: Node.js/Express REST API
3. **Hyperledger Fabric**: Blockchain network (2 organizations)
4. **HashiCorp Vault**: Key Management System (KMS)
5. **MinIO**: Object storage for evidence files
6. **Chaincode**: Smart contracts for blockchain logic

---

## 2. Blockchain Architecture Flow

### Complete Transaction Flow

```
User Action (Frontend)
    ↓
API Endpoint (api.js)
    ↓
Backend Gateway (backend.js)
    ↓
Fabric Gateway SDK
    ↓
┌─────────────────────────────────────────┐
│        PEER ENDORSEMENT PROCESS         │
│  ┌──────────┐      ┌──────────┐        │
│  │Peer Org1 │      │Peer Org2 │        │
│  │  Endorse │  →   │  Endorse │        │
│  └────┬─────┘      └────┬─────┘        │
│       │                 │              │
│       └────────┬─────────┘              │
│                │                        │
│         Endorsement Policy               │
│         Check (Both Orgs)                │
└─────────────────┬───────────────────────┘
                  ↓
          Orderer Service
          ┌──────────────┐
          │  Block       │
          │  Creation    │
          └──────┬───────┘
                 ↓
          Block Committed
          to Ledger
```

---

## 3. Certificate Authority (CA) System

### What is Fabric CA?

Fabric CA (Certificate Authority) is the default CA implementation for Hyperledger Fabric. It provides:
- **Identity Management**: Issues and manages X.509 certificates
- **User Enrollment**: Registers and enrolls users
- **MSP (Membership Service Provider)**: Defines organizational identities

### CA Flow in CDMS

```
┌─────────────────────────────────────────────────────────────┐
│                    CA ENROLLMENT FLOW                       │
└─────────────────────────────────────────────────────────────┘

1. Network Start with CA
   └─> ./network.sh up createChannel -ca
       ├─> ca.org1.example.com (Port 7054)
       └─> ca.org2.example.com (Port 8054)

2. Admin Enrollment (Initial Setup)
   └─> enrollAdminA.js / enrollAdminB.js
       ├─> Connect to CA (ca.org1.example.com)
       ├─> Enroll with ID: 'admin', Secret: 'adminpw'
       ├─> Get X.509 Certificate
       └─> Store in Wallet (AdminOrg1 / AdminOrg2)

3. User Registration (When Admin Approves)
   └─> api.js → /approve-registration
       ├─> registerDistrictPoliceA.js / registerDistrictPoliceB.js
       ├─> Connect to CA via FabricCAServices
       ├─> Register new user (username, role, org)
       ├─> Enroll user (get certificate)
       └─> Store in Wallet (username_gmail_com)

4. Wallet Contents
   └─> cdms-backend/wallet/
       ├─> AdminOrg1.id (X.509 cert + private key)
       ├─> AdminOrg2.id (X.509 cert + private key)
       └─> user_identities.id (X.509 cert + private key)
```

### Key Files for CA

**`enrollAdminA.js`** / **`enrollAdminB.js`**
- Enrolls admin identities from Fabric CA
- Stores certificates in wallet
- Used during initial setup

**`registerDistrictPoliceA.js`** / **`registerDistrictPoliceB.js`** (and similar)
- Registers new users with Fabric CA
- Enrolls users and stores in wallet
- Called when admin approves registration

**Connection Profile** (`connection-org1.json`, `connection-org2.json`)
- Contains CA endpoint URLs
- Contains TLS certificates for CA
- Used by Fabric SDK to connect to CA

### CA Certificate Structure

```json
{
  "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "privateKey": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----",
  "mspId": "Org1MSP" or "Org2MSP",
  "type": "X.509"
}
```

---

## 4. Endorsement Process

### What is Endorsement?

**Endorsement** is the process where peers execute chaincode (smart contract) and validate transactions before they are committed to the ledger.

### Endorsement Policy

**Current Policy**: `AND('Org1MSP.member', 'Org2MSP.member')`
- Requires **both** Org1 and Org2 peers to endorse
- Ensures multi-organization consensus
- Provides higher security and trust

### Endorsement Flow

```
┌─────────────────────────────────────────────────────────────┐
│              ENDORSEMENT PROCESS DETAILED                    │
└─────────────────────────────────────────────────────────────┘

1. Transaction Proposal
   └─> Backend submits transaction via Gateway
       └─> contract.submitTransaction('CreateRecord', data)
           ↓
2. Gateway Sends Proposal to Peers
   └─> Proposal sent to:
       ├─> peer0.org1.example.com (localhost:7051)
       └─> peer0.org2.example.com (localhost:9051)
           ↓
3. Peers Execute Chaincode
   └─> Each peer:
       ├─> Runs chaincode method (CreateRecord)
       ├─> Validates RBAC (Role-Based Access Control)
       ├─> Executes business logic
       ├─> Creates endorsement signature
       └─> Returns proposal response
           ↓
4. Endorsement Policy Check
   └─> Gateway validates:
       ├─> Both Org1 and Org2 endorsed?
       ├─> Signatures valid?
       └─> Responses match?
           ↓
5. If Policy Satisfied
   └─> Transaction sent to Orderer
       └─> Orderer creates block
           └─> Block broadcast to peers
               └─> Committed to ledger
```

### Endorsement in Code

**`backend.js`** - `getContract()` method:
```javascript
await gateway.connect(ccp, {
    wallet,
    identity: userId,
    discovery: { enabled: false, asLocalhost: true },
    // Discovery disabled means we rely on connection profile
    // Connection profile specifies all peers for endorsement
});
```

**Connection Profile** (`connection-org1.json`):
```json
{
  "peers": {
    "peer0.org1.example.com": {
      "url": "grpcs://localhost:7051",
      "tlsCACerts": { "pem": "..." }
    },
    "peer0.org2.example.com": {
      "url": "grpcs://localhost:9051",
      "tlsCACerts": { "pem": "..." }
    }
  }
}
```

### Why Discovery is Disabled?

- Discovery service requires additional permissions
- Connection profile already contains peer information
- Explicit peer specification ensures multi-org endorsement
- Avoids "access denied" errors during login/queries

---

## 5. Policy Management

### Types of Policies in CDMS

#### 1. **Endorsement Policy**
- **Location**: Defined during chaincode deployment
- **Current**: `AND('Org1MSP.member', 'Org2MSP.member')`
- **Purpose**: Ensures both organizations endorse transactions
- **File**: `deploy-chaincode.sh` (default policy)

#### 2. **Writers Policy** (`/Channel/Application/Writers`)
- **Location**: Channel configuration
- **Purpose**: Defines who can submit transactions
- **Requirement**: Admin identities (AdminOrg1, AdminOrg2) have this policy
- **Issue**: Regular users don't have Writers policy (hence we use admin identity)

#### 3. **RBAC Policy** (Role-Based Access Control)
- **Location**: `chaincode/index.js`
- **Purpose**: Controls access to chaincode methods
- **Roles**: admin, district_police, investigator, forensics_officer, judiciary
- **Implementation**: `_isAllowed()` method in chaincode

#### 4. **Access Control Policy**
- **Location**: `chaincode/index.js` - `CreatePolicy()`, `GetPolicy()`
- **Purpose**: Defines record-level access control
- **Storage**: Stored on ledger as `POLICY_{record_id}`

### RBAC Permissions Matrix

| Role | Create | Read | Update | Delete | View Audit | View History |
|------|--------|------|--------|--------|------------|--------------|
| **admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **district_police** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **investigator** | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **forensics_officer** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| **judiciary** | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |

### Policy Check Flow

```
Transaction Request
    ↓
Chaincode Method Called
    ↓
_getClientAttr(ctx, 'role') → Get role from certificate
    ↓
_deriveRoleFromClientId(ctx) → Fallback: derive from client ID
    ↓
_isAllowed(callerRole, allowedRoles) → Check permission
    ↓
If Allowed → Execute Method
If Denied → Throw Error
```

---

## 6. Component Details

### 6.1 HashiCorp Vault (KMS)

**Purpose**: Key Management System for encryption keys

**What it does**:
- Stores and manages **Master Encryption Keys (KEK)**
- Wraps/Unwraps **Data Encryption Keys (DEK)**
- Provides key rotation capabilities
- Centralized key management

**How it works**:
```
1. File Upload
   ↓
2. Generate DEK (Data Encryption Key)
   ↓
3. Vault Wraps DEK with KEK (Master Key)
   ↓
4. Encrypt file with DEK
   ↓
5. Store encrypted file in MinIO
   ↓
6. Store wrapped DEK reference in blockchain
```

**Key Files**:
- **`backend.js`**: Vault integration methods
  - `initVaultTransit()`: Initialize transit engine
  - `wrapKey()`: Wrap DEK with KEK
  - `unwrapKey()`: Unwrap DEK for decryption
- **`testVault.js`**: Testing Vault connectivity

**Vault API Endpoints Used**:
- `/v1/sys/health`: Health check
- `/v1/{mount}/keys/{keyName}`: Create/rotate keys
- `/v1/{mount}/wrap`: Wrap key
- `/v1/{mount}/unwrap`: Unwrap key

### 6.2 Hyperledger Fabric

**Network Structure**:
- **2 Organizations**: Org1 (Police District A), Org2 (Police District B)
- **2 Peers per Org**: peer0.org1, peer0.org2
- **1 Orderer**: orderer.example.com (Raft consensus)
- **2 CAs**: ca.org1.example.com, ca.org2.example.com
- **1 Channel**: mychannel
- **1 Chaincode**: cdmscontract

**Fabric Components**:

**Peer Nodes**:
- Execute chaincode (smart contracts)
- Endorse transactions
- Maintain ledger state
- Validate transactions

**Orderer Service**:
- Receives endorsed transactions
- Creates blocks
- Orders transactions
- Broadcasts blocks to peers

**Certificate Authority (CA)**:
- Issues X.509 certificates
- Manages identities
- Handles enrollment/registration

**Chaincode (Smart Contract)**:
- Business logic in `chaincode/index.js`
- Methods: CreateRecord, ReadRecord, UpdateRecord, DeleteRecord, etc.
- RBAC enforcement
- State management

### 6.3 MinIO (Object Storage)

**Purpose**: Stores actual evidence files (encrypted)

**How it works**:
```
1. File uploaded via API
   ↓
2. File encrypted with DEK (from Vault)
   ↓
3. Encrypted file stored in MinIO
   ↓
4. MinIO returns object name/path
   ↓
5. Object name stored in blockchain metadata
```

**Key Files**:
- **`minioClient.js`**: MinIO client operations
  - `uploadFile()`: Upload encrypted file
  - `downloadFile()`: Download and decrypt file
  - `deleteFile()`: Delete file
- **`storage.js`**: Storage abstraction layer

**MinIO Bucket**: `cdms-evidence`
**File Structure**: `{case_id}/{timestamp}_{hash}_{filename}`

### 6.4 Chaincode (Smart Contract)

**Location**: `chaincode/index.js`

**Main Methods**:

1. **CreateRecord**: Upload new record
   - Validates RBAC
   - Stores record on ledger
   - Creates audit entry
   - Emits event

2. **ReadRecord**: Read record by ID
   - Validates RBAC
   - Returns record from ledger

3. **UpdateRecord**: Update existing record
   - Validates RBAC
   - Updates ledger state
   - Creates audit entry

4. **DeleteRecord**: Delete record
   - Validates RBAC
   - Marks as deleted
   - Creates audit entry

5. **ListAllRecords**: List all records
   - Iterates ledger state
   - Filters by RBAC

6. **AddAudit**: Add audit trail entry
   - Stores audit entry
   - Links to record

7. **GetAuditTrail**: Get audit trail
   - Retrieves all audit entries for a record

8. **LogSystemEvent**: Log system events
   - Stores system events (login, logout, etc.)
   - Used for activity tracking

9. **GetSystemEvents**: Get recent system events
   - Returns recent system events for dashboard

10. **GetRecordCount**: Count total records
    - Returns count of records (excluding system events)

**RBAC Enforcement**:
- All methods check caller role
- Uses `_getClientAttr()` to get role from certificate
- Uses `_deriveRoleFromClientId()` as fallback
- Uses `_isAllowed()` to check permissions

---

## 7. Backend-Fabric Integration

### 7.1 Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│         BACKEND-FABRIC INTEGRATION POINTS                   │
└─────────────────────────────────────────────────────────────┘

1. Identity Management (Wallet)
   Backend: wallet/ directory
   Fabric: CA (Certificate Authority)
   Integration: enrollAdminA.js, enrollAdminB.js

2. Connection Profile
   Backend: connection-org1.json, connection-org2.json
   Fabric: Network topology
   Integration: backend.js → getContract()

3. Gateway Connection
   Backend: Gateway SDK
   Fabric: Peer nodes, Orderer
   Integration: backend.js → gateway.connect()

4. Transaction Submission
   Backend: contract.submitTransaction()
   Fabric: Peer endorsement
   Integration: api.js → backend.js → Fabric Gateway

5. Query Execution
   Backend: contract.evaluateTransaction()
   Fabric: Peer query execution
   Integration: api.js → backend.js → Fabric Gateway

6. Event Listening
   Backend: Block monitor
   Fabric: Block events
   Integration: block-monitor.js
```

### 7.2 Detailed Integration Flow

#### **A. User Registration & Enrollment**

```
Frontend: User registers
    ↓
API: POST /register
    ↓
api.js: Save to pending_registrations.json
    ↓
Admin approves: POST /approve-registration
    ↓
api.js: Calls registerDistrictPoliceA.js
    ↓
registerDistrictPoliceA.js:
    ├─> Connect to Fabric CA
    ├─> Register user (username, role, org)
    ├─> Enroll user (get certificate)
    └─> Store in wallet
    ↓
api.js: Save to approved_users.json
    ↓
User can now login
```

#### **B. File Upload**

```
Frontend: User uploads file
    ↓
API: POST /record/upload
    ↓
api.js:
    ├─> Upload file to MinIO (via minioClient.js)
    ├─> Get admin identity (getAdminIdentity)
    ├─> Connect to Fabric (backend.getContract)
    ├─> Encrypt file key (backend.wrapKey via Vault)
    └─> Submit transaction (contract.submitTransaction)
        ↓
Fabric:
    ├─> Gateway sends to peers
    ├─> Peers endorse (both Org1 and Org2)
    ├─> Endorsement policy check
    ├─> Send to orderer
    ├─> Orderer creates block
    └─> Block committed to ledger
    ↓
api.js: Save to uploads_fallback.json (local backup)
    ↓
Response: Success message
```

#### **C. Record Query**

```
Frontend: User views records
    ↓
API: GET /records
    ↓
api.js:
    ├─> Get admin identity
    ├─> Connect to Fabric (backend.getContract)
    └─> Query chaincode (contract.evaluateTransaction('ListAllRecords'))
        ↓
Fabric:
    ├─> Query sent to peer (no endorsement needed)
    ├─> Chaincode executes (ListAllRecords)
    ├─> RBAC check (read permissions)
    └─> Returns results
    ↓
api.js: Format and return to frontend
```

### 7.3 Key Integration Files

**`backend.js`**:
- **Purpose**: Core Fabric integration layer
- **Key Methods**:
  - `getContract(userId, org)`: Connect to Fabric network
  - `wrapKey(keyName, plaintext)`: Vault key wrapping
  - `unwrapKey(keyName, ciphertext)`: Vault key unwrapping
  - `getAllBlocks(userId, org)`: Query blockchain blocks
  - `getBlock(blockNumber, userId, org)`: Get specific block
  - `getBlockchainInfo(userId, org)`: Get blockchain info

**`api.js`**:
- **Purpose**: Express API routes
- **Key Endpoints**:
  - `/login`: Authenticate user, log event
  - `/register`: Register new user
  - `/approve-registration`: Approve and enroll user
  - `/record/upload`: Upload file to blockchain
  - `/records`: List all records
  - `/record/:id/download`: Download file
  - `/record/:id/view`: View file
  - `/block-history`: Get block history
  - `/dashboard/stats`: Get dashboard statistics
  - `/dashboard/activity`: Get recent activity

**`ledger-info.js`**:
- **Purpose**: Query raw blockchain blocks
- **Methods**:
  - `getAllBlocks()`: Get all blocks
  - `getBlock(blockNumber)`: Get specific block
  - `getBlockchainInfo()`: Get blockchain height, hash

**`block-monitor.js`**:
- **Purpose**: Real-time block monitoring
- **Functionality**: Listens for new blocks and logs details

---

## 8. File-by-File Backend Breakdown

### Core Files

#### **`api.js`** (Main API Server)
**Purpose**: Express.js REST API server
**Key Features**:
- User authentication (login, logout)
- User registration and approval
- Record management (upload, download, view, list)
- Audit trail queries
- Block history queries
- Dashboard endpoints
- System event logging (local storage)

**Key Endpoints**:
- `/login`: User authentication
- `/logout`: User logout
- `/register`: User registration
- `/approve-registration`: Admin approves user
- `/revoke-access`: Admin revokes user access
- `/restore-access`: Admin restores user access
- `/record/upload`: Upload file to blockchain
- `/records`: List all records
- `/record/:id/download`: Download file
- `/record/:id/view`: View file (no download)
- `/record/:id/history`: Get record history
- `/audit/trail`: Get audit trail
- `/block-history`: Get block history
- `/dashboard/stats`: Get dashboard statistics
- `/dashboard/activity`: Get recent activity

**Integration Points**:
- Uses `backend.js` for Fabric operations
- Uses `minioClient.js` for file storage
- Uses `loadJSON()` for user management
- Uses `saveSystemEventFallback()` for event logging

#### **`backend.js`** (Fabric Gateway Integration)
**Purpose**: Core Fabric network integration
**Key Features**:
- Fabric Gateway connection management
- Wallet management
- Vault KMS integration
- Block querying
- Key wrapping/unwrapping

**Key Methods**:
- `getContract(userId, org)`: Connect to Fabric network
- `wrapKey(keyName, plaintext)`: Wrap key with Vault
- `unwrapKey(keyName, ciphertext)`: Unwrap key from Vault
- `getAllBlocks(userId, org)`: Query all blocks
- `getBlock(blockNumber, userId, org)`: Get specific block
- `getBlockchainInfo(userId, org)`: Get blockchain info
- `checkVaultHealth()`: Check Vault connectivity

**Configuration**:
- Wallet path: `cdms-backend/wallet`
- Channel: `mychannel`
- Contract: `cdmscontract`
- Vault: `http://127.0.0.1:8200`

#### **`minioClient.js`** (MinIO Storage Client)
**Purpose**: MinIO object storage operations
**Key Features**:
- File upload to MinIO
- File download from MinIO
- File deletion
- Bucket management

**Key Methods**:
- `uploadFile(fileBuffer, objectName)`: Upload file
- `downloadFile(objectName)`: Download file
- `deleteFile(objectName)`: Delete file
- `ensureBucket(bucketName)`: Create bucket if needed

#### **`storage.js`** (Storage Abstraction Layer)
**Purpose**: Abstract storage operations (MinIO or local)
**Key Features**:
- Unified interface for storage
- Supports both MinIO and local file system
- Encryption/decryption integration

### CA & Enrollment Files

#### **`enrollAdminA.js`** / **`enrollAdminB.js`**
**Purpose**: Enroll admin identities from Fabric CA
**What it does**:
1. Connects to Fabric CA (ca.org1.example.com or ca.org2.example.com)
2. Enrolls admin user (ID: 'admin', Secret: 'adminpw')
3. Gets X.509 certificate and private key
4. Stores in wallet as 'AdminOrg1' or 'AdminOrg2'

**Usage**: Run once during initial setup

#### **`registerDistrictPoliceA.js`** / **`registerDistrictPoliceB.js`**
**Purpose**: Register and enroll district police users
**What it does**:
1. Connects to Fabric CA
2. Registers new user with CA
3. Enrolls user (gets certificate)
4. Stores in wallet

**Usage**: Called automatically when admin approves registration

**Similar Files**:
- `registerInvestigatorA.js` / `registerInvestigatorB.js`
- `registerForensicsOfficerA.js` / `registerForensicsOfficerB.js`

### Block Querying Files

#### **`ledger-info.js`**
**Purpose**: Query raw blockchain blocks
**Key Methods**:
- `getAllBlocks(userId, org)`: Get all blocks from blockchain
- `getBlock(blockNumber, userId, org)`: Get specific block
- `getBlockchainInfo(userId, org)`: Get blockchain info (height, hash)
- `getOrdererTLSCertificate()`: Get orderer TLS cert
- `loadTLSCertificate(org, type)`: Load TLS certificate

**Uses**: Docker exec to query blocks via peer CLI

#### **`block-monitor.js`**
**Purpose**: Real-time block monitoring
**What it does**:
- Sets up block listener on Fabric network
- Logs details of each new block
- Shows transaction IDs and block numbers

**Usage**: Standalone script for monitoring

#### **`check-blocks.js`** / **`check-blocks-simple.js`**
**Purpose**: Utility scripts to check blockchain status
**What they do**:
- Query blockchain height
- Check recent blocks
- Display block information

### Utility Files

#### **`setup-test-admin.js`**
**Purpose**: Setup test admin user
**What it does**:
- Enrolls AdminOrg1 and AdminOrg2
- Sets up initial admin in approved_users.json

#### **`add-org2-admin.js`**
**Purpose**: Add Org2 admin to approved_users.json
**What it does**:
- Adds admin user for Org2
- Links to AdminOrg2 wallet identity

#### **`list-wallet-identities.js`**
**Purpose**: List all identities in wallet
**What it does**:
- Lists all identities stored in wallet
- Shows MSP ID and type

#### **`verifySetup.js`**
**Purpose**: Verify backend setup
**What it does**:
- Checks wallet identities
- Verifies Vault connectivity
- Checks MinIO connectivity

### Configuration Files

#### **`connection-org1.json`** / **`connection-org2.json`**
**Purpose**: Fabric connection profiles
**Contains**:
- Peer endpoints (URLs, TLS certs)
- Orderer endpoints
- CA endpoints
- MSP information

**Used by**: `backend.js` to connect to Fabric network

#### **`approved_users.json`**
**Purpose**: Approved users database
**Format**: Array of user objects
**Fields**:
- username, email, password (hashed)
- role, org, walletId
- status (active, revoked)

**Used by**: `api.js` for authentication

#### **`pending_registrations.json`**
**Purpose**: Pending user registrations
**Format**: Array of registration objects
**Used by**: `api.js` for registration approval

#### **`uploads_fallback.json`**
**Purpose**: Local backup of upload metadata
**Format**: Array of upload objects
**Used by**: `api.js` when blockchain is unavailable

#### **`system_events_fallback.json`**
**Purpose**: Local storage for system events
**Format**: Array of event objects
**Used by**: `api.js` for event logging and dashboard

### Data Files

#### **`wallet/`** (Directory)
**Purpose**: Fabric identity wallet
**Contains**:
- `AdminOrg1.id`: Admin identity for Org1
- `AdminOrg2.id`: Admin identity for Org2
- `{username}_gmail_com.id`: User identities

**Format**: Each `.id` file contains X.509 certificate and private key

---

## 9. Transaction Flow

### Complete Transaction Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│         COMPLETE TRANSACTION LIFECYCLE                      │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION (Frontend)
   User clicks "Upload File"
   ↓
2. API REQUEST (api.js)
   POST /record/upload
   ├─> authenticateUser middleware
   ├─> Extract user info from Authorization header
   └─> Get admin identity (getAdminIdentity)
   ↓
3. FILE PROCESSING
   ├─> Upload file to MinIO (minioClient.js)
   ├─> Get file hash
   └─> Encrypt file key with Vault (backend.js → wrapKey)
   ↓
4. FABRIC GATEWAY CONNECTION (backend.js)
   ├─> Load connection profile (connection-org1.json)
   ├─> Load identity from wallet (AdminOrg1)
   ├─> Connect to Gateway
   └─> Get contract (cdmscontract)
   ↓
5. TRANSACTION PROPOSAL
   contract.submitTransaction('CreateRecord', recordData)
   ├─> Gateway sends proposal to peers:
   │   ├─> peer0.org1.example.com
   │   └─> peer0.org2.example.com
   ↓
6. PEER ENDORSEMENT
   Each peer:
   ├─> Receives proposal
   ├─> Executes chaincode (CreateRecord)
   ├─> Validates RBAC (checks caller role)
   ├─> Validates business logic
   ├─> Creates endorsement signature
   └─> Returns proposal response
   ↓
7. ENDORSEMENT POLICY CHECK
   Gateway validates:
   ├─> Both Org1 and Org2 endorsed?
   ├─> Signatures valid?
   ├─> Responses match?
   └─> Policy satisfied?
   ↓
8. SUBMIT TO ORDERER
   ├─> Gateway sends endorsed transaction to orderer
   └─> Orderer receives transaction
   ↓
9. BLOCK CREATION
   Orderer:
   ├─> Validates transaction
   ├─> Creates block with transaction
   ├─> Calculates block hash
   └─> Broadcasts block to peers
   ↓
10. BLOCK COMMITMENT
    Each peer:
    ├─> Receives block
    ├─> Validates block
    ├─> Commits to ledger
    └─> Updates state database
    ↓
11. RESPONSE TO API
    api.js:
    ├─> Receives success from Gateway
    ├─> Logs system event (local storage)
    └─> Returns success to frontend
    ↓
12. FRONTEND DISPLAY
    User sees success message
    Transaction appears in block history
```

### Query Transaction Flow (No Endorsement)

```
┌─────────────────────────────────────────────────────────────┐
│         QUERY TRANSACTION FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. USER ACTION
   User views records list
   ↓
2. API REQUEST
   GET /records
   ↓
3. FABRIC GATEWAY
   backend.getContract(AdminOrg1, Org1)
   ↓
4. QUERY EXECUTION
   contract.evaluateTransaction('ListAllRecords')
   ├─> Sent to ONE peer (peer0.org1.example.com)
   ├─> No endorsement needed (read-only)
   └─> Returns results immediately
   ↓
5. RESPONSE
   api.js formats results
   Returns to frontend
```

**Key Difference**: 
- **Submit Transaction**: Requires endorsement, creates block
- **Evaluate Transaction**: No endorsement, no block, immediate response

---

## 10. Data Flow Diagrams

### 10.1 File Upload Flow

```
User (Frontend)
    │
    │ POST /record/upload
    ▼
API (api.js)
    │
    ├─> Upload to MinIO ──────────────┐
    │                                  │
    ├─> Get Vault Key ────────────┐   │
    │                              │   │
    ├─> Encrypt File Key ──────────┼───┼──> MinIO
    │                              │   │    (Storage)
    └─> Submit to Fabric ───────────┼───┼──> Vault
         │                          │   │    (KMS)
         │                          │   │
         ▼                          │   │
    Fabric Gateway                  │   │
         │                          │   │
         ├─> Peer Org1 ─────────────┘   │
         │   (Endorse)                  │
         │                              │
         ├─> Peer Org2 ────────────────┘
         │   (Endorse)
         │
         └─> Orderer
              (Create Block)
              │
              ▼
         Ledger
         (Blockchain)
```

### 10.2 Authentication Flow

```
User Login
    │
    │ POST /login
    ▼
API (api.js)
    │
    ├─> Check approved_users.json
    │   (Password validation)
    │
    ├─> Load identity from wallet
    │   (AdminOrg1 or AdminOrg2)
    │
    ├─> Connect to Fabric Gateway
    │   (Verify identity)
    │
    ├─> Log login event
    │   (local storage)
    │
    └─> Return JWT/session
        │
        ▼
    Frontend
    (Authenticated)
```

### 10.3 User Registration Flow

```
User Registration
    │
    │ POST /register
    ▼
API (api.js)
    │
    └─> Save to pending_registrations.json
        │
        ▼
    Admin Approval
        │
        │ POST /approve-registration
        ▼
    API (api.js)
        │
        ├─> Register with Fabric CA
        │   (registerDistrictPoliceA.js)
        │   │
        │   ├─> CA Register User
        │   │   (ca.org1.example.com)
        │   │
        │   └─> CA Enroll User
        │       (Get Certificate)
        │
        ├─> Store in Wallet
        │   (username_gmail_com.id)
        │
        ├─> Save to approved_users.json
        │
        └─> Log approval event
            (local storage)
```

---

## Summary

### Key Takeaways

1. **Certificate Authority (CA)**:
   - Issues X.509 certificates for identities
   - Enrolls admin and user identities
   - Stores certificates in wallet

2. **Endorsement Process**:
   - Requires both Org1 and Org2 peers to endorse
   - Ensures multi-organization consensus
   - Validates transactions before block creation

3. **Policy Management**:
   - Endorsement policy: Requires both orgs
   - RBAC policy: Role-based access control in chaincode
   - Writers policy: Only admins can submit transactions

4. **Backend Integration**:
   - `api.js`: REST API endpoints
   - `backend.js`: Fabric Gateway integration
   - `minioClient.js`: File storage
   - CA scripts: User enrollment

5. **Data Flow**:
   - Files → MinIO (encrypted)
   - Metadata → Blockchain (via Fabric)
   - Keys → Vault (wrapped)
   - Events → Local storage (system_events_fallback.json)

### Architecture Benefits

1. **Decentralized**: Multiple organizations (Org1, Org2)
2. **Secure**: End-to-end encryption, RBAC, endorsement policy
3. **Auditable**: All operations logged to blockchain
4. **Scalable**: Can add more organizations/peers
5. **Resilient**: Local fallback storage for availability

---

## Next Steps for Presentation

1. **Visual Diagrams**: Create diagrams showing CA flow, endorsement process
2. **Live Demo**: Show file upload, block creation, block history
3. **Code Walkthrough**: Explain key files (api.js, backend.js, chaincode)
4. **Security Features**: Highlight RBAC, encryption, endorsement policy
5. **Scalability**: Explain how to add more organizations

---

## Questions to Address

1. **Why use admin identity for transactions?**
   - Regular users don't have Writers policy
   - Admin identity has necessary permissions
   - User info still tracked in audit trail

2. **Why local storage for events?**
   - Blockchain might be unavailable during testing
   - Ensures events are always logged
   - Can be migrated to blockchain later

3. **Why disable discovery?**
   - Avoids access denied errors
   - Connection profile already has peer info
   - Explicit peer specification ensures multi-org endorsement

4. **How does multi-org endorsement work?**
   - Gateway sends proposal to both peers
   - Both peers must endorse
   - Only then transaction sent to orderer

---

This document provides a comprehensive overview of the blockchain architecture, components, and integration points in the CDMS system. Use it as a reference for your presentation!

