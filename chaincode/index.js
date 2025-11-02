'use strict';

const { Contract } = require('fabric-contract-api');

class CDMSContract extends Contract {

    constructor() {
        super('org.cdms.cdmscontract');
    }

    // Initialize the ledger
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
        return JSON.stringify({ message: 'Ledger initialized successfully' });
    }

    // -----------------------
    // CreateRecord
    // -----------------------
    /**
     * CreateRecord expects a JSON string containing:
     * record_id, case_id, record_type, uploader_org, offchain_uri, file_hash, wrapped_key_ref, policy_id
     */
    async CreateRecord(ctx, recordJSON) {
        console.info('============= START : Create Record ===========');
        
        const callerRole = this._getClientAttr(ctx, 'role');
        // Only district_police and admin can upload/create records
        if (!this._isAllowed(callerRole, ['district_police', 'admin'])) {
            throw new Error('CreateRecord: caller not authorized (must be district_police or admin)');
        }

        let record;
        if (typeof recordJSON === 'string') {
            try {
                record = JSON.parse(recordJSON);
            } catch (err) {
                throw new Error('CreateRecord: invalid JSON');
            }
        } else {
            record = recordJSON;
        }

        const recordId = record.record_id;
        if (!recordId) {
            throw new Error('CreateRecord: record_id is required');
        }
        if (!record.case_id) {
            throw new Error('CreateRecord: case_id is required');
        }

        // Check if record already exists
        const exists = await this.RecordExists(ctx, recordId);
        if (exists) {
            throw new Error(`Record ${recordId} already exists`);
        }

        // Enrich record with metadata
        record.uploader = this._getClientId(ctx);
        record.uploader_org = record.uploader_org || this._getClientAttr(ctx, 'organization') || ctx.clientIdentity.getMSPID();
        record.created_at = new Date().toISOString();
        record.updated_at = new Date().toISOString();
        record.status = record.status || 'active';

        // Store on ledger
        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));

        // Create initial audit entry
        const audit = {
            audit_id: `AUDIT_${recordId}_${Date.now()}`,
            record_id: recordId,
            action: 'CreateRecord',
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: `Record created by ${callerRole}`
        };
        await this._storeAudit(ctx, recordId, audit);

        // Emit event
        ctx.stub.setEvent('RecordCreated', Buffer.from(JSON.stringify({ 
            record_id: recordId, 
            case_id: record.case_id 
        })));

        console.info('============= END : Create Record ===========');
        return JSON.stringify(record);
    }

    // -----------------------
    // ReadRecord
    // -----------------------
    async ReadRecord(ctx, recordId) {
        if (!recordId) {
            throw new Error('ReadRecord: recordId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can view/access records
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('ReadRecord: caller not authorized');
        }

        const recordBytes = await ctx.stub.getState(recordId);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        const record = JSON.parse(recordBytes.toString());

        // Create audit entry for read operation
        const audit = {
            audit_id: `AUDIT_${recordId}_${Date.now()}`,
            record_id: recordId,
            action: 'ReadRecord',
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: `Record read by ${callerRole}`
        };
        await this._storeAudit(ctx, recordId, audit);

        return recordBytes.toString();
    }

    // -----------------------
    // UpdateRecord
    // -----------------------
    async UpdateRecord(ctx, recordId, newDataJSON) {
        if (!recordId) {
            throw new Error('UpdateRecord: recordId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // Only district_police and admin can update records
        if (!this._isAllowed(callerRole, ['district_police', 'admin'])) {
            throw new Error('UpdateRecord: caller not authorized (district_police/admin only)');
        }

        const exists = await this.RecordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        const recordBytes = await ctx.stub.getState(recordId);
        const record = JSON.parse(recordBytes.toString());

        let newData;
        if (typeof newDataJSON === 'string') {
            try {
                newData = JSON.parse(newDataJSON);
            } catch (err) {
                throw new Error('UpdateRecord: invalid JSON');
            }
        } else {
            newData = newDataJSON;
        }

        const updatedRecord = { ...record, ...newData };
        updatedRecord.updated_at = new Date().toISOString();
        updatedRecord.updated_by = this._getClientId(ctx);

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(updatedRecord)));

        // Create audit entry
        const audit = {
            audit_id: `AUDIT_${recordId}_${Date.now()}`,
            record_id: recordId,
            action: 'UpdateRecord',
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: `Record updated by ${callerRole}`
        };
        await this._storeAudit(ctx, recordId, audit);

        // Emit event
        ctx.stub.setEvent('RecordUpdated', Buffer.from(JSON.stringify({ 
            record_id: recordId 
        })));

        return JSON.stringify(updatedRecord);
    }

    // -----------------------
    // DeleteRecord
    // -----------------------
    async DeleteRecord(ctx, recordId) {
        if (!recordId) {
            throw new Error('DeleteRecord: recordId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        if (!this._isAllowed(callerRole, ['admin'])) {
            throw new Error('DeleteRecord: caller not authorized (admin only)');
        }

        const exists = await this.RecordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`Record ${recordId} does not exist`);
        }

        // Create audit entry before deletion
        const audit = {
            audit_id: `AUDIT_${recordId}_${Date.now()}`,
            record_id: recordId,
            action: 'DeleteRecord',
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: `Record deleted by ${callerRole}`
        };
        await this._storeAudit(ctx, recordId, audit);

        await ctx.stub.deleteState(recordId);

        // Emit event
        ctx.stub.setEvent('RecordDeleted', Buffer.from(JSON.stringify({ 
            record_id: recordId 
        })));

        return JSON.stringify({ message: `Record ${recordId} deleted successfully` });
    }

    // -----------------------
    // RecordExists
    // -----------------------
    async RecordExists(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        return recordBytes && recordBytes.length > 0;
    }

    // -----------------------
    // QueryRecordsByCase
    // -----------------------
    async QueryRecordsByCase(ctx, caseId) {
        if (!caseId) {
            throw new Error('QueryRecordsByCase: caseId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can query records
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('QueryRecordsByCase: caller not authorized');
        }

        const queryString = {
            selector: {
                case_id: caseId
            }
        };

        const results = await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));

        // Create audit entry
        const audit = {
            audit_id: `AUDIT_case_${caseId}_${Date.now()}`,
            record_id: `case:${caseId}`,
            action: 'QueryRecordsByCase',
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: `Queried records for case ${caseId}`
        };
        await this._storeAudit(ctx, `case-${caseId}`, audit);

        return results;
    }

    // -----------------------
    // ListAllRecords
    // -----------------------
    async ListAllRecords(ctx) {
        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can list records
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('ListAllRecords: caller not authorized');
        }

        const allResults = [];
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();

        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
                // Skip audit and policy entries
                if (!result.value.key.startsWith('AUDIT_') && !result.value.key.startsWith('POLICY_')) {
                    allResults.push(record);
                }
            } catch (err) {
                console.log(err);
            }
            result = await iterator.next();
        }

        await iterator.close();
        return JSON.stringify(allResults);
    }

    // -----------------------
    // CreatePolicy
    // -----------------------
    async CreatePolicy(ctx, policyId, policyDataJSON) {
        if (!policyId) {
            throw new Error('CreatePolicy: policyId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        if (!this._isAllowed(callerRole, ['admin'])) {
            throw new Error('CreatePolicy: caller not authorized (admin only)');
        }

        let policyData;
        if (typeof policyDataJSON === 'string') {
            try {
                policyData = JSON.parse(policyDataJSON);
            } catch (err) {
                throw new Error('CreatePolicy: invalid JSON');
            }
        } else {
            policyData = policyDataJSON;
        }

        const policy = {
            policy_id: policyId,
            ...policyData,
            created_at: new Date().toISOString(),
            created_by: this._getClientId(ctx)
        };

        const policyKey = `POLICY_${policyId}`;
        const existing = await ctx.stub.getState(policyKey);
        if (existing && existing.length > 0) {
            throw new Error(`Policy ${policyId} already exists`);
        }

        await ctx.stub.putState(policyKey, Buffer.from(JSON.stringify(policy)));

        // Emit event
        ctx.stub.setEvent('PolicyCreated', Buffer.from(JSON.stringify({ 
            policy_id: policyId 
        })));

        return policyId;
    }

    // -----------------------
    // GetPolicy
    // -----------------------
    async GetPolicy(ctx, policyId) {
        if (!policyId) {
            throw new Error('GetPolicy: policyId is required');
        }

        const policyKey = `POLICY_${policyId}`;
        const policyBytes = await ctx.stub.getState(policyKey);
        if (!policyBytes || policyBytes.length === 0) {
            throw new Error(`Policy ${policyId} does not exist`);
        }
        return policyBytes.toString();
    }

    // -----------------------
    // AddAudit
    // -----------------------
    async AddAudit(ctx, recordId, action, details) {
        if (!recordId || !action) {
            throw new Error('AddAudit: recordId and action are required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can add audit entries (to track their actions)
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('AddAudit: caller not authorized');
        }

        // Check if record exists
        const exists = await this.RecordExists(ctx, recordId);
        if (!exists) {
            throw new Error(`AddAudit: record ${recordId} does not exist`);
        }

        const audit = {
            audit_id: `AUDIT_${recordId}_${Date.now()}`,
            record_id: recordId,
            action: action,
            actor: this._getClientId(ctx),
            role: callerRole,
            timestamp: new Date().toISOString(),
            details: details || ''
        };

        await this._storeAudit(ctx, recordId, audit);

        // Emit event
        ctx.stub.setEvent('AuditAdded', Buffer.from(JSON.stringify({ 
            record_id: recordId, 
            action: action 
        })));

        return audit.audit_id;
    }

    // -----------------------
    // GetAuditTrail
    // -----------------------
    async GetAuditTrail(ctx, recordId) {
        if (!recordId) {
            throw new Error('GetAuditTrail: recordId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can view audit trail
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('GetAuditTrail: caller not authorized');
        }

        const queryString = {
            selector: {
                record_id: recordId
            }
        };

        return await this.GetQueryResultForQueryString(ctx, JSON.stringify(queryString));
    }

    // -----------------------
    // GetRecordHistory
    // -----------------------
    /**
     * Get blockchain history for a specific record (all transactions)
     */
    async GetRecordHistory(ctx, recordId) {
        if (!recordId) {
            throw new Error('GetRecordHistory: recordId is required');
        }

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can view record history
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('GetRecordHistory: caller not authorized');
        }

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

            // Convert to milliseconds
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

    // -----------------------
    // GetAllHistory
    // -----------------------
    /**
     * Get all blockchain transaction history (across all records)
     * Returns history for all records in the ledger
     */
    async GetAllHistory(ctx, limitParam) {
        console.log('============= START : Get All History ===========');

        const callerRole = this._getClientAttr(ctx, 'role');
        // All roles can view all history
        if (!this._isAllowed(callerRole, ['district_police', 'investigator', 'forensics_officer', 'admin'])) {
            throw new Error('GetAllHistory: caller not authorized');
        }

        try {
            const limit = limitParam ? parseInt(limitParam) : 100;
            const allRecords = [];

            // Use getStateByRange with proper bounds
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

    // -----------------------
    // Helper: GetQueryResultForQueryString
    // -----------------------
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

    // -----------------------
    // Helper: Get Client ID
    // -----------------------
    _getClientId(ctx) {
        try {
            return ctx.clientIdentity.getID();
        } catch (err) {
            return 'unknown';
        }
    }

    // -----------------------
    // Helper: Get Client Attribute
    // -----------------------
    _getClientAttr(ctx, attr) {
        try {
            const v = ctx.clientIdentity.getAttributeValue(attr);
            return v || null;
        } catch (err) {
            return null;
        }
    }

    // -----------------------
    // Helper: Check Authorization
    // -----------------------
    _isAllowed(roleValue, allowedArray) {
        if (!roleValue) return false;
        return allowedArray.includes(roleValue);
    }

    // -----------------------
    // Helper: Store Audit
    // -----------------------
    async _storeAudit(ctx, recordId, auditObj) {
        const auditId = auditObj.audit_id || `AUDIT_${recordId}_${Date.now()}`;
        await ctx.stub.putState(auditId, Buffer.from(JSON.stringify(auditObj)));
    }
}

module.exports = CDMSContract;
