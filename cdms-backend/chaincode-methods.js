// chaincode-methods.js
// This file documents all the required chaincode methods for the CDMS system

/**
 * REQUIRED CHAINCODE METHODS FOR CDMS
 * 
 * This file documents all the blockchain smart contract methods that need to be implemented
 * in the Hyperledger Fabric chaincode for the CDMS system to function properly.
 */

const REQUIRED_CHAINCODE_METHODS = {
    // ============================================
    // RECORD MANAGEMENT METHODS
    // ============================================
    
    /**
     * CreateRecord(recordData)
     * Creates a new criminal record on the blockchain
     * @param {string} recordData - JSON string containing record metadata
     * @returns {string} - Transaction ID
     */
    CreateRecord: {
        description: "Creates a new criminal record with encrypted metadata",
        parameters: ["recordData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * ReadRecord(recordId)
     * Retrieves a record by its ID
     * @param {string} recordId - Unique record identifier
     * @returns {string} - JSON string of record data
     */
    ReadRecord: {
        description: "Retrieves record metadata by ID",
        parameters: ["recordId"],
        returns: "Record data (JSON string)",
        required: true
    },

    /**
     * UpdateRecord(recordId, recordData)
     * Updates an existing record
     * @param {string} recordId - Record identifier
     * @param {string} recordData - Updated record data
     * @returns {string} - Transaction ID
     */
    UpdateRecord: {
        description: "Updates existing record metadata",
        parameters: ["recordId", "recordData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * DeleteRecord(recordId)
     * Marks a record as deleted (soft delete)
     * @param {string} recordId - Record identifier
     * @returns {string} - Transaction ID
     */
    DeleteRecord: {
        description: "Soft deletes a record",
        parameters: ["recordId"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * QueryRecordsByCase(caseId)
     * Retrieves all records for a specific case
     * @param {string} caseId - Case identifier
     * @returns {string} - JSON array of records
     */
    QueryRecordsByCase: {
        description: "Lists all records for a specific case",
        parameters: ["caseId"],
        returns: "Array of records (JSON string)",
        required: true
    },

    /**
     * ListAllRecords()
     * Retrieves all records (admin function)
     * @returns {string} - JSON array of all records
     */
    ListAllRecords: {
        description: "Lists all records in the system",
        parameters: [],
        returns: "Array of all records (JSON string)",
        required: true
    },

    // ============================================
    // POLICY MANAGEMENT METHODS
    // ============================================

    /**
     * CreatePolicy(policyId, policyData)
     * Creates a new access policy
     * @param {string} policyId - Policy identifier
     * @param {string} policyData - JSON string of policy data
     * @returns {string} - Transaction ID
     */
    CreatePolicy: {
        description: "Creates a new access control policy",
        parameters: ["policyId", "policyData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * GetPolicy(policyId)
     * Retrieves a policy by ID
     * @param {string} policyId - Policy identifier
     * @returns {string} - JSON string of policy data
     */
    GetPolicy: {
        description: "Retrieves policy by ID",
        parameters: ["policyId"],
        returns: "Policy data (JSON string)",
        required: true
    },

    /**
     * UpdatePolicy(policyId, policyData)
     * Updates an existing policy
     * @param {string} policyId - Policy identifier
     * @param {string} policyData - Updated policy data
     * @returns {string} - Transaction ID
     */
    UpdatePolicy: {
        description: "Updates existing policy",
        parameters: ["policyId", "policyData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * DeletePolicy(policyId)
     * Deletes a policy
     * @param {string} policyId - Policy identifier
     * @returns {string} - Transaction ID
     */
    DeletePolicy: {
        description: "Deletes a policy",
        parameters: ["policyId"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * ListAllPolicies()
     * Lists all policies
     * @returns {string} - JSON array of policies
     */
    ListAllPolicies: {
        description: "Lists all access policies",
        parameters: [],
        returns: "Array of policies (JSON string)",
        required: true
    },

    // ============================================
    // ACCESS CONTROL METHODS
    // ============================================

    /**
     * GrantAccess(accessData)
     * Grants access to a record
     * @param {string} accessData - JSON string of access data
     * @returns {string} - Transaction ID
     */
    GrantAccess: {
        description: "Grants access to a record for a user/organization",
        parameters: ["accessData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * RevokeAccess(revokeData)
     * Revokes access to a record
     * @param {string} revokeData - JSON string of revocation data
     * @returns {string} - Transaction ID
     */
    RevokeAccess: {
        description: "Revokes access to a record",
        parameters: ["revokeData (JSON string)"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * CheckAccess(recordId, userId, org)
     * Checks if user has access to a record
     * @param {string} recordId - Record identifier
     * @param {string} userId - User identifier
     * @param {string} org - Organization identifier
     * @returns {string} - JSON string of access information
     */
    CheckAccess: {
        description: "Checks if user has access to a record",
        parameters: ["recordId", "userId", "org"],
        returns: "Access information (JSON string)",
        required: true
    },

    /**
     * ListAccessByRecord(recordId)
     * Lists all access permissions for a record
     * @param {string} recordId - Record identifier
     * @returns {string} - JSON array of access permissions
     */
    ListAccessByRecord: {
        description: "Lists all access permissions for a specific record",
        parameters: ["recordId"],
        returns: "Array of access permissions (JSON string)",
        required: true
    },

    /**
     * ListAccessByUser(userId)
     * Lists all access permissions for a user
     * @param {string} userId - User identifier
     * @returns {string} - JSON array of access permissions
     */
    ListAccessByUser: {
        description: "Lists all access permissions for a specific user",
        parameters: ["userId"],
        returns: "Array of access permissions (JSON string)",
        required: true
    },

    /**
     * ListAllAccess()
     * Lists all access permissions
     * @returns {string} - JSON array of all access permissions
     */
    ListAllAccess: {
        description: "Lists all access permissions in the system",
        parameters: [],
        returns: "Array of all access permissions (JSON string)",
        required: true
    },

    // ============================================
    // AUDIT TRAIL METHODS
    // ============================================

    /**
     * AddAudit(recordId, action, details)
     * Adds an audit entry
     * @param {string} recordId - Record identifier
     * @param {string} action - Action performed
     * @param {string} details - Additional details
     * @returns {string} - Transaction ID
     */
    AddAudit: {
        description: "Adds an audit trail entry",
        parameters: ["recordId", "action", "details"],
        returns: "Transaction ID",
        required: true
    },

    /**
     * GetAuditTrail(recordId)
     * Retrieves audit trail for a record
     * @param {string} recordId - Record identifier
     * @returns {string} - JSON array of audit entries
     */
    GetAuditTrail: {
        description: "Retrieves audit trail for a specific record",
        parameters: ["recordId"],
        returns: "Array of audit entries (JSON string)",
        required: true
    },

    /**
     * ListAllAudits()
     * Lists all audit entries
     * @returns {string} - JSON array of all audit entries
     */
    ListAllAudits: {
        description: "Lists all audit entries in the system",
        parameters: [],
        returns: "Array of all audit entries (JSON string)",
        required: true
    },

    // ============================================
    // UTILITY METHODS
    // ============================================

    /**
     * GetRecordHistory(recordId)
     * Gets the history of a record
     * @param {string} recordId - Record identifier
     * @returns {string} - JSON array of history entries
     */
    GetRecordHistory: {
        description: "Gets the complete history of a record",
        parameters: ["recordId"],
        returns: "Array of history entries (JSON string)",
        required: false
    },

    /**
     * ValidateAccess(recordId, userId, org, action)
     * Validates if user can perform action on record
     * @param {string} recordId - Record identifier
     * @param {string} userId - User identifier
     * @param {string} org - Organization identifier
     * @param {string} action - Action to validate
     * @returns {string} - JSON string with validation result
     */
    ValidateAccess: {
        description: "Validates if user can perform specific action on record",
        parameters: ["recordId", "userId", "org", "action"],
        returns: "Validation result (JSON string)",
        required: false
    }
};

/**
 * CHAINCODE IMPLEMENTATION CHECKLIST
 * 
 * To ensure the CDMS system works properly, the following chaincode methods
 * must be implemented in your Hyperledger Fabric smart contract:
 * 
 * REQUIRED METHODS (Must implement):
 * - CreateRecord
 * - ReadRecord
 * - UpdateRecord
 * - DeleteRecord
 * - QueryRecordsByCase
 * - ListAllRecords
 * - CreatePolicy
 * - GetPolicy
 * - UpdatePolicy
 * - DeletePolicy
 * - ListAllPolicies
 * - GrantAccess
 * - RevokeAccess
 * - CheckAccess
 * - ListAccessByRecord
 * - ListAccessByUser
 * - ListAllAccess
 * - AddAudit
 * - GetAuditTrail
 * - ListAllAudits
 * 
 * OPTIONAL METHODS (Recommended):
 * - GetRecordHistory
 * - ValidateAccess
 * 
 * DATA STRUCTURES:
 * 
 * Record Structure:
 * {
 *   record_id: string,
 *   case_id: string,
 *   record_type: string,
 *   uploader_org: string,
 *   offchain_uri: string,
 *   file_hash: string,
 *   wrapped_key_ref: string,
 *   policy_id: string,
 *   filename: string,
 *   file_size: number,
 *   mime_type: string,
 *   created_at: string,
 *   updated_at: string,
 *   status: string
 * }
 * 
 * Policy Structure:
 * {
 *   policy_id: string,
 *   rules: array,
 *   categories: array,
 *   description: string,
 *   created_at: string,
 *   updated_at: string,
 *   created_by: string
 * }
 * 
 * Access Structure:
 * {
 *   access_id: string,
 *   record_id: string,
 *   target_user_id: string,
 *   target_org: string,
 *   access_type: string,
 *   granted_by: string,
 *   granted_org: string,
 *   granted_at: string,
 *   expiry_date: string,
 *   status: string
 * }
 * 
 * Audit Structure:
 * {
 *   audit_id: string,
 *   record_id: string,
 *   user_id: string,
 *   org: string,
 *   action: string,
 *   details: string,
 *   timestamp: string,
 *   ip_address: string
 * }
 */

module.exports = {
    REQUIRED_CHAINCODE_METHODS,
    
    // Helper function to check if all required methods are implemented
    checkChaincodeImplementation: (implementedMethods) => {
        const requiredMethods = Object.keys(REQUIRED_CHAINCODE_METHODS).filter(
            method => REQUIRED_CHAINCODE_METHODS[method].required
        );
        
        const missingMethods = requiredMethods.filter(
            method => !implementedMethods.includes(method)
        );
        
        return {
            allImplemented: missingMethods.length === 0,
            missingMethods,
            implementedCount: implementedMethods.length,
            totalRequired: requiredMethods.length
        };
    }
};
