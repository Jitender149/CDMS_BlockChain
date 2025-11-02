# 🚀 Quick Start Guide - Document Upload Feature

## Prerequisites Check

```powershell
# ✅ Docker Desktop running
docker --version

# ✅ Node.js installed
node --version

# ✅ Fabric network running (in WSL)
# Check in WSL: docker ps | grep peer
```

## 1. Start MinIO (30 seconds)

```powershell
# In project root
.\start-minio.ps1
```

**Expected Output:**
```
✅ MinIO Started Successfully!
   API:     http://localhost:9000
   Console: http://localhost:9001
```

## 2. Start Backend (1 minute)

```powershell
# Terminal 1
cd cdms-backend
npm install  # First time only
npm start
```

**Expected Output:**
```
✅ MinIO bucket 'cdms-evidence' created successfully
🚀 CDMS API Server running on port 3000
```

## 3. Start Frontend (30 seconds)

```powershell
# Terminal 2
cd cdms-frontend
npm run dev
```

**Expected Output:**
```
  ➜  Local:   http://localhost:5173/
```

## 4. Test Upload (2 minutes)

### Login
```
URL: http://localhost:5173
Email: admin@example.com
Password: pass
Organization: A
```

### Upload File
1. Click **Upload** in sidebar
2. Fill form:
   ```
   Case ID: TEST-001
   Record Type: Evidence
   Description: Test upload
   File: [Select any file < 100MB]
   ```
3. Click **Upload to Blockchain**

### ✅ Success Looks Like:
```
✅ Upload Successful!
Record ID: REC_1730000000_abc123
File Hash: a3b2c1d4e5f6...
✓ Stored on MinIO ✓ Recorded on Blockchain
```

## 5. Verify (1 minute)

### Check MinIO
```
URL: http://localhost:9001
Login: minioadmin / minioadmin
Navigate: Buckets → cdms-evidence → TEST-001/
```

### Check Audit Trail
```
Click: Audit Trail (sidebar)
See: Your upload logged with timestamp
```

### Check Block History
```
Click: Block History (sidebar)
See: Transaction in Block #1 with file details
```

## Common Commands

### Start Everything
```powershell
# Terminal 1: MinIO
.\start-minio.ps1

# Terminal 2: Backend
cd cdms-backend && npm start

# Terminal 3: Frontend
cd cdms-frontend && npm run dev
```

### Stop Everything
```powershell
# Stop Backend/Frontend: Ctrl+C in terminals

# Stop MinIO
docker-compose -f docker-compose-minio.yml down
```

### Restart MinIO Only
```powershell
docker restart cdms-minio
```

### View Logs
```powershell
# MinIO logs
docker logs cdms-minio

# Backend logs
# (in terminal where npm start is running)

# Frontend logs
# (in terminal where npm run dev is running)
```

## Troubleshooting

### "Upload failed: MinIO upload failed"
```powershell
# Check MinIO is running
docker ps | findstr minio

# If not running
.\start-minio.ps1
```

### "Fabric identity not found"
```powershell
# Re-enroll admin
cd cdms-backend
node setup-test-admin.js
```

### "Port already in use"
```powershell
# Find and kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F

# Or change port in cdms-backend/api.js
# const PORT = 3001; // Instead of 3000
```

### Backend won't start
```powershell
# Reinstall dependencies
cd cdms-backend
rm -rf node_modules
npm install
npm start
```

## Key URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | admin@example.com / pass |
| **Backend API** | http://localhost:3000 | N/A (internal) |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin |
| **MinIO API** | http://localhost:9000 | N/A (internal) |

## Test Users

| Email | Password | Role | Org | Can Upload? |
|-------|----------|------|-----|-------------|
| admin@example.com | pass | admin | A | ✅ Yes |
| kudimainukehdijaguarlelo@gmail.com | pass | district_police | A | ✅ Yes |

## Key Features

### ✅ What Works Now

- **Upload**: Files to MinIO with blockchain recording
- **Download**: Files with audit logging
- **Integrity**: SHA-256 hash verification
- **Audit Trail**: All actions on blockchain
- **Block History**: Transactions grouped in blocks (5 each)
- **Role Access**: Permissions enforced properly
- **Search**: Find records by ID, case, user
- **Real-time**: Progress bars and status updates

### 🎯 Quick Test Checklist

- [ ] MinIO starts successfully
- [ ] Backend connects to MinIO
- [ ] Frontend loads without errors
- [ ] Login works
- [ ] File uploads successfully
- [ ] File appears in MinIO console
- [ ] Audit trail shows upload
- [ ] Block history shows transaction
- [ ] File can be downloaded
- [ ] Download shows in audit trail

## Performance

| Operation | Expected Time |
|-----------|---------------|
| MinIO startup | 5-10 seconds |
| Backend startup | 10-15 seconds |
| Frontend startup | 5-10 seconds |
| Login | < 1 second |
| Upload (1MB) | 1-3 seconds |
| Upload (10MB) | 3-10 seconds |
| Upload (100MB) | 30-60 seconds |
| Download | Similar to upload |
| View audit trail | < 2 seconds |
| View block history | < 3 seconds |

## Next Steps

### After Successful Test

1. ✅ Upload real evidence files
2. 📊 Monitor audit trail regularly  
3. 🔍 Review block history for compliance
4. 👥 Add more users via Access Management
5. 🔒 Configure production MinIO (see MINIO_SETUP.md)
6. 📈 Set up monitoring and alerts

### Learn More

- **Complete Setup**: `MINIO_SETUP.md`
- **Testing Guide**: `TEST_UPLOAD_FLOW.md`
- **Full Summary**: `UPLOAD_FEATURE_SUMMARY.md`

## Support

### Get Help

1. Check logs in terminal windows
2. Review error messages carefully
3. Verify all services are running
4. Check `MINIO_SETUP.md` troubleshooting section
5. Restart services if needed

### Report Issues

When reporting issues, include:
- What you were trying to do
- Error message (exact text)
- Terminal output/logs
- Browser console errors (F12)
- Steps to reproduce

---

## 🎉 That's It!

You now have:
- ✅ Secure file storage (MinIO)
- ✅ Blockchain integrity (Hyperledger Fabric)
- ✅ Complete audit trail
- ✅ Block visualization
- ✅ Role-based access control

**Time to upload some files!** 🚀

