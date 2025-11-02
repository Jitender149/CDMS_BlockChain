# CDMS Blockchain Architecture with MinIO

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CDMS Blockchain System                       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                              │
│  (React.js - Port 5173)                                              │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │  Upload    │  │  Records   │  │   Audit    │  │   Block    │    │
│  │   Page     │  │   Page     │  │   Trail    │  │  History   │    │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘    │
│         │                │                │                │          │
│         └────────────────┴────────────────┴────────────────┘          │
│                              │                                        │
│                              │ HTTP/REST API                          │
│                              ▼                                        │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                          Backend Layer                                │
│  (Node.js + Express - Port 3000)                                     │
├──────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     API Routes                                  │  │
│  │  /record/upload  /record/:id/download  /audit/trail           │  │
│  │  /block-history  /records             /access-management       │  │
│  └────────┬──────────────────────┬────────────────────┬───────────┘  │
│           │                      │                    │              │
│           ▼                      ▼                    ▼              │
│  ┌────────────────┐    ┌─────────────────┐  ┌─────────────────┐    │
│  │ MinIO Client   │    │  Fabric SDK     │  │  Auth & RBAC    │    │
│  │  (File Ops)    │    │  (Blockchain)   │  │  (Security)     │    │
│  └────────┬───────┘    └────────┬────────┘  └─────────────────┘    │
│           │                     │                                    │
└───────────┼─────────────────────┼────────────────────────────────────┘
            │                     │
            │                     │
            ▼                     ▼
┌───────────────────┐   ┌─────────────────────────────────────────┐
│     MinIO         │   │    Hyperledger Fabric Network           │
│  Object Storage   │   │                                         │
│  (Port 9000/9001) │   │  ┌──────────┐  ┌──────────┐            │
├───────────────────┤   │  │  Peer0   │  │  Peer0   │            │
│                   │   │  │  Org1    │  │  Org2    │            │
│  cdms-evidence/   │   │  └────┬─────┘  └────┬─────┘            │
│  ├─ CASE-001/     │   │       │             │                  │
│  │  ├─ file1.pdf  │   │       └──────┬──────┘                  │
│  │  └─ file2.jpg  │   │              │                         │
│  └─ CASE-002/     │   │         ┌────▼─────┐                   │
│     └─ file3.doc  │   │         │ Orderer  │                   │
│                   │   │         └────┬─────┘                   │
│  Hash: SHA-256    │   │              │                         │
│  URL: Presigned   │   │         ┌────▼──────┐                  │
└───────────────────┘   │         │  Channel  │                  │
                        │         │ mychannel │                  │
                        │         └────┬──────┘                  │
                        │              │                         │
                        │         ┌────▼──────────┐              │
                        │         │   Chaincode   │              │
                        │         │  (Smart       │              │
                        │         │  Contract)    │              │
                        │         └───────────────┘              │
                        │                                         │
                        └─────────────────────────────────────────┘
```

## Data Flow

### Upload Flow

```
1. User selects file in UploadPage
   │
   ▼
2. Frontend sends multipart/form-data to Backend
   │
   ▼
3. Backend receives file
   │
   ├─► Calculate SHA-256 hash
   │
   ├─► Upload to MinIO
   │   └─► Returns: objectName, url, hash
   │
   └─► Submit transaction to Fabric
       │
       ├─► CreateRecord(metadata)
       │   └─► Stores: recordId, caseId, hash, minioUrl, etc.
       │
       └─► AddAudit(recordId, "UPLOAD", details)
           └─► Logs: who, what, when, hash
   
4. Backend returns success to Frontend
   │
   ▼
5. Frontend displays success with recordId and hash
   │
   ▼
6. User can view in:
   - Audit Trail (action logged)
   - Block History (transaction in block)
   - MinIO Console (file stored)
```

### Download Flow

```
1. User clicks Download in RecordsPage
   │
   ▼
2. Frontend requests file from Backend
   │
   ▼
3. Backend:
   │
   ├─► Query Fabric for record metadata
   │   └─► Gets: minioObjectName, hash, filename
   │
   ├─► Download file from MinIO
   │   └─► Uses objectName to retrieve file
   │
   ├─► Add audit entry to Fabric
   │   └─► AddAudit(recordId, "DOWNLOAD", details)
   │
   └─► Return file with headers:
       ├─► Content-Disposition: attachment; filename="..."
       ├─► Content-Type: application/pdf
       └─► X-File-Hash: a3b2c1d4... (for verification)

