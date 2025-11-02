# CDMS Admin Guide - User Management & Roles

## 🔐 Admin Login Credentials

### Current Admin Account

From `approved_users.json`:

**Admin Account 1:**
- **Email**: `example@gmail.com`
- **Password**: `pass` (the password you used during initial setup)
- **Username**: `adminA`
- **Role**: `admin`
- **Organization**: `A` (District Police A)

**Admin Account 2:**
- **Email**: `admin@cdms.local`
- **Password**: `Admin@123`
- **Username**: `adminA`
- **Role**: `admin`
- **Organization**: `A`

---

## 👥 User Roles & Permissions

### Role Hierarchy

| Role | Organization | Can Upload | Can View/Access | Can Download | Can Update | Admin Functions |
|------|--------------|------------|-----------------|--------------|------------|-----------------|
| **Admin** | A or B | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes (Approve users) |
| **District Police** | A or B | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Investigator** | A or B | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Forensics Officer** | A or B | ❌ No | ✅ Yes | ❌ No | ❌ No | ❌ No |

### Role Descriptions

#### 1. **Admin**
- **Full system access**
- Can approve/reject user registration requests
- Can upload, view, download, and update records
- Can manage policies
- Can view audit trails and block history

#### 2. **District Police** (districtPoliceA / districtPoliceB)
- **Primary record managers**
- Can upload new records (evidence, FIRs, reports)
- Can view and access all records
- Can download records
- Can update existing records
- **Cannot** approve other users (admin-only function)

#### 3. **Investigator** (investigatorA / investigatorB)
- **Investigation and analysis**
- Can view and access all records
- Can download records for investigation
- **Cannot** upload new records
- **Cannot** update existing records
- Read and download only

#### 4. **Forensics Officer** (forensicsOfficerA / forensicsOfficerB)
- **View-only access for analysis**
- Can view and access records for forensic analysis
- **Cannot** download records
- **Cannot** upload new records
- **Cannot** update existing records
- View-only access

---

## 📝 User Management Workflow

### 1. User Registration Flow

```
User → Fills registration form → Submits request
     ↓
     Pending approval (stored in pending_registrations.json)
     ↓
Admin → Views pending registrations → Approves/Rejects
     ↓
     Fabric enrollment + Added to approved_users.json
     ↓
User → Can now login and use system
```

### 2. API Endpoints for Admin

#### Get Pending Registrations
```http
GET /pending-registrations?adminEmail=example@gmail.com
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "pending": [
    {
      "username": "johndoe",
      "email": "john@example.com",
      "role": "investigator",
      "org": "A",
      "status": "pending"
    }
  ]
}
```

#### Approve Registration
```http
POST /approve-registration
Content-Type: application/json

{
  "email": "john@example.com",
  "adminEmail": "example@gmail.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User johndoe approved and enrolled in Fabric (A). Use your email and password to log in.",
  "walletId": "john_example_com"
}
```

---

## 🎯 Available Roles to Approve

When approving users, they can request these roles:

### Organization A (District Police A)
- `districtPoliceA` or `district_police` (with org: A)
- `investigatorA` or `investigator` (with org: A)
- `forensicsOfficerA` or `forensics_officer` (with org: A)

### Organization B (District Police B)
- `districtPoliceB` or `district_police` (with org: B)
- `investigatorB` or `investigator` (with org: B)
- `forensicsOfficerB` or `forensics_officer` (with org: B)

---

## 🔄 Testing the System

### Step 1: Login as Admin

```bash
# Frontend login
Email: example@gmail.com
Password: pass
Organization: A
```

Or via API:
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "example@gmail.com",
    "password": "pass",
    "org": "A"
  }'
```

### Step 2: View Pending Registrations

```bash
curl -X GET "http://localhost:3000/pending-registrations?adminEmail=example@gmail.com"
```

### Step 3: Approve a User

```bash
curl -X POST http://localhost:3000/approve-registration \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "adminEmail": "example@gmail.com"
  }'
```

### Step 4: New User Can Login

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "theirpassword",
    "org": "A"
  }'
```

---

## 🛠️ Backend Files Used

### Registration Scripts

