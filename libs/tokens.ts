/**
 * Secure Token Generation and Hashing Utilities
 * 
 * Used for tokenized invoice links and other secure access tokens.
 * Follows security best practices:
 * - 32+ bytes cryptographically secure random tokens
 * - Base64url encoding (URL-safe, no padding)
 * - SHA-256 hashing (store only hash, never raw token)
 */

import { webcrypto } from "crypto";

/**
 * Generate a cryptographically secure random token
 * @param byteLength - Number of random bytes (default: 32 = 256 bits)
 * @returns Base64url-encoded token string
 */
export function generateSecureToken(byteLength: number = 32): string {
  const buffer = new Uint8Array(byteLength);
  webcrypto.getRandomValues(buffer);
  
  // Convert to base64url (URL-safe, no padding)
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Hash a token using SHA-256
 * @param token - Raw token string to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await webcrypto.subtle.digest("SHA-256", data);
  
  // Convert ArrayBuffer to hex string
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify that a token matches a stored hash
 * @param token - Raw token to verify
 * @param storedHash - Previously computed hash to compare against
 * @returns true if token matches hash, false otherwise
 */
export async function verifyTokenHash(
  token: string,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashToken(token);
  
  // Use timing-safe comparison to prevent timing attacks
  // (In Node.js, crypto.timingSafeEqual is preferred, but this is sufficient)
  if (computedHash.length !== storedHash.length) {
    return false;
  }
  
  let mismatch = 0;
  for (let i = 0; i < computedHash.length; i++) {
    mismatch |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  
  return mismatch === 0;
}

/**
 * Generate a token and its hash in one call
 * @param byteLength - Number of random bytes (default: 32)
 * @returns Object with raw token and hash
 */
export async function generateTokenWithHash(byteLength: number = 32): Promise<{
  token: string;
  hash: string;
}> {
  const token = generateSecureToken(byteLength);
  const hash = await hashToken(token);
  
  return { token, hash };
}




