# Testing the Complete Upload Flow

This document provides step-by-step instructions to test the MinIO + Blockchain integration.

## Prerequisites

✅ Hyperledger Fabric network is running
✅ MinIO is running
✅ Backend server is running
✅ Frontend development server is running

## Test Steps

### 1. Start All Services

```powershell
# Terminal 1: Start MinIO
.\start-minio.ps1

# Terminal 2: Start Backend (in cdms-backend/)
cd cdms-backend
npm start

# Terminal 3: Start Frontend (in cdms-frontend/)
cd cdms-frontend
npm run dev
```

### 2. Login

1. Open http://localhost:5173
2. Login with credentials:
   - **Admin**: admin@example.com / pass
   - **District Police**: kudimainukehdijaguarlelo@gmail.com / pass

### 3. Test File Upload

1. Navigate to **Upload** page (sidebar)
2. Fill in the form:
   ```
   Case ID: TEST-CASE-001
   Record Type: Evidence
   Description: Test file upload with MinIO and blockchain integration
   File: Select any PDF, image, or document (< 100MB)
   ```
3. Click **Upload to Blockchain**
4. Wait for success message
5. Note the **Record ID** and **File Hash**

**Expected Result:**
```
✅ Upload Successful!
Record ID: REC_1730000000_abc123
File Hash (SHA-256): a3b2c1d4e5f6...
Size: 1024 KB
✓ Stored on MinIO ✓ Recorded on Blockchain
```

### 4. Verify in MinIO Console

1. Open http://localhost:9001
2. Login: minioadmin / minioadmin
3. Navigate to **Buckets** → **cdms-evidence**
4. You should see: `TEST-CASE-001/` directory
5. Inside: `{timestamp}_{hash_prefix}_{filename}`

**Expected Result:**
- File is present in MinIO
- Organized by case ID
- Filename includes timestamp and hash prefix

### 5. View Audit Trail

1. Navigate to **Audit Trail** page
2. You should see the upload entry:
   ```
   Action: UPLOAD
   Actor: admin@example.com (or your user)
   Record ID: REC_1730000000_abc123
   Details: File uploaded: {filename} ({size} bytes, hash: a3b2c1d4...)
   Timestamp: [current time]
   TX ID: [blockchain transaction ID]
   ```

**Expected Result:**
- Upload action is logged
- Complete details are shown
- Transaction ID from blockchain is present

### 6. View Block History

