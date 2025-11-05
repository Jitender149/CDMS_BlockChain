# Purpose of Vault/KMS in CDMS System

## Overview

**HashiCorp Vault** (or **KMS - Key Management Service**) is used in your CDMS system for **secure encryption key management**. It provides a centralized, secure way to manage encryption keys without storing them in your application code or database.

---

## 🎯 Primary Purpose

### **1. Master Key Management (KEK - Key Encryption Key)**

Vault stores the **Master Key Encryption Key (KEK)** that is used to encrypt/decrypt all Data Encryption Keys (DEKs).

**Why this matters:**
- The master KEK is **never exposed** to your application
- Keys are stored securely in Vault (encrypted at rest)
- Only authorized applications with valid tokens can access keys

### **2. Data Encryption Key (DEK) Wrapping**

For each record/file uploaded:
1. System generates a **unique DEK** (256-bit AES key) per record
2. DEK is **wrapped** (encrypted) using Vault's master KEK
3. **Wrapped key** is stored in blockchain/metadata (safe to store)
4. **Plaintext DEK** is used immediately for encryption, then discarded

**Flow:**
```
Record Upload
    ↓
Generate DEK (random 256-bit key)
    ↓
Wrap DEK with Vault's Master KEK → Wrapped Key (stored)
    ↓
Use DEK to encrypt file → Encrypted File (stored)
    ↓
Discard plaintext DEK (never stored)
```

### **3. Key Unwrapping (Decryption)**

When a file needs to be decrypted:
1. System retrieves the **wrapped key** from blockchain/metadata
2. Sends wrapped key to Vault
3. Vault **unwraps** (decrypts) it using the master KEK
4. Returns plaintext DEK (used temporarily, then discarded)
5. File is decrypted using the DEK

---

## 🔐 Security Benefits

### **1. Separation of Concerns**
- **Vault**: Stores and manages master keys (secure, centralized)
- **Application**: Uses keys but never stores them permanently
- **Blockchain**: Stores encrypted data and wrapped keys (safe to store)

### **2. Key Rotation**
- Master KEK can be rotated periodically for enhanced security
- Old wrapped keys can be **rewrapped** with the new master key
- No need to re-encrypt all files when master key rotates

### **3. Access Control**
- Only applications with valid Vault tokens can access keys
- Tokens can be revoked if compromised
- Audit logging of all key access operations

### **4. Compliance**
- Meets security standards (encryption at rest, key management)
- Centralized key management for compliance audits
- Separation of encryption keys from data

---

## 🏗️ Architecture in CDMS

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│   Backend API   │
│   (Express)     │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────────┐
│ Vault   │ │  Blockchain  │
│  (KMS)  │ │  (Fabric)    │
└─────────┘ └──────────────┘
    │              │
    │              │
    ▼              ▼
┌─────────────────────────┐
│  Encrypted Files        │
│  (MinIO/Local Storage)  │
└─────────────────────────┘
```

---

## 📋 How It Works in Your Code

### **1. Initialization** (`backend.js`)

```javascript
// Vault configuration
this.vaultAddr = 'http://127.0.0.1:8200';
this.vaultToken = process.env.VAULT_TOKEN;
this.vaultMountPath = 'cdms-kms';

