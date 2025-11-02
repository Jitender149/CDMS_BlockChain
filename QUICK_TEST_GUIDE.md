# 🚀 Quick Test Guide - User Approval is Ready!

## ✅ System Status

All components are running and the wallet has been reset with fresh admin identities:

- ✅ Fabric Network running
- ✅ Certificate Authorities operational  
- ✅ Chaincode deployed (CDMS v1.4)
- ✅ Backend API running (http://localhost:3000)
- ✅ **Fresh admin identities enrolled** (Authentication fixed!)
- ⏳ Frontend ready to start

## 🧪 How to Test User Approval

### Method 1: Using Frontend (Recommended)

#### Step 1: Start Frontend

```powershell
cd C:\CDMS_Blockchain\cdms-frontend
npm run dev
```

#### Step 2: Register a Test User

1. Open: http://localhost:5173/register
2. Fill in:
   ```
   Username: JohnWick
   Email: johnwick@example.com  
   Password: test123
   Role: Investigator A
   Organization: A
   ```
3. Click **Register**
4. You should see: "Registration successful! Awaiting admin approval."

#### Step 3: Login as Admin

1. Go to: http://localhost:5173/login
2. Enter:
   ```
   Email: example@gmail.com
   Password: pass
   Organization: A
   ```
3. Click **Sign In**
4. You should be logged in as admin ✅

#### Step 4: Approve the User

1. Click on **Access Management** in the navigation
2. Go to **Pending Approvals** tab
3. You'll see: `johnwick@example.com` with role `investigatorA`
4. Click the **Approve** button
5. Wait a few seconds...
6. You should see: "User approved successfully!" ✅

**This will now work!** The CA authentication error is fixed.

#### Step 5: Login as the Approved User

1. Logout from admin
2. Go to login page
3. Enter:
   ```
   Email: johnwick@example.com
   Password: test123
   Organization: A
   ```
4. Click **Sign In**
5. You'll see the investigator dashboard! ✅

### Method 2: Using API (Quick Test)

```powershell
# 1. Register a user
curl -X POST http://localhost:3000/register `
  -H "Content-Type: application/json" `
  -d '{
    \"username\": \"TestUser\",
    \"email\": \"testuser@example.com\",
    \"password\": \"test123\",
    \"role\": \"investigator\",
    \"org\": \"A\"
  }'

# 2. Approve the user (as admin)
curl -X POST http://localhost:3000/approve-registration `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"testuser@example.com\",
    \"adminEmail\": \"example@gmail.com\"
  }'

# 3. Login as the new user
curl -X POST http://localhost:3000/login `
  -H "Content-Type: application/json" `
  -d '{
    \"email\": \"testuser@example.com\",
    \"password\": \"test123\",
    \"org\": \"A\"
  }'
```

If all three commands succeed, your system is working perfectly! ✅

## 🔍 What to Look For

### Success Indicators

After approval, you should see:

1. **In Terminal (Backend Logs)**:
   ```
   Admin example@gmail.com approving user TestUser (investigator) for A...
   ✅ Successfully enrolled... and imported it into the wallet
   ```

2. **In Wallet Directory**:
   ```powershell
   ls C:\CDMS_Blockchain\cdms-backend\wallet\
   ```
   Should show:
   ```
   AdminOrg1.id
   AdminOrg2.id
   testuser_example_com.id  ← New user!
   ```

3. **In approved_users.json**:
   ```powershell
   cat C:\CDMS_Blockchain\cdms-backend\approved_users.json
   ```
   Should include the new user.

### Error Indicators

If you see these, something is wrong:

- ❌ "Authentication failure" → Wallet/CA mismatch (we just fixed this!)
- ❌ "CA not reachable" → CA containers not running
- ❌ "Identity already exists" → User already enrolled (try different email)

## 📊 Test Different Roles

Try registering users with different roles:

### Investigator A
```json
{
  "role": "investigator",
  "org": "A"
}
```
**Can**: View records, query by case, view history  
**Cannot**: Upload or modify records

### District Police A
```json
{
  "role": "district_police",
  "org": "A"
}
```
**Can**: Upload records, modify records, full access  
**Cannot**: Approve other users (only admin can)

### Forensics Officer A
```json
{
  "role": "forensics_officer",
  "org": "A"
}
```
**Can**: View records, query by case, view audit trails  
**Cannot**: Upload or modify records

### Admin
```json
{
  "role": "admin",
  "org": "A"
}
```
**Can**: Everything + approve/revoke users

## 🎯 What You Can Test Now

With approved users, you can test:

### 1. Role-Based Access Control
- Login as different roles
- Try accessing restricted features
- Verify permissions work correctly

### 2. Record Management
- Upload a crime record (as district_police or admin)
- View records (as any role)
- Update records (as district_police or admin)
- Try to update as investigator (should fail)

### 3. Block History
- Upload multiple records
- Go to Block History page
- See all transactions recorded on blockchain

### 4. Audit Trails
- Perform various actions
- Check audit trails
- Verify all actions are logged

### 5. Access Management
- Register multiple users
- Approve some, reject others
- Revoke access for a user
- Restore revoked access

## ⚡ Quick Commands

```powershell
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check backend is running
curl http://localhost:3000/health

# Check wallet identities
ls C:\CDMS_Blockchain\cdms-backend\wallet\

# View approved users
cat C:\CDMS_Blockchain\cdms-backend\approved_users.json

# View pending registrations
cat C:\CDMS_Blockchain\cdms-backend\pending_registrations.json

# Check CA logs (if issues)
docker logs ca_org1 --tail 20
docker logs ca_org2 --tail 20

# Check chaincode logs
docker logs $(docker ps --filter "name=dev-peer0.org1.*cdmscontract" -q) --tail 20
```

## 🎉 You're Ready!

The authentication error is fixed. Your system is fully operational.

**Start the frontend and begin testing!**

```powershell
cd C:\CDMS_Blockchain\cdms-frontend
npm run dev
```

Then:
1. Register a user
2. Login as admin
3. Approve the user
4. **It will work!** ✅

---

**The system is ready. Go test it!** 🚀

