/**
 * Gmail API Client
 *
 * Provides authenticated Gmail client for sending emails and managing threads.
 */

import { google, gmail_v1 } from "googleapis";
import { createOAuth2Client, refreshAccessToken } from "./oauth";
import { decryptToken, encryptToken } from "./crypto";
import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";

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
 * Get Gmail connection for a user in a workspace.
 *
 * The backing table still stores this as gmail_connections.studio_id until the
 * physical workspace rename migration lands.
 * @param useAdmin - Use admin client to bypass RLS (for webhook/system context)
 */
export async function getGmailConnection(
  userId: string,
  workspaceId: string,
  useAdmin = false
): Promise<GmailConnection | null> {
  const supabase = useAdmin ? createAdminClient() : await createClient();

  const { data, error } = await supabase
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("studio_id", workspaceId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as GmailConnection;
}

/**
 * Create authenticated Gmail client for a user
 * Automatically refreshes token if expired
 * @param useAdmin - Use admin client to bypass RLS (for webhook/system context)
 */
export async function createGmailClient(userId: string, studioId: string, useAdmin = false): Promise<gmail_v1.Gmail | null> {
  const connection = await getGmailConnection(userId, studioId, useAdmin);

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
    const supabase = useAdmin ? createAdminClient() : await createClient();
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
 * Create authenticated Gmail client for a user.
 */
export async function createWorkspaceGmailClient(
  userId: string,
  workspaceId: string,
  useAdmin = false
): Promise<gmail_v1.Gmail | null> {
  return createGmailClient(userId, workspaceId, useAdmin);
}

/**
 * Check if a user has Gmail connected for a workspace.
 */
export async function hasGmailConnection(userId: string, workspaceId: string): Promise<boolean> {
  const connection = await getGmailConnection(userId, workspaceId);
  return connection !== null;
}

export async function hasWorkspaceGmailConnection(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return hasGmailConnection(userId, workspaceId);
}

/**
 * Get the connected Gmail email address for a user
 */
export async function getConnectedGmailEmail(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const connection = await getGmailConnection(userId, workspaceId);
  return connection?.email || null;
}
