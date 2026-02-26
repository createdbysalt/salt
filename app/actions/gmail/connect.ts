"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { getAuthUrl, exchangeCodeForTokens, getAuthenticatedEmail, isGoogleOAuthConfigured } from "@/app/_lib/gmail/oauth";
import { encryptToken } from "@/app/_lib/gmail/crypto";
import { revalidatePath } from "next/cache";

/**
 * Check if Google OAuth is configured
 */
export async function checkGoogleOAuthConfigured() {
  return { configured: isGoogleOAuthConfigured() };
}

/**
 * Get Google OAuth URL (Gmail + Calendar)
 * Returns URL for client-side redirect
 */
export async function connectGoogle(studioId: string): Promise<
  | { success: true; url: string }
  | { success: false; error: string }
> {
  // Check if Google OAuth is configured
  if (!isGoogleOAuthConfigured()) {
    return { success: false, error: "Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Create state parameter with user and studio info (for callback)
  const state = Buffer.from(
    JSON.stringify({
      userId: user.id,
      studioId,
      returnUrl: `/settings/integrations`,
    })
  ).toString("base64");

  try {
    const authUrl = getAuthUrl(state);
    return { success: true, url: authUrl };
  } catch (error) {
    console.error("Failed to generate Google auth URL:", error);
    return { success: false, error: "Failed to generate Google authorization URL" };
  }
}

// Alias for backwards compatibility
export const connectGmail = connectGoogle;

/**
 * Complete Gmail OAuth connection (called from callback route)
 */
export async function completeGmailConnection(code: string, state: string) {
  console.log("[completeGmailConnection] Starting...");

  // Parse state
  let stateData: { userId: string; studioId: string; returnUrl: string };
  try {
    stateData = JSON.parse(Buffer.from(state, "base64").toString("utf8"));
    console.log("[completeGmailConnection] State parsed:", { userId: stateData.userId, studioId: stateData.studioId });
  } catch {
    console.error("[completeGmailConnection] Failed to parse state");
    return { success: false, error: "Invalid state parameter" };
  }

  const { userId, studioId, returnUrl } = stateData;

  // Verify the current user matches
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[completeGmailConnection] Current user:", user?.id, "Expected:", userId);

  if (!user || user.id !== userId) {
    console.error("[completeGmailConnection] User mismatch");
    return { success: false, error: "User mismatch" };
  }

  try {
    // Exchange code for tokens
    console.log("[completeGmailConnection] Exchanging code for tokens...");
    const tokens = await exchangeCodeForTokens(code);
    console.log("[completeGmailConnection] Got tokens, expires at:", tokens.expiresAt);

    // Get the Gmail email address
    console.log("[completeGmailConnection] Getting authenticated email...");
    const email = await getAuthenticatedEmail(tokens.accessToken);
    console.log("[completeGmailConnection] Email:", email);

    // Store encrypted tokens in database using admin client
    // (RLS might block regular client during OAuth callback)
    console.log("[completeGmailConnection] Storing in database...");
    const adminSupabase = createAdminClient();
    const { error: insertError } = await adminSupabase.from("gmail_connections").upsert(
      {
        user_id: userId,
        studio_id: studioId,
        email,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        token_expires_at: tokens.expiresAt.toISOString(),
        scopes: tokens.scopes,
      },
      {
        onConflict: "user_id,studio_id",
      }
    );

    if (insertError) {
      console.error("[completeGmailConnection] Database error:", insertError);
      return { success: false, error: "Failed to store Gmail connection" };
    }

    console.log("[completeGmailConnection] Success! Revalidating path...");
    revalidatePath("/settings/integrations");

    return {
      success: true,
      email,
      returnUrl,
    };
  } catch (error) {
    console.error("[completeGmailConnection] Exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect Gmail",
    };
  }
}

/**
 * Get current Gmail connection status
 */
export async function getGmailConnectionStatus(studioId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { connected: false, email: null };
  }

  const { data: connection } = await supabase
    .from("gmail_connections")
    .select("email")
    .eq("user_id", user.id)
    .eq("studio_id", studioId)
    .single();

  return {
    connected: !!connection,
    email: connection?.email || null,
  };
}
