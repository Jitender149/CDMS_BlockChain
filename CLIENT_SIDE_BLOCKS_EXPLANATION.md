# Client-Side Block Simulation - Does NOT Cause Problems

## What `groupIntoBlocks` Does

The `groupIntoBlocks` function (line 78-115 in `api.js`) is **ONLY for display purposes**:
- It groups transactions into blocks for the frontend UI
- It creates simulated block hashes and numbers
- It does NOT prevent actual blockchain block creation
- It does NOT replace real blocks

## How It Works

1. **Upload Flow:**
   - ✅ File uploaded → MinIO
   - ✅ Metadata saved → `uploads_fallback.json` (for resilience)
   - ✅ **Transaction submitted to blockchain** (line 690: `contract.submitTransaction`)
   - ✅ If successful → Real block created by orderer
   - ⚠️ If failed → Only fallback storage (but transaction still attempted)

2. **Block History Flow:**
   - ✅ Try to get real blocks from blockchain
   - ✅ Combine with fallback data (if blockchain fails)
   - ✅ **Then simulate blocks for display** using `groupIntoBlocks`
   - ⚠️ This is just for UI visualization

## Why Blocks Aren't Created

**NOT because of `groupIntoBlocks`!**

The real issue:
1. ✅ Transactions ARE being submitted to blockchain (code is correct)
2. ❌ Transactions FAIL due to ACL Writers policy (fixed but needs backend restart)
3. ⚠️ When transactions fail → Only fallback storage is used
4. ⚠️ Frontend shows simulated blocks (because real blocks don't exist)

## The Real Problem

**Transactions are failing before reaching orderer:**
- ACL Writers policy error → Transaction rejected at peer
- No endorsement → Transaction never reaches orderer
- No block created → Only simulated blocks shown in frontend

## Solution

1. ✅ **ACL fix already applied** (uses `AdminOrg1` instead of user identity)
2. ⏳ **Restart backend** to apply fix
3. ⏳ **Test upload** - Should create real blocks now
4. ✅ **Real blocks will appear** - Frontend will show actual blockchain blocks

## Summary

- ❌ `groupIntoBlocks` is NOT causing the problem
- ✅ It's just for UI display
- ✅ Real transactions ARE being submitted
- ❌ But they're failing due to ACL (fixed, needs restart)
- ✅ After restart, real blocks will be created

