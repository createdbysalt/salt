/**
 * Gmail OAuth Helpers
 *
 * Handles OAuth flow for connecting Gmail accounts.
 * Required scopes:
 * - gmail.send - Send emails
 * - gmail.readonly - Read for reply matching
 * - gmail.modify - Mark as read after processing
 */

import { google } from "googleapis";

// Google OAuth scopes (Gmail + Calendar)
export const GOOGLE_SCOPES = [
  // Gmail
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  // Calendar
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

// Legacy alias
export const GMAIL_SCOPES = GOOGLE_SCOPES;

/**
 * Create OAuth2 client for Gmail
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  // Use explicit redirect URI, or fall back to app URL
  const baseUrl = process.env.GOOGLE_REDIRECT_URI
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || "http://localhost:3000";

  // Ensure we have the full callback path
  const redirectUri = baseUrl.includes("/api/auth/google/callback")
    ? baseUrl
    : `${baseUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate OAuth authorization URL
 */
export function getAuthUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Required for refresh token
    scope: GOOGLE_SCOPES,
    prompt: "consent", // Force consent to get refresh token
    state,
  });

  // Log for debugging (redirect URI is embedded in the URL)
  console.log("[Google OAuth] Generated auth URL with redirect_uri:", new URL(authUrl).searchParams.get("redirect_uri"));

  return authUrl;
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get OAuth tokens - missing access or refresh token");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600 * 1000),
    scopes: tokens.scope?.split(" ") || GMAIL_SCOPES,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(Date.now() + 3600 * 1000),
  };
}

/**
 * Get the authenticated user's email address
 */
export async function getAuthenticatedEmail(accessToken: string): Promise<string> {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });

  if (!profile.data.emailAddress) {
    throw new Error("Failed to get email address from Gmail profile");
  }

  return profile.data.emailAddress;
}
