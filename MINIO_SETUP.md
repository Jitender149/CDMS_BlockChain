# MinIO Integration Setup for CDMS Blockchain

This guide explains how to set up and use MinIO for secure file storage integrated with the CDMS Blockchain application.

## Overview

The CDMS application now uses **MinIO** as an object storage backend for storing evidence files, while recording metadata and cryptographic hashes on the Hyperledger Fabric blockchain.

### Architecture

```
User Upload → Backend API → MinIO Storage → Blockchain Record
                                ↓
                          SHA-256 Hash
                                ↓
                    Hyperledger Fabric Ledger
```

### Key Features

- ✅ **Secure File Storage**: Files stored in MinIO with presigned URLs
- ✅ **Integrity Verification**: SHA-256 hash calculated and stored on blockchain
- ✅ **Immutable Audit Trail**: All uploads/downloads recorded on blockchain
- ✅ **Role-Based Access**: Only authorized users can upload/download
- ✅ **Organized Storage**: Files organized by case ID
- ✅ **Blockchain Batching**: Transactions grouped into blocks (5 per block)

## Quick Start

### 1. Start MinIO with Docker

```bash
# Start MinIO container
docker-compose -f docker-compose-minio.yml up -d

# Check status
docker ps | grep minio
```

**MinIO will be available at:**
- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin

### 2. Verify MinIO is Running

Open http://localhost:9001 in your browser and login with:
- **Username**: minioadmin
- **Password**: minioadmin

You should see the `cdms-evidence` bucket created automatically.

### 3. Configure Backend

The backend is already configured with default MinIO settings. To customize:

```bash
# Create .env file in cdms-backend/
cat > cdms-backend/.env << EOF
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cdms-evidence
EOF
```

### 4. Start the Backend

```bash
cd cdms-backend
npm install  # Installs minio and crypto-js
npm start
```

The backend will automatically:
- Connect to MinIO
- Create the `cdms-evidence` bucket if it doesn't exist
- Initialize the upload endpoint

### 5. Start the Frontend

```bash
cd cdms-frontend
npm run dev
```

## Usage

### Uploading Files

1. **Login** as a user with upload permissions (admin or district_police)
2. Navigate to **Upload** page
3. Fill in the form:
   - **Case ID**: e.g., CASE-2024-001
   - **Record Type**: Evidence, FIR, Report, etc.
   - **Description**: Details about the file
   - **File**: Select file (max 100MB)
4. Click **Upload to Blockchain**

### What Happens During Upload

1. **File Upload**: File is uploaded to MinIO object storage
2. **Hash Calculation**: SHA-256 hash is calculated for integrity
3. **Blockchain Record**: Metadata stored on Hyperledger Fabric:
   ```json
   {
     "record_id": "REC_1730000000_abc123",
     "case_id": "CASE-2024-001",
     "filename": "evidence.pdf",
     "file_hash": "a3b2c1d4e5f6...",
     "file_size": 1024576,
     "minio_object_name": "CASE-2024-001/1730000000_a3b2c1d4_evidence.pdf",
     "minio_url": "http://localhost:9000/...",
     "uploader_id": "admin@example.com",
     "uploader_org": "A"
   }
   ```
4. **Audit Entry**: Upload action recorded on blockchain
5. **Success Response**: Returns record ID, hash, and MinIO URL

### Downloading Files

1. Navigate to **Records** page
2. Find the record you want to download
3. Click **Download** button

The system will:
- Verify your access permissions
- Retrieve file from MinIO
- Add audit entry for download
- Serve the file with integrity hash header

### Viewing Audit Trail

Navigate to **Audit Trail** page to see:
- All upload/download actions
- User who performed each action
- Timestamps and transaction IDs
- File hashes and details

### Viewing Block History

Navigate to **Block History** page to see:
- Transactions grouped into blocks (5 per block)
- Block numbers and hashes
- Complete transaction details
- File metadata and hashes

## MinIO Object Naming Convention

Files are stored in MinIO with the following structure:

```
cdms-evidence/
├── CASE-2024-001/
│   ├── 1730000000_a3b2c1d4_evidence.pdf
│   ├── 1730000100_b4c3d2e1_forensic_report.docx
│   └── 1730000200_c5d4e3f2_photo.jpg
├── CASE-2024-002/
│   └── 1730000300_d6e5f4a3_video.mp4
```

**Format**: `{caseId}/{timestamp}_{hash_prefix}_{sanitized_filename}`

## API Endpoints

### Upload File

```bash
POST /record/upload
Authorization: Bearer {email}:{org}
Content-Type: multipart/form-data

Body:
- file: (binary)
- case_id: CASE-2024-001
- record_type: Evidence
- description: Crime scene photo
```

**Response:**
```json
{
  "success": true,
  "recordId": "REC_1730000000_abc123",
  "fileHash": "a3b2c1d4e5f6...",
  "minioUrl": "http://localhost:9000/...",
  "size": 1024576,
  "message": "File uploaded to MinIO and recorded on blockchain successfully"
}
```

### Download File

```bash
GET /record/{recordId}/download
Authorization: Bearer {email}:{org}
```

**Response**: Binary file with headers:
- `Content-Type`: Original MIME type
- `Content-Disposition`: attachment; filename="..."
- `X-File-Hash`: SHA-256 hash for verification

