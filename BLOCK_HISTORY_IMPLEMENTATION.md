# Block History Feature Implementation

## Overview

Complete implementation of block history viewing feature for CDMS Blockchain application. This feature displays the transaction history from the Hyperledger Fabric blockchain.

## Components Implemented

### 1. Chaincode Methods (`chaincode/index.js`)

#### `GetRecordHistory(recordId)`
- Retrieves the complete transaction history for a specific record
- Returns all transactions (create, update, delete) for the record
- Includes transaction ID, timestamp, and record state at each transaction

#### `GetAllHistory(limit)`
- Retrieves transaction history across all records
- Supports limiting the number of records to query
- Filters out policy and audit keys
- Returns sorted history (newest first)

### 2. Backend API Endpoints (`cdms-backend/api.js`)

#### `GET /block-history`
- Returns all block/transaction history
- Query params:
  - `limit` (optional): Maximum number of records to return (default: 100)
  - `userId` (required): User identifier for authentication
  - `org` (required): Organization (A or B)

#### `GET /record/:id/history`
- Returns transaction history for a specific record
- Path params:
  - `id`: Record ID
- Query params:
  - `userId` (required): User identifier for authentication
  - `org` (required): Organization (A or B)

### 3. Frontend Components

#### BlockHistoryPage (`cdms-frontend/src/pages/BlockHistoryPage.jsx`)
- **Features**:
  - Display all blockchain transactions
  - Real-time statistics (Total, Created, Deleted)
  - Search functionality (by Transaction ID, Record ID, Case ID)
  - Filter by transaction type (All, Created, Deleted)
  - Adjustable limit (50, 100, 200, 500)
  - Refresh functionality
  - Responsive table layout

- **UI Components**:
  - Stats cards showing transaction metrics
  - Search bar with icon
  - Filter dropdown
  - Limit selector
  - Transaction table with:
    - Transaction ID (truncated)
    - Record ID
    - Case ID
    - Record Type
    - Organization
    - Status (Created/Deleted badge)
    - Timestamp

#### Service (`cdms-frontend/src/services/blockHistoryService.js`)
- `getAllBlockHistory(userId, org, limit)` - Fetch all block history
- `getRecordHistory(userId, org, recordId)` - Fetch specific record history

### 4. Route Configuration (`cdms-frontend/src/routes/routeConfig.js`)

Added route:
- **Path**: `/block-history`
- **Component**: `BlockHistoryPage`
- **Icon**: `Blocks` (lucide-react)
- **Roles**: `["admin", "forensics_officer", "investigator"]`
- **Sidebar**: Visible

## Authentication

The feature uses the existing `authenticateUser` middleware which expects:
- `userId`: User email or wallet ID
- `org`: Organization (A or B)

These are passed as query parameters for GET requests.

## Data Structure

### History Item Response:
```json
{
  "txId": "transaction_id",
  "recordId": "record_id",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "isDelete": false,
  "value": {
    "record_id": "record_id",
    "case_id": "case_id",
    "record_type": "Evidence",
    "uploader_org": "A"
  }
}
```

## Usage

### Accessing Block History

1. **Via Sidebar**: Click "Block History" in the navigation sidebar
2. **Direct URL**: Navigate to `/block-history`

### Features

- **Search**: Filter transactions by Transaction ID, Record ID, or Case ID
- **Filter**: Show all, created only, or deleted only transactions
- **Limit**: Control how many records to load (50-500)
- **Refresh**: Manually reload block history
- **Statistics**: View overview metrics at the top

## Testing

### Test the Feature:

1. **Start Backend**:
   ```powershell
   cd cdms-backend
   npm start
   ```

2. **Start Frontend**:
   ```powershell
   cd cdms-frontend
   npm run dev
   ```

3. **Access Block History**:
   - Login to the application
   - Click "Block History" in the sidebar
   - View all blockchain transactions

### Expected Behavior:

- Page loads with all transactions from the blockchain
- Statistics show correct counts
- Search filters transactions
- Filter dropdown works correctly
- Limit selector changes number of records
- Refresh button reloads data

## Redeploy Chaincode (Required)

After adding new chaincode methods, you need to redeploy:

```powershell
# Option 1: PowerShell
.\deploy-chaincode.ps1

# Option 2: WSL
bash deploy-chaincode.sh
```

**Note**: The chaincode version needs to be incremented for redeployment. Update the version in `deploy-chaincode.sh` if needed.

## Files Modified/Created

### Created:
1. `cdms-frontend/src/pages/BlockHistoryPage.jsx`
2. `cdms-frontend/src/services/blockHistoryService.js`

### Modified:
1. `chaincode/index.js` - Added `GetRecordHistory` and `GetAllHistory` methods
2. `cdms-backend/api.js` - Added `/block-history` and `/record/:id/history` endpoints
3. `cdms-frontend/src/routes/routeConfig.js` - Added block history route

## Next Steps

1. **Redeploy Chaincode** with new methods
2. **Test the feature** after redeployment
3. **Verify** that transactions are displayed correctly
4. **Test search and filter** functionality

## Status

✅ **Implementation Complete**
- Chaincode methods added
- Backend API endpoints created
- Frontend page and service implemented
- Route added to navigation

⚠️ **Action Required**
- Redeploy chaincode to make new methods available
- Test the feature after deployment