// Initialize Vault transit engine
await backend.initVaultTransit();
```

**What this does:**
- Enables Vault's **transit secrets engine** at path `cdms-kms`
- Creates a **master KEK** named `master-kek` (AES-256-GCM)
- Sets auto-rotation policy (90 days)

### **2. Key Generation** (`generateRecordKey`)

```javascript
async generateRecordKey(recordId) {
    // 1. Generate random 256-bit DEK
    const dek = crypto.randomBytes(32);
    
    // 2. Wrap DEK with Vault's master KEK
    const response = await axios.post(
        `${vaultAddr}/v1/cdms-kms/encrypt/master-kek`,
        { plaintext: dek.toString('base64') }
    );
    
    return {
        dek: dek,                    // Plaintext (use immediately)
        wrappedKey: response.data.data.ciphertext,  // Store this
        keyId: `vault:cdms-kms/master-kek:${recordId}`
    };
}
```

### **3. Key Unwrapping** (`unwrapRecordKey`)

```javascript
async unwrapRecordKey(wrappedKey, recordId) {
    // Send wrapped key to Vault
    const response = await axios.post(
        `${vaultAddr}/v1/cdms-kms/decrypt/master-kek`,
        { ciphertext: wrappedKey }
    );
    
    // Vault returns plaintext DEK
    const plaintextDek = Buffer.from(
        response.data.data.plaintext, 
        'base64'
    );
    
    return plaintextDek;  // Use to decrypt file
}
```

---

## 🔄 Key Lifecycle

### **Upload (Encryption)**
1. User uploads file
2. System generates unique DEK for this record
3. DEK is wrapped with Vault's master KEK
4. File is encrypted with DEK
5. Encrypted file + wrapped key stored
6. Plaintext DEK discarded

### **Download (Decryption)**
1. User requests file
2. System retrieves encrypted file + wrapped key
3. Wrapped key sent to Vault for unwrapping
4. Vault returns plaintext DEK
5. File decrypted with DEK
6. Plaintext DEK discarded after use

### **Key Rotation**
1. Admin rotates master KEK in Vault
2. System re-wraps all existing wrapped keys
3. No need to re-encrypt files (only re-wrap keys)

---

## 🚀 Why Use Vault Instead of Direct Storage?

### **❌ Without Vault (Direct Storage)**
```javascript
// BAD: Storing keys in database/code
const masterKey = "my-secret-key-12345";  // ❌ Insecure!
const dek = encrypt(masterKey, fileData);
// Keys exposed in code/database
```

**Problems:**
- Keys stored in code/config files (version control risk)
- Keys stored in database (compromise = all data lost)
- No key rotation capability
- No access control
- Compliance issues

### **✅ With Vault (Secure Key Management)**
```javascript
// GOOD: Keys managed by Vault
const wrappedKey = await vault.encrypt(masterKEK, dek);
// Master key never exposed to application
// Wrapped keys safe to store anywhere
```

**Benefits:**
- Master keys never exposed to application
- Keys stored securely in Vault (encrypted at rest)
- Key rotation without re-encryption
- Access control via tokens
- Compliance-friendly

---

## 📊 Summary

| Feature | Without Vault | With Vault |
|---------|--------------|------------|
| **Key Storage** | Code/Database | Secure Vault |
| **Key Exposure** | High risk | Minimal risk |
| **Key Rotation** | Manual, complex | Automated, easy |
| **Access Control** | Limited | Token-based |
| **Compliance** | Difficult | Easier |
| **Security** | Lower | Higher |

---

## 🎯 Key Takeaways

1. **Vault stores the Master KEK** - Never exposed to your application
2. **DEKs are unique per record** - Each file has its own encryption key
3. **Wrapped keys are safe to store** - Can be stored in blockchain/metadata
4. **Plaintext DEKs are temporary** - Used only during encryption/decryption
5. **Key rotation is supported** - Master key can be rotated without re-encrypting files

---

## 🔗 Related Files

- `cdms-backend/backend.js` - Vault integration code
- `cdms-backend/api.js` - Uses Vault for encryption/decryption
- `vault_readme.txt` - Vault setup instructions
- `cdms-backend/testVault.js` - Vault testing script

---

## 💡 In Simple Terms

**Vault is like a bank vault for encryption keys:**
- Your application can **deposit** (wrap) and **withdraw** (unwrap) keys
- But the **master key to the vault** is never given to your application
- Even if someone hacks your application, they can't get the master keys
- Only Vault (with proper authentication) can access the master keys

This provides **defense in depth** - even if one layer is compromised, the encryption keys remain secure.

