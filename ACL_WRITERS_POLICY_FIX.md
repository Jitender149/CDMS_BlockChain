# ACL Writers Policy Issue - Fix Guide

## Problem

You're getting this error:
```
Failed evaluating policy on signed data during check policy on channel [mychannel] with policy [/Channel/Application/Writers]: [implicit policy evaluation failed - 0 sub-policies were satisfied, but this policy requires 1 of the 'Writers' sub-policies to be satisfied]
```

## Root Cause

The user identity `kudimainukehdijaguarlelo` is **NOT in the Writers policy** for the channel. In Hyperledger Fabric, users must be in the Writers policy to submit transactions.

This is **NOT a chaincode issue** - the chaincode is deployed correctly (version 1.5 is active).

## Why Transactions Fail

1. User submits transaction → Backend calls `submitTransaction()`
2. Peer checks Writers policy → **FAILS** (user not in Writers)
3. Endorsement fails → No response from peer
4. Backend gets: "No valid responses from any peers"
5. Transaction never reaches orderer → No block created

## Solution Options

### Option 1: Use Admin Identity (Quick Fix)

The admin identities (`AdminOrg1`, `AdminOrg2`) are already in the Writers policy. Modify the backend to use admin identity for blockchain operations.

**Check if admin wallet exists:**
```powershell
# Check wallet directory
dir cdms-backend\wallet
```

Should see `AdminOrg1.id` and `AdminOrg2.id`.

**For uploads, use admin identity:**
- Change `api.js` to use `AdminOrg1` identity instead of user identity for blockchain operations
- User authentication still works, but blockchain writes use admin

### Option 2: Add User to Writers Policy (Proper Fix)

This requires updating the channel configuration to add the user's MSP to the Writers policy. This is more complex but is the proper solution.

**Steps:**
1. Export channel config
2. Modify Writers policy to include user's MSP
3. Update channel config
4. Commit update

This requires Fabric admin tools and channel update permissions.

### Option 3: Use Org Admin Identity

Instead of individual user identities, use the org admin identity (`AdminOrg1`) for all blockchain operations. The individual user is still authenticated for API access, but blockchain writes use the org admin.

## Recommended Quick Fix

For testing purposes, modify the upload endpoint to use `AdminOrg1` for blockchain operations:

```javascript
// In api.js, change:
const { contract, gateway } = await backend.getContract(req.auth.userId, req.auth.org);

// To:
const { contract, gateway } = await backend.getContract('AdminOrg1', 'Org1');
```

This will allow transactions to succeed while maintaining user authentication for API access.

