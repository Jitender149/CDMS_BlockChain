# CDMS Role Permissions Summary

## ✅ Existing Functionality - Already Implemented!

Good news! The functionality you requested **already exists** in the system. Here's what's already working:

### 1. ✅ User Registration & Approval System
- Users can sign up through the frontend
- Registrations are stored in `pending_registrations.json`
- Admin can approve/reject users
- Upon approval, users are enrolled in Hyperledger Fabric

### 2. ✅ Admin Can Add Other Users
- Admin has a `/pending-registrations` endpoint to view requests
- Admin uses `/approve-registration` endpoint to approve users
- System automatically enrolls users in Fabric based on role and org

### 3. ✅ Multiple Roles Already Defined
All these roles are already supported:
- `admin` - Full system access
- `district_police` (districtPoliceA / districtPoliceB)
- `investigator` (investigatorA / investigatorB)
- `forensics_officer` (forensicsOfficerA / forensicsOfficerB)

---

## 📊 What I Updated

### Backend Changes (`cdms-backend/api.js`)

#### Added:
1. **GET /pending-registrations** - Admin can fetch pending user requests
2. **Admin verification** on `/approve-registration` endpoint
3. **Support for role aliases** (districtPoliceA, forensicsOfficerA, etc.)

### Chaincode Changes (`chaincode/index.js` v1.4)

Updated all methods with correct role permissions:

| Operation | district_police | investigator | forensics_officer | admin |
|-----------|----------------|--------------|-------------------|-------|
| **CreateRecord** (Upload) | ✅ | ❌ | ❌ | ✅ |
| **ReadRecord** (View) | ✅ | ✅ | ✅ | ✅ |
| **UpdateRecord** | ✅ | ❌ | ❌ | ✅ |
| **DeleteRecord** | ❌ | ❌ | ❌ | ✅ |
| **QueryRecords** | ✅ | ✅ | ✅ | ✅ |
| **ListAllRecords** | ✅ | ✅ | ✅ | ✅ |
| **GetAuditTrail** | ✅ | ✅ | ✅ | ✅ |
| **GetRecordHistory** | ✅ | ✅ | ✅ | ✅ |
| **GetAllHistory** | ✅ | ✅ | ✅ | ✅ |

**Note:** Download functionality is handled at the API level, not in chaincode. Investigator can download (API allows it), but Forensics Officer cannot.

---

## 🔐 Current Admin Credentials

From `approved_users.json`:

### **Admin Account to Use:**
```
Email: example@gmail.com
Password: pass
Role: admin
Organization: A
```

Or:

```
Email: admin@cdms.local
Password: Admin@123
Role: admin
Organization: A
```

---

## 👤 Role Details

### 1. **Admin** ⭐
**What they can do:**
- ✅ Approve/reject user registrations (admin-only feature)
- ✅ Upload new records (evidence, FIRs, reports)
- ✅ View/access all records
- ✅ Download records
- ✅ Update existing records
- ✅ Delete records
- ✅ View audit trails and block history
- ✅ Manage policies

**Fabric wallet ID:** `AdminOrg1` or `AdminOrg2`

---

### 2. **District Police** (districtPoliceA / districtPoliceB) 🚔
**What they can do:**
- ✅ Upload new records (evidence, FIRs, reports) ← **KEY FEATURE**
- ✅ View/access all records
- ✅ Download records
- ✅ Update existing records
- ✅ View audit trails and block history
- ❌ Cannot approve users (admin only)
- ❌ Cannot delete records (admin only)

**Purpose:** Primary record managers for their district

---

### 3. **Investigator** (investigatorA / investigatorB) 🕵️
**What they can do:**
- ✅ View/access all records ← **Read access**
- ✅ Download records ← **Can download for investigation**
- ✅ View audit trails and block history
- ❌ Cannot upload new records
- ❌ Cannot update existing records
- ❌ Cannot delete records

**Purpose:** Investigation and analysis with download capability

---

### 4. **Forensics Officer** (forensicsOfficerA / forensicsOfficerB) 🔬
**What they can do:**
- ✅ View/access all records ← **View only**
- ✅ View audit trails and block history
- ❌ Cannot download records ← **View-only restriction**
- ❌ Cannot upload new records
- ❌ Cannot update existing records
- ❌ Cannot delete records

**Purpose:** Forensic analysis with view-only access (security requirement)

---

## 🔄 User Approval Workflow

