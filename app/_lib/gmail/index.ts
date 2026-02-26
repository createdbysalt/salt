/**
 * Gmail Integration Module
 *
 * Provides OAuth connection, sending, and thread tracking for Gmail integration.
 *
 * Usage:
 *   import { sendViaGmail, hasGmailConnection } from "@/app/_lib/gmail";
 */

// OAuth helpers
export { GOOGLE_SCOPES, GMAIL_SCOPES, getAuthUrl, exchangeCodeForTokens, refreshAccessToken, getAuthenticatedEmail, isGoogleOAuthConfigured } from "./oauth";

// Client management
export { getGmailConnection, createGmailClient, hasGmailConnection, getConnectedGmailEmail } from "./client";

// Sending
export { sendViaGmail, canSendViaGmail } from "./send";
export type { SendGmailOptions, SendGmailResult } from "./send";

// Crypto (for internal use)
export { encryptToken, decryptToken, generateEncryptionKey } from "./crypto";