4. Browser downloads file
   │
   ▼
5. User can verify:
   - Calculate local hash: sha256sum file.pdf
   - Compare with X-File-Hash header
   - Check audit trail for download log
```

### Audit Trail Flow

```
1. User opens Audit Trail page
   │
   ▼
2. Frontend requests audit data from Backend
   │
   ▼
3. Backend:
   │
   ├─► Query Fabric: GetAllHistory(limit)
   │   └─► Returns all blockchain transactions
   │
   └─► Filter for audit-related entries
       └─► Extract: action, actor, timestamp, details

4. Frontend displays:
   │
   ├─► Statistics (total uploads, downloads, views)
   ├─► Filterable list of all actions
   └─► Search by record/user/details
```

### Block History Flow

```
1. User opens Block History page
   │
   ▼
2. Frontend requests history from Backend
   │
   ▼
3. Backend:
   │
   └─► Query Fabric: GetAllHistory(limit)
       └─► Returns: all transactions with timestamps

4. Frontend:
   │
   ├─► Group transactions into blocks (5 per block)
   │   └─► Assign: blockNumber, blockHash, timestamp
   │
   └─► Display:
       ├─► Block headers (number, hash, tx count)
       └─► Individual transactions with details
           └─► recordId, caseId, hash, uploader, etc.
```

## Component Interactions

### Frontend Components

```
UploadPage.jsx
  │
  ├─► useAuth() - Get current user
  │
  ├─► FormData - Collect file + metadata
  │
  └─► fetch(API_URL/record/upload)
      └─► Sends: file, case_id, record_type, description

AuditPage.jsx
  │
  ├─► useAuth() - Get current user
  │
  ├─► useEffect() - Fetch on mount
  │
  └─► fetch(API_URL/audit/trail)
      └─► Displays: all audit entries with filters

BlockHistoryPage.jsx
  │
  ├─► useAuth() - Get current user
  │
  ├─► groupIntoBlocks() - Batch transactions
  │
  └─► fetch(API_URL/block-history)
      └─► Displays: blocks with transactions
```

### Backend Modules

```
api.js
  │
  ├─► authenticateUser middleware
  │   └─► Validates: email, org, role
  │
  ├─► /record/upload endpoint
  │   │
  │   ├─► minioClient.uploadFile()
  │   │   └─► Returns: hash, url, objectName
  │   │
  │   └─► backend.getContract()
  │       └─► contract.submitTransaction('CreateRecord')
  │
  ├─► /record/:id/download endpoint
  │   │
  │   ├─► contract.evaluateTransaction('ReadRecord')
  │   │
  │   └─► minioClient.downloadFile()
  │
  └─► /audit/trail endpoint
      └─► contract.evaluateTransaction('GetAllHistory')

minioClient.js
  │
  ├─► uploadFile(buffer, filename, caseId, org)
  │   └─► minio.putObject() + hash calculation
  │
  ├─► downloadFile(objectName)
  │   └─► minio.getObject() + stream to buffer
  │
  └─► generatePresignedUrl(objectName)
      └─► minio.presignedGetObject()
