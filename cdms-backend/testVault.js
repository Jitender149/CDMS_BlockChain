const fs = require('fs');
const CDMSBackend = require('./backend');

(async () => {
  const backend = new CDMSBackend({
    vaultAddr: 'http://127.0.0.1:8200',
    vaultToken: 'root'
  });

  const recordId = 'test123';
  const { dek, wrappedKey } = await backend.generateRecordKey(recordId);

  console.log('Wrapped key:', wrappedKey);

  const fileBuffer = Buffer.from('hello vault encryption!');
  const { encryptedData, iv, authTag } = backend.encryptFile(fileBuffer, dek);
  
  const decrypted = backend.decryptFile(encryptedData, dek, iv, authTag);
  console.log('Decrypted text:', decrypted.toString());
})();
