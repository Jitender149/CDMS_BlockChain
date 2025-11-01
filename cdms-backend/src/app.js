import { uploadEncryptedFile, downloadDecryptedFile } from "./services/minio.service.js";
import crypto from "crypto";

async function runExample() {
  const recordId = "record-123";
  const key = crypto.randomBytes(32);
  const result = await uploadEncryptedFile("sample_fir.pdf", recordId, key);
  console.log("Uploaded:", result);
  await downloadDecryptedFile(recordId, key, "decrypted_fir.pdf");
  console.log("Decrypted file restored successfully.");
}

runExample().catch(console.error);