```

### Chaincode Functions

```
index.js (Fabric Chaincode)
  │
  ├─► CreateRecord(recordJSON)
  │   │
  │   ├─► Validate: record_id, case_id, record_type
  │   ├─► Check permissions: district_police, admin
  │   ├─► Store on ledger: ctx.stub.putState()
  │   ├─► Emit event: RecordCreated
  │   └─► Call: _storeAudit()
  │
  ├─► ReadRecord(recordId)
  │   │
  │   ├─► Check permissions: all roles
  │   ├─► Get from ledger: ctx.stub.getState()
  │   └─► Call: _storeAudit()
  │
  ├─► AddAudit(recordId, actor, action, details)
  │   │
  │   ├─► Create audit entry with timestamp
  │   ├─► Store: AUDIT_{recordId}_{timestamp}
  │   └─► Emit event: AuditAdded
  │
  ├─► GetAuditTrail(recordId)
  │   │
  │   └─► Query: all AUDIT_{recordId}_* keys
  │
  └─► GetAllHistory(limit)
      │
      └─► Iterate: all state records
          └─► Return: history with timestamps
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Authentication                                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - JWT-based (email:org in Authorization header)   │    │
│  │  - User credentials verified against approved_users │    │
│  │  - Session management in frontend context          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Authorization (RBAC)                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - Role-based access control                       │    │
│  │  - Upload: admin, district_police only             │    │
│  │  - Download: all authenticated users               │    │
│  │  - Audit/History: all authenticated users          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: File Integrity                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - SHA-256 hash calculated on upload               │    │
│  │  - Hash stored immutably on blockchain             │    │
│  │  - Hash verified on download (header)              │    │
│  │  - User can verify locally: sha256sum file         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: Blockchain Immutability                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - All metadata stored on Fabric                   │    │
│  │  - Cryptographically signed transactions           │    │
│  │  - Tamper-proof audit trail                        │    │
│  │  - Distributed consensus (multiple peers)          │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 5: Access Logging                                    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  - All uploads logged with user, timestamp, hash   │    │
│  │  - All downloads logged with user, timestamp       │    │
│  │  - All views/reads logged                          │    │
│  │  - Logs immutable on blockchain                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

```
Frontend:
  - React.js 18.x
  - Vite (build tool)
  - Tailwind CSS (styling)
  - Lucide React (icons)
  - React Router (routing)

Backend:
  - Node.js 18.x
  - Express.js (web framework)
  - Multer (file upload handling)
  - MinIO SDK (object storage client)
  - crypto (hash calculation)
  - Fabric SDK (blockchain interaction)

Storage:
  - MinIO (object storage)
    - Docker container
    - Port 9000 (API), 9001 (Console)
    - Bucket: cdms-evidence

Blockchain:
  - Hyperledger Fabric 2.5.x
    - 2 Organizations (Org1, Org2)
    - 2 Peers per org
    - 1 Orderer
    - Channel: mychannel
    - Chaincode: Node.js

Infrastructure:
  - Docker & Docker Compose
  - WSL2 (for Fabric on Windows)
  - PowerShell (scripts)
```

## Deployment Architecture

```
Development:
  - MinIO: Docker container (localhost:9000)
  - Backend: npm start (localhost:3000)
  - Frontend: npm run dev (localhost:5173)
  - Fabric: WSL2 Docker network

Production (Recommended):
  - MinIO: Dedicated server with TLS
  - Backend: PM2 process manager, reverse proxy (Nginx)
  - Frontend: Built static files served by Nginx
  - Fabric: Multi-host distributed network
  - Load Balancer: For high availability
  - Monitoring: Prometheus + Grafana
  - Backup: MinIO replication + Fabric backup
```

## Performance Considerations

```
Bottlenecks:
  1. File Upload Size: Limited to 100MB (configurable)
  2. Blockchain Write Speed: ~1-2 seconds per transaction
  3. MinIO Throughput: Depends on network and disk I/O
  4. Frontend Memory: Large files buffered in browser

Optimizations:
  1. Streaming uploads (no full buffer)
  2. Presigned URLs for direct MinIO access
  3. Pagination for large lists
  4. Frontend caching for recent data
  5. Lazy loading for history/audit
  6. Indexed blockchain queries
```

## Scalability

```
Horizontal Scaling:
  - Backend: Add more API servers behind load balancer
  - MinIO: Distributed MinIO cluster
  - Fabric: Add more peers/orderers
  - Frontend: CDN for static assets

Vertical Scaling:
  - Backend: Increase CPU/RAM for Node.js
  - MinIO: Increase storage capacity
  - Fabric: Faster disk I/O, more CPU for peers
  - Database: If adding SQL for metadata indexing

Capacity Planning:
  - MinIO: Plan for growth (TB scale)
  - Blockchain: Monitor ledger size
  - Backup: Regular snapshots
  - Monitoring: Track resource usage
```

---

This architecture provides:
✅ **Separation of Concerns**: Storage, logic, presentation separated
✅ **Scalability**: Each layer can scale independently
✅ **Security**: Multiple layers of protection
✅ **Integrity**: Blockchain-verified file hashes
✅ **Auditability**: Complete immutable trail
✅ **Performance**: Optimized for real-world use