These files are automatically called during approval based on role and org:

**Organization A:**
- `registerDistrictPoliceA.js` - Enrolls district police for Org A
- `registerInvestigatorA.js` - Enrolls investigators for Org A
- `registerForensicsOfficerA.js` - Enrolls forensics officers for Org A

**Organization B:**
- `registerDistrictPoliceB.js` - Enrolls district police for Org B
- `registerInvestigatorB.js` - Enrolls investigators for Org B
- `registerForensicsOfficerB.js` - Enrolls forensics officers for Org B

### Data Files

- `approved_users.json` - Approved users who can login
- `pending_registrations.json` - Users awaiting admin approval
- `wallet/` - Fabric identity wallets for enrolled users

---

## 🔒 Chaincode Permissions

Updated in `chaincode/index.js` (version 1.3):

### Create/Upload Records
- ✅ **district_police**
- ✅ **admin**
- ❌ investigator
- ❌ forensics_officer

### Read/View Records
- ✅ **district_police**
- ✅ **investigator**
- ✅ **forensics_officer**
- ✅ **admin**

### Update Records
- ✅ **district_police**
- ✅ **admin**
- ❌ investigator
- ❌ forensics_officer

### Delete Records
- ✅ **admin** only
- ❌ all others

### Query/List Records
- ✅ **All authenticated users**

### View Audit Trail & Block History
- ✅ **All authenticated users**

---

## ⚙️ Configuration

### Adding More Admins

To add more admin accounts manually:

1. Create a user with role `admin`
2. Register them using the registration endpoint
3. Approve using existing admin account
4. Or manually add to `approved_users.json`:

```json
{
  "email": "newadmin@example.com",
  "username": "newAdminUser",
  "password": "$2b$10$...", // bcrypt hash
  "role": "admin",
  "org": "A",
  "walletId": "newadmin_example_com"
}
```

5. Run the appropriate enrollment script:
```bash
node registerDistrictPoliceA.js
# Enter: newAdminUser and newadmin@example.com when prompted
```

---

## 📊 Frontend Integration

### Admin Dashboard Requirements

The frontend needs to implement:

1. **Admin Dashboard** - Show pending registrations
2. **Approve/Reject Buttons** - Call `/approve-registration` endpoint
3. **User List** - Display approved users
4. **Role Indicator** - Show what each user can do

### Example Frontend Code

```javascript
// Get pending registrations
const getPendingUsers = async () => {
  const response = await fetch(
    `${API_URL}/pending-registrations?adminEmail=${adminEmail}`
  );
  const data = await response.json();
  return data.pending;
};

// Approve a user
const approveUser = async (email) => {
  const response = await fetch(`${API_URL}/approve-registration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      adminEmail: currentUser.email 
    })
  });
  return response.json();
};
```

---

## 🚀 Deployment Checklist

After updating the code:

1. ✅ **Redeploy Chaincode** (v1.3 with updated permissions):
   ```bash
   .\deploy-chaincode.ps1
   ```

2. ✅ **Restart Backend**:
   ```bash
   cd cdms-backend
   npm start
   ```

3. ✅ **Test Admin Login**:
   - Email: `example@gmail.com`
   - Password: `pass`
   - Org: `A`

4. ✅ **Create Test Users** (for different roles):
   - Register via frontend/API
   - Approve as admin
   - Test their permissions

5. ✅ **Verify Permissions**:
   - District Police can upload
   - Investigator can download
   - Forensics Officer can only view

---

## 📞 Support

If you need to:
- **Reset admin password**: Update `approved_users.json` with new bcrypt hash
- **Add new role**: Update chaincode permissions in `index.js`
- **Change permissions**: Modify `_isAllowed()` checks in chaincode
- **View logs**: Check backend console and Docker logs

---

## Summary

**Who is the Admin?**
- Email: `example@gmail.com` or `admin@cdms.local`
- Password: `pass` or `Admin@123`
- Role: `admin`
- Org: `A`

**What can Admin do?**
- ✅ Approve/reject user registrations
- ✅ Upload, view, download, update, delete records
- ✅ Full system access
- ✅ Manage policies and view all audit trails

**Login and start approving users!** 🎉

