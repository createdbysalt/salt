/**
 * Gmail Token Encryption/Decryption
 *
 * Uses AES-256-GCM for secure token storage.
 * Encryption key is derived from GMAIL_ENCRYPTION_KEY env var.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const envKey = process.env.GMAIL_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error("GMAIL_ENCRYPTION_KEY environment variable is not set");
  }
  return Buffer.from(envKey, "base64");
}

/**
 * Encrypt a token for database storage.
 * Returns base64-encoded string containing salt + iv + authTag + ciphertext.
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine: iv (16) + authTag (16) + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypt a token from database storage.
 */
export function decryptToken(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedBase64, "base64");

  // Extract: iv (16) + authTag (16) + encrypted
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Generate a new encryption key (for initial setup).
 * Run this once and save to GMAIL_ENCRYPTION_KEY env var.
 */
export function generateEncryptionKey(): string {
  const key = randomBytes(KEY_LENGTH);
  return key.toString("base64");
}
