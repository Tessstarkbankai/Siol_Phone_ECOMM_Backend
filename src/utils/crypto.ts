import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_KEY ||
    process.env.CLERK_SECRET_KEY ||
    "marketplace-secure-encryption-key-2026-siol-marketplace";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypt sensitive text (such as bank account numbers) with AES-256-GCM.
 * Output format: iv:authTag:encryptedHex
 */
export function encryptText(plainText: string): string {
  if (!plainText) return "";
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt text encrypted with encryptText.
 */
export function decryptText(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    // If not in the format, return as is (in case of legacy/unencrypted data)
    return encryptedPayload;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Return a masked representation of an account number, e.g. "••••••••1234"
 */
export function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber) return "";
  const cleaned = accountNumber.trim();
  if (cleaned.length <= 4) return "••••" + cleaned;
  const lastFour = cleaned.slice(-4);
  const maskedSection = "•".repeat(Math.max(cleaned.length - 4, 4));
  return `${maskedSection}${lastFour}`;
}
