/**
 * Token encryption for calendar connections
 * Uses AES-256-GCM for secure server-side encryption/decryption
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be a 32-byte (256-bit) key in hex format
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY environment variable not set");
  }

  // If key is hex, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, "hex");
  }

  // Otherwise derive a key from the string
  return crypto.scryptSync(key, "salt", 32);
}

/**
 * Encrypt a token for secure storage
 * Returns: base64-encoded string containing IV + authTag + ciphertext
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  // Combine: IV + authTag + ciphertext (all base64)
  const combined = Buffer.concat([
    iv,
    authTag,
    Buffer.from(ciphertext, "base64"),
  ]).toString("base64");

  return combined;
}

/**
 * Decrypt a token from storage
 */
export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, "base64");

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encryptedData = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a secure random encryption key for setup
 * Run this once and store the result in your env vars
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
