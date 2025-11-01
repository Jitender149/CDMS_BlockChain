import crypto from "crypto";

const ALGO = "aes-256-gcm";

export function encryptFile(buffer, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    data: encrypted.toString("base64")
  };
}

export function decryptFile(encryptedObj, key) {
  const { iv, authTag, data } = encryptedObj;
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, "base64")),
    decipher.final()
  ]);
  return decrypted;
}