### Step 1: User Registers
```javascript
POST /register
{
  "username": "john_doe",
  "email": "john@districtpolice.com",
  "password": "SecurePass123",
  "role": "district_police",  // or investigator, forensics_officer
  "org": "A"  // or "B"
}
```

→ Stored in `pending_registrations.json`

### Step 2: Admin Reviews
```javascript
GET /pending-registrations?adminEmail=example@gmail.com

Response:
{
  "success": true,
  "count": 1,
  "pending": [
    {
      "username": "john_doe",
      "email": "john@districtpolice.com",
      "role": "district_police",
      "org": "A",
      "status": "pending"
    }
  ]
}
```

### Step 3: Admin Approves
```javascript
POST /approve-registration
{
  "email": "john@districtpolice.com",
  "adminEmail": "example@gmail.com"
}
```

→ System calls `registerDistrictPoliceA.js`  
→ User enrolled in Fabric  
→ Added to `approved_users.json`  
→ User can now login

### Step 4: User Logs In
```javascript
POST /login
{
  "email": "john@districtpolice.com",
  "password": "SecurePass123",
  "org": "A"
}
```

→ User can access system with their role permissions

---

## 📝 Available Enrollment Scripts

These are already in your `cdms-backend/` directory:

**Organization A:**
- `registerDistrictPoliceA.js` ✅
- `registerInvestigatorA.js` ✅
- `registerForensicsOfficerA.js` ✅

**Organization B:**
- `registerDistrictPoliceB.js` ✅
- `registerInvestigatorB.js` ✅
- `registerForensicsOfficerB.js` ✅

These scripts are **automatically called** during the approval process based on the user's role and organization.

---

## 🚀 Deployment Instructions

### 1. Redeploy Chaincode (Required)
The chaincode permissions have been updated to v1.4:

```powershell
# Option 1: PowerShell
.\deploy-chaincode.ps1

# Option 2: WSL
bash deploy-chaincode.sh
```

### 2. Restart Backend
```powershell
cd cdms-backend
npm start
```

### 3. Test as Admin

**Login:**
```
Email: example@gmail.com
Password: pass
Org: A
```

**View pending registrations:**
```bash
curl -X GET "http://localhost:3000/pending-registrations?adminEmail=example@gmail.com"
```

**Approve a user:**
```bash
curl -X POST http://localhost:3000/approve-registration \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "adminEmail": "example@gmail.com"
  }'
```

---

## 📚 API Endpoints Summary

### Public Endpoints
- `POST /register` - User registration (no auth required)
- `POST /login` - User login

### Admin-Only Endpoints
- `GET /pending-registrations?adminEmail=<admin_email>` - View pending users
- `POST /approve-registration` - Approve a user (requires adminEmail)

### Authenticated Endpoints
- `POST /record/upload` - Upload record (district_police, admin only)
- `GET /records` - List all records (all roles)
- `GET /records/:id` - Get specific record (all roles)
- `GET /records/:id/download` - Download record (district_police, investigator, admin only)
- `PUT /records/:id` - Update record (district_police, admin only)
- `GET /block-history` - View all block history (all roles)
- `GET /record/:id/history` - View record history (all roles)

---

## 🎯 Testing Checklist

- [ ] Deploy chaincode v1.4
- [ ] Restart backend
- [ ] Login as admin (`example@gmail.com` / `pass`)
- [ ] Create test user registrations for each role
- [ ] Approve users as admin
- [ ] Test each role's permissions:
  - [ ] District Police can upload
  - [ ] Investigator can download
  - [ ] Forensics Officer can only view (no download)
  - [ ] All can access block history

---

## 📖 Documentation Files Created

1. **ADMIN_GUIDE.md** - Complete admin guide with login credentials
2. **ROLE_PERMISSIONS_SUMMARY.md** - This file
3. **CHAINCODE_UPDATE_SUMMARY.md** - Technical details of chaincode changes

---

## ✨ Summary

### What Already Existed:
✅ User registration system  
✅ Admin approval workflow  
✅ Fabric enrollment scripts for all roles  
✅ Basic role-based access control  

### What I Updated:
✅ Added `/pending-registrations` endpoint  
✅ Added admin verification on approval  
✅ Updated chaincode permissions to match exact requirements:
  - District Police: Upload, access, download ✅
  - Investigator: Access, download only ✅
  - Forensics Officer: Access only (no download) ✅
  - Admin: Full access ✅

### Admin Login:
```
Email: example@gmail.com
Password: pass
Organization: A
```

**You're ready to go! Login as admin and start approving users.** 🎉

