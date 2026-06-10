/**
 * Gmail Integration Module
 *
 * Provides OAuth connection, sending, thread tracking, and push notifications
 * for Gmail integration.
 *
 * Usage:
 *   import { sendViaGmail, hasGmailConnection, startWatch, syncNewEmails } from "@/app/_lib/gmail";
 */

// OAuth helpers
export { GOOGLE_SCOPES, GMAIL_SCOPES, getAuthUrl, exchangeCodeForTokens, refreshAccessToken, getAuthenticatedEmail, isGoogleOAuthConfigured } from "./oauth";

// Client management
export {
  getGmailConnection,
  createGmailClient,
  createWorkspaceGmailClient,
  hasGmailConnection,
  hasWorkspaceGmailConnection,
  getConnectedGmailEmail,
} from "./client";

// Sending
export { sendViaGmail, canSendViaGmail } from "./send";
export type { SendGmailOptions, SendGmailResult, EmailAttachment } from "./send";

// Watch management (push notifications)
export { startWatch, stopWatch, renewWatch, getActiveWatch, getExpiringWatches } from "./watch";
export type { WatchResult, GmailWatch } from "./watch";

// Sync (fetching incoming emails)
export { syncNewEmails, manualSync } from "./sync";

// Crypto (for internal use)
export { encryptToken, decryptToken, generateEncryptionKey } from "./crypto";
