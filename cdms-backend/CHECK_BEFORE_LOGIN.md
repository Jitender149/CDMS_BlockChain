# Pre-Login Verification Checklist

Before attempting to login, verify your setup using this checklist:

## Quick Verification

Run the verification script:

```bash
cd cdms-backend
npm run verify-setup
```

Or directly:

```bash
node verifySetup.js
```

This will check:
- ✅ Wallet directory and identities
- ✅ Connection profiles
- ✅ Environment variables
- ✅ Docker network and containers

## Manual Checklist

### 1. ✅ Backend Configuration

Check your `.env` file (create from `env.example` if missing):

```bash
cd cdms-backend
cp env.example .env
# Edit .env with your values
```

Required variables:
- `CHANNEL_NAME=mychannel`
- `CONTRACT_NAME=cdmscontract`
- `VAULT_TOKEN=root` (or your token)
- `VAULT_ADDR=http://127.0.0.1:8200`

### 2. ✅ Wallet Identities

Check wallet contains required identities:

```bash
ls wallet/
# Should see:
# - AdminOrg1.id
# - AdminOrg2.id
# - (Other user identities if enrolled)
```

If missing, enroll admins:

```bash
node enrollAdminA.js
node enrollAdminB.js
```

### 3. ✅ Connection Profiles

Check connection profiles exist:

```bash
# Windows path
dir ..\fabric-samples\test-network\organizations\peerOrganizations\org1.example.com\connection-org1.json

# WSL path
ls ../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json
ls ../fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json
```

Both files must exist. If missing, start Fabric network:

```bash
cd ../fabric-samples/test-network
./network.sh up createChannel
```

### 4. ✅ Docker Network Running

Verify Fabric containers are running:

```bash
# In WSL or PowerShell
docker ps

# Should see containers like:
# - peer0.org1.example.com
# - peer0.org2.example.com
# - orderer.example.com
# - ca_org1
# - ca_org2
```

If not running:

```bash
cd fabric-samples/test-network
./network.sh up
```

### 5. ✅ User in Approved List

Check user is in `approved_users.json`:

```bash
# Check the file exists and contains your user
cat approved_users.json
```

User format should be:
```json
[
  {
    "email": "example@gmail.com",
    "password": "$2b$10$...",
    "role": "admin",
    "username": "adminA",
    "org": "A"
  }
]
```

### 6. ✅ Vault Running (Optional but Recommended)

Check Vault is accessible:

```bash
# Check Vault health
curl http://127.0.0.1:8200/v1/sys/health

# Or check from backend
cd cdms-backend
# Start backend and check /vault/status endpoint
```

## Common Issues

### Issue: "Identity does not exist in wallet"

**Solution**:
1. Check wallet directory: `ls wallet/`
2. Verify identity name matches:
   - Admin users: `AdminOrg1` or `AdminOrg2`
   - Regular users: `email_lowercase_with_underscores`
3. Re-enroll if missing: `node enrollAdminA.js`

### Issue: "Connection profile not found"

**Solution**:
1. Start Fabric network: `cd fabric-samples/test-network && ./network.sh up createChannel`
2. Wait for network to fully start
3. Verify files exist: `ls organizations/peerOrganizations/org1.example.com/connection-org1.json`

### Issue: "Docker network is required"

**Solution**:
1. Check Docker is running: `docker ps`
2. Check WSL integration enabled in Docker Desktop
3. Start network: `./network.sh up`

### Issue: "User not approved"

**Solution**:
1. Check `approved_users.json` contains user
2. User must be approved by admin first
3. Admin must enroll user in Fabric after approval

## Debug Login Attempt

When login fails, check backend logs. The enhanced logging will show:

```
[LOGIN DEBUG] Attempting login for: example@gmail.com
[LOGIN DEBUG] Organization: Org1, Wallet ID: AdminOrg1, Role: admin
[BACKEND DEBUG] Connection profile found: ...
[BACKEND DEBUG] Opening wallet at: ...
[BACKEND DEBUG] Looking for identity: AdminOrg1 in wallet...
[BACKEND DEBUG] Identity found: AdminOrg1
[BACKEND DEBUG] Creating Gateway and connecting...
[BACKEND DEBUG] Gateway connected successfully
[BACKEND DEBUG] Getting network: mychannel...
[BACKEND DEBUG] Network obtained: mychannel
[BACKEND DEBUG] Getting contract: cdmscontract...
[BACKEND DEBUG] Contract obtained: cdmscontract
```

This helps identify exactly where the failure occurs:
- `Gateway.connect()` - Connection profile or Docker network issue
- `network.getNetwork()` - Channel not created
- `network.getContract()` - Chaincode not deployed
- Identity check - User not enrolled

## After Verification

Once all checks pass:

1. ✅ Start backend: `npm start`
2. ✅ Try login from frontend
3. ✅ Check backend logs for detailed debug info