### Get Audit Trail

```bash
GET /audit/trail
Authorization: Bearer {email}:{org}
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "audit_trail": [
    {
      "timestamp": "2024-11-02T10:30:00Z",
      "recordId": "REC_1730000000_abc123",
      "action": "UPLOAD",
      "actor": "admin@example.com",
      "details": "File uploaded: evidence.pdf (1024576 bytes, hash: a3b2c1d4...)",
      "txId": "abc123def456"
    }
  ]
}
```

## Security Features

### File Integrity

- **SHA-256 Hashing**: Every file gets a cryptographic hash
- **Blockchain Verification**: Hash stored immutably on Fabric
- **Download Verification**: Hash header included in download response

### Access Control

- **Upload**: Only `admin` and `district_police` roles
- **Download**: All authenticated users (with audit logging)
- **View Audit**: All authenticated users
- **Block History**: All authenticated users

### Audit Trail

Every action is recorded on the blockchain:
- **UPLOAD**: Who uploaded, what file, when, hash
- **DOWNLOAD**: Who downloaded, what file, when
- **READ**: Who viewed record metadata
- **UPDATE/DELETE**: Who modified/deleted records

## Troubleshooting

### MinIO Not Starting

```bash
# Check if port is in use
netstat -an | findstr 9000

# Stop and remove existing container
docker stop cdms-minio
docker rm cdms-minio

# Restart
docker-compose -f docker-compose-minio.yml up -d
```

### Backend Can't Connect to MinIO

1. Check MinIO is running:
   ```bash
   docker ps | grep minio
   ```

2. Check backend logs:
   ```bash
   cd cdms-backend
   npm start
   # Look for "✅ MinIO bucket 'cdms-evidence' ..." message
   ```

3. Verify MinIO endpoint in backend:
   ```javascript
   // cdms-backend/minioClient.js
   endPoint: process.env.MINIO_ENDPOINT || 'localhost',
   port: parseInt(process.env.MINIO_PORT) || 9000,
   ```

### Upload Fails

1. **Check file size**: Max 100MB
2. **Check MinIO bucket exists**: Visit http://localhost:9001
3. **Check backend logs**: Look for MinIO errors
4. **Check Fabric network**: Must be running for blockchain recording

### Missing Audit Entries

Ensure chaincode is deployed with audit functionality:

```bash
# In WSL
cd /mnt/c/CDMS_Blockchain
./deploy-chaincode.sh
```

## Configuration

### Environment Variables

**Backend (.env)**:
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cdms-evidence
```

**Frontend (.env)**:
```bash
VITE_APP_API_URL=http://localhost:3000
```

### Blockchain Batching

Transactions are grouped into blocks for better visualization:

```javascript
// cdms-frontend/src/pages/BlockHistoryPage.jsx
const TRANSACTIONS_PER_BLOCK = 5; // Configurable
```

## Advanced Configuration

### Production MinIO Setup

For production, use a dedicated MinIO server:

1. **Install MinIO Server**:
   ```bash
   wget https://dl.min.io/server/minio/release/linux-amd64/minio
   chmod +x minio
   ./minio server /mnt/data --console-address ":9001"
   ```

2. **Update Backend Config**:
   ```javascript
   endPoint: 'minio.example.com',
   port: 443,
   useSSL: true,
   accessKey: process.env.MINIO_ACCESS_KEY,
   secretKey: process.env.MINIO_SECRET_KEY,
   ```

3. **Enable TLS**: Use Let's Encrypt for HTTPS

### Bucket Policies

Set custom bucket policies in MinIO console:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::cdms-evidence/*"],
      "Condition": {
        "StringLike": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

## Testing

### Test Upload Flow

```bash
# 1. Start MinIO
docker-compose -f docker-compose-minio.yml up -d

# 2. Start Backend
cd cdms-backend && npm start

# 3. Start Frontend
cd cdms-frontend && npm run dev

# 4. Login as admin or district_police

# 5. Upload a test file

# 6. Verify in MinIO Console
# Open http://localhost:9001
# Navigate to cdms-evidence bucket

# 7. Check Block History
# Navigate to Block History page in frontend
```

### Verify File Integrity

```bash
# Calculate file hash locally
sha256sum your-file.pdf

# Compare with hash in blockchain record
# Should match the file_hash field
```

## Monitoring

### MinIO Metrics

View MinIO metrics at: http://localhost:9001/metrics

### Blockchain Transactions

View all transactions in Block History page:
- Total transaction count
- Transactions per block
- File hashes and metadata

### Audit Logs

View complete audit trail in Audit Page:
- Upload statistics
- Download statistics
- User activity

## Support

For issues related to:
- **MinIO**: https://min.io/docs
- **Hyperledger Fabric**: https://hyperledger-fabric.readthedocs.io
- **CDMS Application**: Check logs in `cdms-backend/` directory

## Summary

✅ **Setup Complete**: MinIO + Blockchain Integration
✅ **File Storage**: Secure object storage with MinIO
✅ **Integrity**: SHA-256 hashing for all files
✅ **Audit Trail**: Complete blockchain-based audit log
✅ **Block Visualization**: Transactions grouped into blocks
✅ **Role-Based Access**: Permissions enforced at all levels

Your CDMS application now has enterprise-grade file storage with blockchain-verified integrity and complete audit trails!

