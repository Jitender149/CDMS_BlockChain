# CDMS Backend

Consortium-based Criminal Data Management System - Backend API

## Overview

The CDMS Backend provides a secure, blockchain-based API for managing criminal records with end-to-end encryption, access control, and audit trails. Built on Hyperledger Fabric with HashiCorp Vault for key management.

## Features

- 🔐 **End-to-End Encryption**: AES-256-GCM encryption with Vault key management
- 🔗 **Blockchain Storage**: Hyperledger Fabric for immutable record storage
- 👥 **Multi-Organization Support**: Consortium-based architecture
- 🛡️ **Access Control**: Role-based and attribute-based access control
- 📊 **Audit Trails**: Comprehensive logging and audit capabilities
- 📁 **Flexible Storage**: Local filesystem or MinIO object storage
- 🔍 **Search & Filter**: Advanced record querying capabilities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Blockchain   │
│   (React)       │◄──►│   (Express)     │◄──►│   (Fabric)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Vault (KMS)   │
                       │   (Encryption)  │
                       └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Storage       │
                       │   (Local/MinIO) │
                       └─────────────────┘
```

## Prerequisites

- Node.js >= 14.0.0
- npm >= 6.0.0
- Hyperledger Fabric network running
- HashiCorp Vault server
- (Optional) MinIO for object storage

## Installation

1. **Clone and navigate to backend directory:**
   ```bash
   cd cdms-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run setup script:**
   ```bash
   node setup.js
   ```

4. **Configure environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Start the server:**
   ```bash
   npm start
   ```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Vault Configuration
VAULT_ADDR=http://127.0.0.1:8200
VAULT_TOKEN=your-vault-token-here
VAULT_MOUNT_PATH=cdms-kms

# Blockchain Configuration
CHANNEL_NAME=mychannel
CONTRACT_NAME=cdmscontract

# Storage Configuration
USE_MINIO=false
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=cdms-files
```

## API Endpoints

### Authentication
- `POST /login` - User login
- `GET /auth/me` - Get current user info
- `POST /auth/certificate` - Upload user certificate

### Record Management
- `POST /record/upload` - Upload encrypted record
- `GET /record/:id/download` - Download and decrypt record
- `GET /record/:id/metadata` - Get record metadata
- `GET /records` - List all records (with filtering)
- `GET /records/:id` - Get specific record
- `GET /records/case/:caseId` - List records by case

### Policy Management
- `POST /policy` - Create access policy
- `GET /policy/:id` - Get policy details
- `GET /policies` - List all policies
- `PUT /policies/:id/update` - Update policy
- `DELETE /policies/:id` - Delete policy

### Access Control
- `POST /access/grant` - Grant access to record
- `POST /access/revoke` - Revoke access
- `GET /access/check` - Check access permissions
- `GET /access/list` - List access permissions

### Audit & Monitoring
- `POST /audit` - Add audit entry
- `GET /audit/trail/:recordId` - Get audit trail
- `GET /audit/list` - List all audit entries

### System Health
- `GET /health` - API health check
- `GET /vault/status` - Vault connection status
- `GET /storage/status` - Storage system status

## Usage Examples

### Upload a Record

```bash
curl -X POST http://localhost:3000/record/upload \
  -H "Content-Type: multipart/form-data" \
  -F "file=@evidence.pdf" \
  -F "case_id=CASE-001" \
  -F "record_type=Evidence" \
  -F "userId=InvestigatorA" \
  -F "org=Org1"
```

### Download a Record

```bash
curl -X GET "http://localhost:3000/record/RECORD-123/download?userId=InvestigatorA&org=Org1" \
  -o downloaded_file.pdf
```

### List Records

```bash
curl -X GET "http://localhost:3000/records?userId=InvestigatorA&org=Org1&caseId=CASE-001"
```

### Create Access Policy

```bash
curl -X POST http://localhost:3000/policy \
  -H "Content-Type: application/json" \
  -d '{
    "policy_id": "policy-001",
    "rules": [
      {
        "action": "read",
        "resource": "record",
        "conditions": {
          "org": "Org1"
        }
      }
    ],
    "categories": ["Evidence", "FIR"]
  }' \
  -F "userId=AdminOrg1" \
  -F "org=Org1"
```

## User Registration

Register users with the blockchain network:

```bash
# Register District Police A
node registerDistrictPoliceA.js

# Register District Police B  
node registerDistrictPoliceB.js

# Register Forensics Officers
node registerForensicsOfficerA.js
node registerForensicsOfficerB.js

# Register Investigators
node registerInvestigatorA.js
node registerInvestigatorB.js
```

## Security Features

### Encryption
- **AES-256-GCM** for file encryption
- **Vault Transit Engine** for key management
- **Unique DEK** per record
- **Authenticated encryption** with integrity verification

### Access Control
- **Role-based access** (Admin, Investigator, Forensics Officer)
- **Organization-based** access control
- **Attribute-based** policies
- **Time-based** access expiration

### Audit & Compliance
- **Immutable audit trails** on blockchain
- **Comprehensive logging** of all operations
- **User activity tracking**
- **Data integrity verification**

## Development

### Project Structure

```
cdms-backend/
├── api.js                 # Main API server
├── backend.js             # Core backend logic
├── storage.js             # File storage abstraction
├── setup.js              # Setup and initialization
├── chaincode-methods.js   # Blockchain method documentation
├── register*.js          # User registration scripts
├── wallet/               # Fabric wallet (identities)
├── files/                # Local file storage
├── logs/                 # Application logs
└── package.json         # Dependencies
```

### Adding New Endpoints

1. Add route handler in `api.js`
2. Add corresponding method in `backend.js` if needed
3. Update chaincode methods in `chaincode-methods.js`
4. Add validation middleware if required
5. Update documentation

### Testing

```bash
# Run health checks
curl http://localhost:3000/health

# Check Vault status
curl http://localhost:3000/vault/status

# Check storage status
curl http://localhost:3000/storage/status
```

## Troubleshooting

### Common Issues

1. **Vault Connection Failed**
   - Ensure Vault server is running
   - Check VAULT_ADDR and VAULT_TOKEN in .env
   - Verify Vault is unsealed

2. **Blockchain Connection Failed**
   - Ensure Fabric network is running
   - Check wallet contains valid identities
   - Verify connection profiles exist

3. **File Storage Issues**
   - Check files directory permissions
   - Verify MinIO configuration if using object storage
   - Ensure sufficient disk space

### Logs

Check application logs in the `logs/` directory for detailed error information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the API documentation
- Check blockchain and Vault logs
- Ensure all prerequisites are met
