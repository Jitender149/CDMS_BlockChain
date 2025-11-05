# Blockchain Integration Complete

## Overview

Integrated real blockchain block querying and monitoring functionality into the CDMS backend. The system now queries actual blocks from the Hyperledger Fabric blockchain instead of simulating them.

## New Files Created

### 1. `cdms-backend/ledger-info.js`
- **Purpose**: Query blockchain blocks and ledger information
- **Functions**:
  - `getAllBlocks(userId, org)` - Get all blocks from blockchain
  - `getBlock(blockNumber, userId, org)` - Get a specific block by number
  - `getBlockchainInfo(userId, org)` - Get blockchain height, latest block hash, etc.
  - `getOrdererTLSCertificate()` - Get orderer TLS certificate from Docker
  - `loadTLSCertificate(org, type)` - Load TLS certificates from peerOrganizations folder

### 2. `cdms-backend/block-monitor.js`
- **Purpose**: Real-time block monitoring (based on `testBlockCreation_new.js`)
- **Usage**: Run as standalone script to monitor blocks in real-time
- **Features**:
  - Listens for new blocks as they are committed
  - Shows block number, timestamp, transaction count
  - Displays transaction IDs and types
  - Graceful shutdown on Ctrl+C

## Updated Files

### 1. `cdms-backend/backend.js`
- **Added Methods**:
  - `getAllBlocks(userId, org)` - Wrapper for ledger-info.getAllBlocks
  - `getBlock(blockNumber, userId, org)` - Wrapper for ledger-info.getBlock
  - `getBlockchainInfo(userId, org)` - Wrapper for ledger-info.getBlockchainInfo

### 2. `cdms-backend/api.js`
- **New Endpoints**:
  - `GET /blocks` - Get all blocks from blockchain
  - `GET /blocks/:blockNumber` - Get a specific block by number
  - `GET /blockchain/info` - Get blockchain info (height, latest block hash)
  - `GET /certificates/orderer` - Get orderer TLS certificate
  - `GET /certificates/peer/:org` - Get peer TLS certificate for an org

- **Enhanced Endpoint**:
  - `GET /block-history` - Now supports `?real=true` to query real blockchain blocks

## How It Works

### Certificate Loading

The system dynamically loads TLS certificates from:
1. **Peer Certificates**: `fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt`
2. **Orderer Certificate**: Retrieved from Docker container using `docker exec orderer.example.com cat /var/hyperledger/orderer/tls/ca.crt`

### Block Querying

1. **Connection Profile**: Loaded from `connection-org1.json` or `connection-org2.json`
2. **Wallet**: Uses identities from `cdms-backend/wallet`
3. **Gateway**: Connects with discovery disabled for self-endorsement mode
4. **Channel Query**: Queries the `mychannel` channel directly
5. **Block Retrieval**: Gets blocks using `channel.queryBlock(blockNumber)`

## API Usage

### Get All Blocks
```bash
GET /api/blocks
Authorization: Bearer email:org
```

Response:
```json
{
  "success": true,
  "count": 10,
  "blocks": [
    {
      "blockNumber": 0,
      "dataHash": "...",
      "previousHash": "...",
      "blockTimestamp": "2025-11-02T...",
      "txCount": 1,
      "transactions": [...]
    }
  ],
  "source": "blockchain"
}
```

### Get Specific Block
```bash
GET /api/blocks/5
Authorization: Bearer email:org
```

### Get Blockchain Info
```bash
GET /api/blockchain/info
Authorization: Bearer email:org
```

Response:
```json
{
  "success": true,
  "info": {
    "height": 10,
    "currentBlockHash": "...",
    "previousBlockHash": "...",
    "ledgerHeight": 10
  },
  "source": "blockchain"
}
```

### Get Real Blocks in Block History
```bash
GET /api/block-history?real=true&limit=50
Authorization: Bearer email:org
```

This will return actual blocks from the blockchain instead of simulated ones.