1. Navigate to **Block History** page
2. You should see:
   - **Blockchain Blocks** section showing blocks
   - Your upload transaction in a block (Block #1, #2, etc.)
   - Block shows:
     - Block number and hash
     - Timestamp
     - Transaction count
     - Your file details (filename, hash, case ID)

**Expected Result:**
- Transaction is in a block
- Block shows correct metadata
- File hash is displayed
- Uploader information is shown

### 7. Test File Download

1. Navigate to **Records** page
2. Find your uploaded record
3. Click **Download** button
4. File should download
5. Verify the downloaded file matches original

**Expected Result:**
- File downloads successfully
- File content is identical to uploaded file
- Download action is logged in audit trail

### 8. Verify Download Audit

1. Go back to **Audit Trail** page
2. Refresh if needed
3. You should see a new entry:
   ```
   Action: DOWNLOAD
   Actor: [your user]
   Record ID: REC_1730000000_abc123
   Details: File downloaded: {filename}
   Timestamp: [current time]
   ```

**Expected Result:**
- Download action is logged
- Complete details are shown

### 9. Verify File Integrity

**Method 1: Check Response Headers**
```bash
curl -I "http://localhost:3000/record/REC_1730000000_abc123/download" \
  -H "Authorization: Bearer admin@example.com:A"
```

Look for: `X-File-Hash: a3b2c1d4e5f6...`

**Method 2: Calculate Hash Locally**
```bash
# On Linux/Mac
sha256sum downloaded-file.pdf

# On Windows PowerShell
Get-FileHash downloaded-file.pdf -Algorithm SHA256
```

Compare with hash in blockchain record.

**Expected Result:**
- Hashes match exactly
- Confirms file integrity

## Advanced Tests

### Test 1: Multiple Uploads

Upload 10 files to create multiple blocks:
1. Upload files one by one
2. View Block History
3. Verify transactions are grouped into blocks (5 per block)

**Expected Result:**
- Block #1: Transactions 1-5
- Block #2: Transactions 6-10
- Each block has hash and timestamp

### Test 2: Large File Upload

1. Upload a file close to 100MB limit
2. Verify upload progress indicator works
3. Check MinIO storage
4. Verify blockchain record

**Expected Result:**
- Progress bar shows upload progress
- Large file is handled correctly
- Hash is calculated for large file

### Test 3: Concurrent Uploads

1. Open two browser tabs
2. Login on both
3. Upload files simultaneously
4. Check audit trail and block history

**Expected Result:**
- Both uploads succeed
- Both are logged in audit trail
- Both appear in block history

### Test 4: Role-Based Access

**Test Upload Permissions:**
1. Login as **Investigator** (if you have one)
2. Try to access Upload page
3. Should be denied (investigator can't upload)

**Test Download Permissions:**
1. Login as **Investigator**
2. Navigate to Records page
3. Download a file
4. Should succeed (all roles can download)

**Expected Result:**
- Upload restricted to admin/district_police
- Download allowed for all authenticated users
- Proper error messages for denied actions

### Test 5: Error Handling

**Test File Size Limit:**
1. Try to upload a file > 100MB
2. Should show error: "File size exceeds 100MB limit"

**Test Missing Fields:**
1. Try to upload without Case ID
2. Should show error: "Please fill in all required fields"

**Test MinIO Down:**
1. Stop MinIO: `docker stop cdms-minio`
2. Try to upload a file
3. Should show error: "MinIO upload failed"
4. Restart MinIO: `docker start cdms-minio`

**Expected Result:**
- Proper error messages for all scenarios
- No crashes or blank screens
- User-friendly error descriptions

## Verification Checklist

After testing, verify:

- [x] Files are stored in MinIO
- [x] File hashes are calculated correctly
- [x] Metadata is recorded on blockchain
- [x] Audit trail shows all actions
- [x] Block history displays transactions in blocks
- [x] Downloads work and audit is logged
- [x] Role-based permissions are enforced
- [x] Error handling works properly
- [x] UI is responsive and shows progress
- [x] Recent uploads sidebar updates

## Common Issues

### Upload Fails with "Network Error"

**Cause**: Backend not running or wrong API URL

**Fix**:
```bash
# Check backend is running
cd cdms-backend
npm start

# Check frontend .env
# VITE_APP_API_URL=http://localhost:3000
```

### "MinIO upload failed: ECONNREFUSED"

**Cause**: MinIO not running

**Fix**:
```powershell
# Start MinIO
.\start-minio.ps1
```

### "Fabric identity not found"

**Cause**: User not registered in Fabric

**Fix**:
```bash
# Re-enroll admin
cd cdms-backend
node setup-test-admin.js

# Or approve user registration through Access Management page
```

### Audit Trail Not Showing Entries

**Cause**: GetAllHistory chaincode method not available

**Fix**:
```bash
# Redeploy chaincode
cd /mnt/c/CDMS_Blockchain
./deploy-chaincode.sh
```

## Success Criteria

✅ **All tests pass**
✅ **Files visible in MinIO console**
✅ **Hashes match between upload and download**
✅ **Audit trail captures all actions**
✅ **Block history shows transactions in blocks**
✅ **Role permissions enforced**
✅ **Error handling works correctly**

## Performance Benchmarks

Expected performance:
- **Upload < 1MB**: 1-3 seconds
- **Upload 10MB**: 3-10 seconds
- **Upload 100MB**: 30-60 seconds
- **Download**: Based on file size, similar to upload
- **Audit Trail Load**: < 2 seconds
- **Block History Load**: < 3 seconds

## Cleanup

After testing:

```powershell
# Stop MinIO
docker-compose -f docker-compose-minio.yml down

# Optional: Remove MinIO data
docker volume rm cdms_blockchain_minio-data
```

## Next Steps

After successful testing:
1. Upload real evidence files
2. Monitor audit trail regularly
3. Review block history for compliance
4. Set up backup for MinIO data
5. Configure production MinIO server
6. Enable TLS for production

---

**Testing Complete!** 🎉

Your CDMS Blockchain application now has:
- ✅ Secure file storage with MinIO
- ✅ Cryptographic integrity verification
- ✅ Immutable blockchain audit trail
- ✅ Transaction batching into blocks
- ✅ Complete role-based access control

