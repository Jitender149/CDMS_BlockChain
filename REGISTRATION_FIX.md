# Registration Page Fix

## Issue
`API_URL is not defined` error when submitting the registration form.

## Root Cause
The `RegisterPage.jsx` component was missing the API_URL constant definition.

## Fix Applied

### 1. Added API_URL Constant
```javascript
const API_URL = import.meta.env.VITE_APP_API_URL || 'http://localhost:3000';
```

### 2. Updated Roles to Match Backend
Changed from display names to backend role values:
- `"district_police"` - District Police
- `"investigator"` - Investigator  
- `"forensics_officer"` - Forensics Officer

### 3. Updated Organizations
Changed to match backend expectations:
- `"A"` - District Police A
- `"B"` - District Police B

## Testing

### 1. Make sure backend is running:
```powershell
cd cdms-backend
npm start
```

### 2. Make sure frontend is running:
```powershell
cd cdms-frontend
npm run dev
```

### 3. Test Registration:
1. Go to http://localhost:5173/register (or your frontend URL)
2. Fill in the form:
   - Username: test_user
   - Email: test@example.com
   - Password: Test@123
   - Confirm Password: Test@123
   - Role: District Police
   - Organization: District Police A

3. Click "Submit Registration"
4. Should see success message: "Your registration request has been submitted successfully"

### 4. Verify Registration:
```powershell
# Check pending registrations file
cat cdms-backend/pending_registrations.json
```

Should show the new user with status "pending".

### 5. Test Admin Approval:
1. Login as admin (email: example@gmail.com, password: pass)
2. Call the pending registrations API:
```bash
curl "http://localhost:3000/pending-registrations?adminEmail=example@gmail.com"
```

3. Approve the user:
```bash
curl -X POST http://localhost:3000/approve-registration \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "adminEmail": "example@gmail.com"
  }'
```

4. User can now login!

## Environment Variables

Make sure `cdms-frontend/.env` exists with:
```
VITE_APP_API_URL=http://localhost:3000
```

If it doesn't exist, create it. The code defaults to `http://localhost:3000` if not set.

## Status
✅ **Fixed** - Registration page now works correctly with backend API

