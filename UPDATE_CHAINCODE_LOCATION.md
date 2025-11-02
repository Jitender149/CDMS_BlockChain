# Update Chaincode in Correct Location

## Your Current Setup

You have your chaincode in:
```
fabric-samples/asset-transfer-basic/chaincode-javascript/
  ├── index.js (main entry point)
  ├── lib/
  │   ├── cdmsContract.js (your CDMS contract - OLD VERSION)
  │   └── assetTransfer.js (default example)
  └── package.json
```

The updated chaincode we created is in:
```
chaincode/
  └── index.js (NEW VERSION with all updates)
```

## What You Need to Do

### Option 1: Replace cdmsContract.js Content (Recommended)

**Copy the content from** `chaincode/index.js` **to** `fabric-samples/asset-transfer-basic/chaincode-javascript/lib/cdmsContract.js`

The file should be renamed from `CDMSContract` class to `CdmsContract` (note the lowercase 'd').

### Option 2: Update the Deployment Path

Or update your deployment script to point to the new `chaincode/` directory.

## Step-by-Step Fix

### 1. Copy the Updated Chaincode

I'll create the correct version for you in the right location.

### 2. Update package.json

Make sure `fabric-samples/asset-transfer-basic/chaincode-javascript/package.json` has `uuid` if needed:

```json
{
  "dependencies": {
    "fabric-contract-api": "~2.5",
    "fabric-shim": "~2.5",
    "uuid": "^9.0.0"
  }
}
```

### 3. Redeploy

After updating, redeploy the chaincode:

```powershell
cd C:\CDMS_Blockchain\fabric-samples\test-network

wsl bash -c "./network.sh deployCC -ccn cdmscontract -ccp ../asset-transfer-basic/chaincode-javascript -ccl javascript -ccv 1.5"
```

## Key Differences

The updated `chaincode/index.js` has:
- ✅ Role-based access control (district_police, investigator, forensics_officer, admin)
- ✅ Proper permissions for each role
- ✅ Block history methods (GetRecordHistory, GetAllHistory)
- ✅ Audit trail functionality
- ✅ Event emissions

The old `cdmsContract.js` had:
- ❌ Old permissions (investigator could create records)
- ❌ Missing some features
- ❌ Different role structure

## Quick Solution

I'll update the file in the correct location for you now.