## Block Monitoring

### Run Standalone Monitor
```bash
cd cdms-backend
node block-monitor.js [userId] [org]
```

Example:
```bash
node block-monitor.js AdminOrg1 Org1
```

### Programmatic Usage
```javascript
const BlockMonitor = require('./block-monitor');

const monitor = new BlockMonitor('AdminOrg1', 'Org1');

monitor.setOnBlockCallback((block) => {
  console.log('New block detected:', block);
});

await monitor.start();
// ... later
await monitor.stop();
```

## Certificate Endpoints

### Get Orderer Certificate
```bash
GET /api/certificates/orderer
```

Returns the orderer TLS certificate from Docker container.

### Get Peer Certificate
```bash
GET /api/certificates/peer/Org1
GET /api/certificates/peer/Org2
```

Returns the peer TLS certificate from the peerOrganizations folder.

## Integration with Existing Files

### Connection Profile
The system uses the existing connection profiles:
- `fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json`
- `fabric-samples/test-network/organizations/peerOrganizations/org2.example.com/connection-org2.json`

These are automatically created when the Fabric network is started.

### Wallet Identities
Uses existing wallet identities:
- `AdminOrg1` - For Org1 operations
- `AdminOrg2` - For Org2 operations
- User identities (e.g., `kudimainukehdijaguarlelo`)

## Testing

### 1. Test Block Querying
```bash
# Start backend
cd cdms-backend
npm start

# In another terminal, test endpoints
curl -H "Authorization: Bearer admin@example.com:Org1" http://localhost:3000/api/blockchain/info
curl -H "Authorization: Bearer admin@example.com:Org1" http://localhost:3000/api/blocks
```

### 2. Test Block Monitoring
```bash
cd cdms-backend
node block-monitor.js AdminOrg1 Org1
```

Upload a file from the frontend and watch the terminal for new block events.

### 3. Test Real Block History
```bash
# Query with real blocks
curl -H "Authorization: Bearer admin@example.com:Org1" "http://localhost:3000/api/block-history?real=true"

# Compare with simulated blocks
curl -H "Authorization: Bearer admin@example.com:Org1" "http://localhost:3000/api/block-history"
```

## Benefits

✅ **Real Blockchain Queries**: Queries actual blocks from Hyperledger Fabric  
✅ **Dynamic Certificate Loading**: Automatically loads certificates from peerOrganizations  
✅ **Orderer Certificate**: Retrieves orderer certificate from Docker container  
✅ **Real-time Monitoring**: Monitor blocks as they are committed  
✅ **Backward Compatible**: Simulated blocks still available as fallback  
✅ **Self-Endorsement Compatible**: Works with single-org endorsement policy  

## Notes

- The system uses `AdminOrg1` or `AdminOrg2` for blockchain queries (has Writers policy)
- Discovery is disabled for self-endorsement mode
- Real blocks are queried directly from the channel ledger
- Certificate paths are resolved dynamically based on organization
- Orderer certificate is retrieved from Docker container at runtime

## Troubleshooting

### Error: "Connection profile not found"
- Ensure Fabric network is running: `docker ps | Select-String peer0`
- Check that `fabric-samples/test-network/organizations/peerOrganizations` exists
- Network must be started with: `./network.sh up createChannel -ca`

### Error: "Identity not found in wallet"
- Ensure admin identity is enrolled: Run `node enrollAdminA_new.js` or `node setup-test-admin.js`
- Check wallet directory: `cdms-backend/wallet/`

### Error: "Failed to get orderer certificate"
- Ensure Docker is running: `docker ps`
- Check orderer container is running: `docker ps | Select-String orderer`

### No Blocks Returned
- Upload a file first to create transactions
- Check if blocks are being created: `docker logs orderer.example.com | Select-String "Created block"`
- Verify chaincode is deployed: `docker exec peer0.org1.example.com peer lifecycle chaincode querycommitted -C mychannel`

