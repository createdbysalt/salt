/**
 * Gmail API Client
 *
 * Provides authenticated Gmail client for sending emails and managing threads.
 */

import { google, gmail_v1 } from "googleapis";
import { createOAuth2Client, refreshAccessToken } from "./oauth";
import { decryptToken, encryptToken } from "./crypto";
import { createClient } from "@/app/_lib/supabase/server";

export interface GmailConnection {
  id: string;
  user_id: string;
  studio_id: string;
  email: string;
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  token_expires_at: string;
  scopes: string[];
  history_id: string | null;
  watch_expiration: string | null;
}

/**
 * Get Gmail connection for a user in a studio
 */
export async function getGmailConnection(userId: string, studioId: string): Promise<GmailConnection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("studio_id", studioId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as GmailConnection;
}

/**
 * Create authenticated Gmail client for a user
 * Automatically refreshes token if expired
 */
export async function createGmailClient(userId: string, studioId: string): Promise<gmail_v1.Gmail | null> {
  const connection = await getGmailConnection(userId, studioId);

  if (!connection) {
    return null;
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(connection.token_expires_at);
  const isExpired = expiresAt.getTime() - 5 * 60 * 1000 < Date.now();

  let accessToken: string;

  if (isExpired) {
    // Refresh the token
    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    const newTokens = await refreshAccessToken(refreshToken);

    // Update database with new access token
    const supabase = await createClient();
    await supabase
      .from("gmail_connections")
      .update({
        access_token_encrypted: encryptToken(newTokens.accessToken),
        token_expires_at: newTokens.expiresAt.toISOString(),
      })
      .eq("id", connection.id);

    accessToken = newTokens.accessToken;
  } else {
    accessToken = decryptToken(connection.access_token_encrypted);
  }

  // Create OAuth2 client with credentials
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Check if a user has Gmail connected for a studio
 */
export async function hasGmailConnection(userId: string, studioId: string): Promise<boolean> {
  const connection = await getGmailConnection(userId, studioId);
  return connection !== null;
}

/**
 * Get the connected Gmail email address for a user
 */
export async function getConnectedGmailEmail(userId: string, studioId: string): Promise<string | null> {
  const connection = await getGmailConnection(userId, studioId);
  return connection?.email || null;
}
