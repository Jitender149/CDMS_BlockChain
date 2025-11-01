'use strict';

const { Contract } = require('fabric-contract-api');

class CDMSContract extends Contract {

    // Initialize the ledger
    async InitLedger(ctx) {
        console.log('============= START : Initialize Ledger ===========');
        console.log('============= END : Initialize Ledger ===========');
        return JSON.stringify({ message: 'Ledger initialized successfully' });
    }

    // Create a new record
    async CreateRecord(ctx, recordJSON) {
        console.log('============= START : Create Record ===========');
        
        const record = JSON.parse(recordJSON);
        const recordId = record.record_id;
        
        // Check if record already exists
        const exists = await this.RecordExists(ctx, recordId);
        if (exists) {
            throw new Error(`Record ${recordId} already exists`);
        }
        
        // Add timestamps
        record.created_at = new Date().toISOString();
        record.updated_at = new Date().toISOString();
        record.uploader = ctx.clientIdentity.getID();
        
        // Store on ledger
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        
        console.log('============= END : Create Record ===========');
        return JSON.stringify(record);
    }

    // Read a record
    async ReadRecord(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        return recordBytes.toString();
    }

    // Update a record
    async UpdateRecord(ctx, recordId, newDataJSON) {
        const exists = await this.RecordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        
        const recordBytes = await ctx.stub.getState(recordId);
        const record = JSON.parse(recordBytes.toString());
        
        const newData = JSON.parse(newDataJSON);
        const updatedRecord = { ...record, ...newData };
        updatedRecord.updated_at = new Date().toISOString();
        
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(updatedRecord)));
        return JSON.stringify(updatedRecord);
    }

    // Delete a record
    async DeleteRecord(ctx, recordId) {
        const exists = await this.RecordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        await ctx.stub.deleteState(recordId);
        return JSON.stringify({ message: `Record ${recordId} deleted successfully` });
    }

    // Check if record exists
    async RecordExists(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        return recordBytes && recordBytes.length > 0;
    }

    // Query records by case ID
    async QueryRecordsByCase(ctx, caseId) {
        const queryString = {
            selector: {
                case_id: caseId
            }
        };
        
        return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    // List all records
    async ListAllRecords(ctx) {
        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                allResults.push(record);
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }
        
        await iterator.close();
        return JSON.stringify(allResults);
    }

    // Create a policy
    async CreatePolicy(ctx, policyId, policyDataJSON) {
        const policyData = JSON.parse(policyDataJSON);
        const policy = {
            policy_id: policyId,
            ...policyData,
            created_at: new Date().toISOString(),
            creator: ctx.clientIdentity.getID()
        };
        
        await ctx.stub.putState(`POLICY_${policyId}`, Buffer.from(JSON.stringify(policy)));
        return policyId;
    }

    // Get a policy
    async GetPolicy(ctx, policyId) {
        const policyBytes = await ctx.stub.getState(`POLICY_${policyId}`);
        if (!policyBytes || policyBytes.length === 0) {
            throw new Error(`Policy ${policyId} does not exist`);
        }
        return policyBytes.toString();
    }

    // Add audit entry
    async AddAudit(ctx, recordId, action, details) {
        const auditId = `AUDIT_${recordId}_${Date.now()}`;
        const audit = {
            audit_id: auditId,
            record_id: recordId,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            user: ctx.clientIdentity.getID()
        };
        
        await ctx.stub.putState(auditId, Buffer.from(JSON.stringify(audit)));
        return auditId;
    }

    // Get audit trail
    async GetAuditTrail(ctx, recordId) {
        const queryString = {
            selector: {
                record_id: recordId
            }
        };
        
        return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    // Get record history (block chain history for a specific record)
    async GetRecordHistory(ctx, recordId) {
        console.log(`Getting history for record: ${recordId}`);
        
        const historyIterator = await ctx.stub.getHistoryForKey(recordId);
        const results = [];
        
        let result = await historyIterator.next();
        while (!result.done) {
            const historyRecord = result.value;
            let record = null;
            
            // Parse the record if it exists
            if (historyRecord.value && historyRecord.value.length > 0) {
                try {
                    record = JSON.parse(historyRecord.value.toString());
                } catch (err) {
                    console.error(`Error parsing record: ${err}`);
                }
            }
            
            // Convert timestamp to ISO string
            // Fabric timestamps are protobuf Timestamp objects with seconds and nanos
            const timestamp = historyRecord.timestamp;
            let timestampSeconds = 0;
            let timestampNanos = 0;
            
            // Handle different timestamp formats
            if (timestamp) {
                if (typeof timestamp.seconds === 'number') {
                    timestampSeconds = timestamp.seconds;
                } else if (timestamp.seconds && typeof timestamp.seconds.low === 'number') {
                    timestampSeconds = timestamp.seconds.low;
                } else if (timestamp.getSeconds && typeof timestamp.getSeconds === 'function') {
                    timestampSeconds = timestamp.getSeconds();
                }
                
                timestampNanos = timestamp.nanos || timestamp.getNanos?.() || 0;
            }
            
            // Convert to milliseconds (seconds * 1000 + nanos / 1,000,000)
            const timestampMs = timestampSeconds * 1000 + Math.floor(timestampNanos / 1000000);
            const timestampISO = new Date(timestampMs).toISOString();
            
            results.push({
                txId: historyRecord.txId,
                timestamp: timestampISO,
                isDelete: historyRecord.isDelete || false,
                value: record
            });
            
            result = await historyIterator.next();
        }
        
        await historyIterator.close();
        return JSON.stringify(results);
    }

    // Get all block/transaction history (across all records)
    async GetAllHistory(ctx, limitParam) {
        console.log('============= START : Get All History ===========');
        
        try {
            const limit = limitParam ? parseInt(limitParam) : 100;
            const allRecords = [];
            
            // Use getStateByRange with proper bounds
            // In Fabric, empty strings might not work, so use null or proper range
            const startKey = '';
            const endKey = '\uffff'; // Unicode character that sorts after all other characters
            
            console.log(`Getting state by range from "${startKey}" to "${endKey}"`);
            const iterator = await ctx.stub.getStateByRange(startKey, endKey);
            let result = await iterator.next();
            let processedCount = 0;
            
            console.log(`Iterating through records (limit: ${limit})`);
            
            while (!result.done && processedCount < limit) {
                try {
                    if (!result.value || !result.value.key) {
                        result = await iterator.next();
                        continue;
                    }
                    
                    const recordKey = result.value.key;
                    console.log(`Processing record key: ${recordKey}`);
                    
                    // Skip policy and audit keys
                    if (recordKey.startsWith('POLICY_') || recordKey.startsWith('AUDIT_')) {
                        console.log(`Skipping ${recordKey}`);
                        result = await iterator.next();
                        continue;
                    }
                    
                    // Get history for this specific record
                    console.log(`Getting history for ${recordKey}`);
                    const historyIterator = await ctx.stub.getHistoryForKey(recordKey);
                    let historyResult = await historyIterator.next();
                    let historyCount = 0;
                    
                    while (!historyResult.done) {
                        try {
                            const historyRecord = historyResult.value;
                            
                            // Parse record value if it exists
                            let recordData = null;
                            if (historyRecord.value && historyRecord.value.length > 0) {
                                try {
                                    recordData = JSON.parse(historyRecord.value.toString());
                                } catch (parseErr) {
                                    console.error(`Error parsing record ${recordKey}: ${parseErr.message}`);
                                }
                            }
                            
                            // Convert timestamp
                            let timestampISO = new Date().toISOString();
                            try {
                                const timestamp = historyRecord.timestamp;
                                if (timestamp) {
                                    let seconds = 0;
                                    let nanos = 0;
                                    
                                    // Handle different timestamp formats
                                    if (typeof timestamp.seconds === 'number') {
                                        seconds = timestamp.seconds;
                                    } else if (timestamp.seconds && typeof timestamp.seconds.low === 'number') {
                                        seconds = timestamp.seconds.low;
                                    } else if (timestamp.seconds && typeof timestamp.seconds.toNumber === 'function') {
                                        seconds = timestamp.seconds.toNumber();
                                    } else if (timestamp.getSeconds && typeof timestamp.getSeconds === 'function') {
                                        seconds = timestamp.getSeconds();
                                    }
                                    
                                    nanos = timestamp.nanos || (timestamp.getNanos ? timestamp.getNanos() : 0);
                                    const timestampMs = seconds * 1000 + Math.floor(nanos / 1000000);
                                    timestampISO = new Date(timestampMs).toISOString();
                                }
                            } catch (tsErr) {
                                console.error(`Error converting timestamp: ${tsErr.message}`);
                            }
                            
                            // Build history entry
                            const historyEntry = {
                                txId: historyRecord.txId || 'unknown',
                                recordId: recordKey,
                                timestamp: timestampISO,
                                isDelete: historyRecord.isDelete || false
                            };
                            
                            // Add record data if available
                            if (recordData) {
                                historyEntry.value = {
                                    record_id: recordData.record_id || recordKey,
                                    case_id: recordData.case_id || null,
                                    record_type: recordData.record_type || null,
                                    uploader_org: recordData.uploader_org || null
                                };
                            } else {
                                historyEntry.value = null;
                            }
                            
                            allRecords.push(historyEntry);
                            historyCount++;
                            
                        } catch (entryErr) {
                            console.error(`Error processing history entry: ${entryErr.message}`);
                            console.error(entryErr.stack);
                        }
                        
                        historyResult = await historyIterator.next();
                    }
                    
                    await historyIterator.close();
                    console.log(`Added ${historyCount} history entries for ${recordKey}`);
                    processedCount++;
                    
                } catch (recordErr) {
                    console.error(`Error processing record: ${recordErr.message}`);
                    console.error(recordErr.stack);
                }
                
                result = await iterator.next();
            }
            
            await iterator.close();
            console.log(`Processed ${processedCount} records, collected ${allRecords.length} history entries`);
            
            // Sort by timestamp (newest first)
            allRecords.sort((a, b) => {
                try {
                    const dateA = new Date(a.timestamp);
                    const dateB = new Date(b.timestamp);
                    return dateB.getTime() - dateA.getTime();
                } catch {
                    return 0;
                }
            });
            
            console.log(`============= END : Get All History (${allRecords.length} entries) ===========`);
            return JSON.stringify(allRecords);
            
        } catch (err) {
            console.error('Error in GetAllHistory:', err);
            console.error(err.stack);
            throw new Error(`GetAllHistory failed: ${err.message}`);
        }
    }

    // Helper function for queries
    async GetQueryResultForQueryString(ctx, queryString) {
        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = [];
        
        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                results.push(record);
            } catch (err) {
                console.log(err);
            }
            result = await resultsIterator.next();
        }
        
        await resultsIterator.close();
        return JSON.stringify(results);
    }
}

module.exports = CDMSContract;

