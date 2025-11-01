import { Client } from "minio";
import fs from "fs";
import crypto from "crypto";
import { encryptFile, decryptFile } from "../utils/encryption.js";

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "admin",
  secretKey: process.env.MINIO_SECRET_KEY || "admin123"
});

const BUCKET = "criminal-records";

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) await minioClient.makeBucket(BUCKET);
}

export async function uploadEncryptedFile(filePath, recordId, key) {
  await ensureBucket();
  const fileBuffer = fs.readFileSync(filePath);
  const encrypted = encryptFile(fileBuffer, key);
  const fileName = `${recordId}.enc`;
  const tempPath = `/tmp/${fileName}`;
  fs.writeFileSync(tempPath, JSON.stringify(encrypted));
  await minioClient.fPutObject(BUCKET, fileName, tempPath);
  fs.unlinkSync(tempPath);
  const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  return {
    offchain_uri: `minio://${BUCKET}/${fileName}`,
    file_hash: `sha256:${fileHash}`
  };
}

export async function downloadDecryptedFile(recordId, key, outputPath) {
  const fileName = `${recordId}.enc`;
  const tempPath = `/tmp/${fileName}`;
  await minioClient.fGetObject(BUCKET, fileName, tempPath);
  const encryptedObj = JSON.parse(fs.readFileSync(tempPath, "utf8"));
  const decryptedBuffer = decryptFile(encryptedObj, key);
  fs.writeFileSync(outputPath, decryptedBuffer);
  fs.unlinkSync(tempPath);
  return outputPath;
}
