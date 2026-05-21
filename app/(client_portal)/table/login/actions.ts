"use server";

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import {
  resolveBrandingConfig,
  type ResolvedBrandingConfig,
} from "@/app/_lib/table/branding-config";
import { sendBridgeMagicLinkEmail } from "@/app/_lib/email/table-emails";

export interface StudioMatch {
  studioId: string;
  studioName: string;
  branding: ResolvedBrandingConfig;
}

export interface EmailLookupResult {
  /** Number of studios this email has access to */
  count: number;
  /** Studio info when exactly one match (for personalization) */
  studio: StudioMatch | null;
}

/**
 * Look up which studios an email address has access to.
 *
 * This is called BEFORE sending the magic link to personalize the
 * "check your inbox" state. We only return detailed info when there's
 * exactly one match to avoid leaking which studios a user belongs to.
 *
 * Security: We don't reveal studio names for 0 or 2+ matches.
 */
export async function lookupStudiosByEmail(
  email: string
): Promise<EmailLookupResult> {
  const supabase = await createClient();
  const normalizedEmail = email.toLowerCase().trim();
  console.log("[lookupStudiosByEmail] Looking up:", normalizedEmail);

  // Step 1: Find user_id from profiles table by email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .single();

  console.log("[lookupStudiosByEmail] Profile lookup:", profile?.id || "not found", profileError?.message || "");

  if (profileError || !profile) {
    // User doesn't exist yet - they might be signing up for the first time
    return { count: 0, studio: null };
  }

  // Step 2: Find all active client_users for this user
  const { data: memberships, error } = await supabase
    .from("client_users")
    .select(
      `
      client_id,
      status,
      clients!inner(
        id,
        studio_id,
        studios!inner(
          id,
          name,
          bridge_branding
        )
      )
    `
    )
    .eq("user_id", profile.id)
    .eq("status", "active");

  console.log("[lookupStudiosByEmail] client_users found:", memberships?.length || 0, error?.message || "");

  if (error || !memberships || memberships.length === 0) {
    return { count: 0, studio: null };
  }

  // Deduplicate by studio_id (user might have access to multiple clients at same studio)
  const uniqueStudios = new Map<string, StudioMatch>();

  for (const m of memberships) {
    const studio = (m.clients as any)?.studios;
    if (studio && !uniqueStudios.has(studio.id)) {
      uniqueStudios.set(studio.id, {
        studioId: studio.id,
        studioName: studio.name,
        branding: resolveBrandingConfig(studio.bridge_branding),
      });
    }
  }

  const count = uniqueStudios.size;
  console.log("[lookupStudiosByEmail] Unique studios found:", count, Array.from(uniqueStudios.values()).map(s => ({ id: s.studioId, name: s.studioName })));

  // Only reveal studio info when exactly one match
  if (count === 1) {
    const [studio] = Array.from(uniqueStudios.values());
    return { count, studio };
  }

  return { count, studio: null };
}

/**
 * Send a branded magic link email for Bridge sign-in.
 *
 * This replaces Supabase's default signInWithOtp email with a
 * studio-branded email sent via our email infrastructure.
 *
 * Flow:
 * 1. Look up which studio(s) this email has access to
 * 2. Generate magic link via Supabase Admin API (doesn't send email)
 * 3. Send our branded email with the magic link
 */
export async function sendBridgeMagicLink(
  email: string
): Promise<{ success: boolean; error?: string; studioMatch?: StudioMatch }> {
  const trimmedEmail = email.trim().toLowerCase();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { success: false, error: "Please enter a valid email address" };
  }

  try {
    // Step 1: Look up studio associations for personalization
    const lookup = await lookupStudiosByEmail(trimmedEmail);

    // Step 2: Generate magic link via Supabase Admin API
    // This creates the link without sending Supabase's default email
    const supabaseAdmin = createAdminClient();

    // Use NEXT_PUBLIC_BRIDGE_URL for Bridge magic links (not NEXT_PUBLIC_SITE_URL which is for the main app)
    const tableUrl =
      process.env.NEXT_PUBLIC_BRIDGE_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:3000/table"
        : "https://table.usesalt.io");

    // Use /verify path - on bridge subdomain, middleware rewrites it to /table/verify
    const redirectUrl = `${tableUrl}/verify`;

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: trimmedEmail,
        options: {
          redirectTo: redirectUrl,
        },
      });

    if (linkError) {
      console.error("Error generating magic link:", linkError);
      return { success: false, error: "Failed to send sign-in link. Please try again." };
    }

    const magicLink = linkData?.properties?.action_link;
    if (!magicLink) {
      console.error("No action_link in generateLink response");
      return { success: false, error: "Failed to generate sign-in link. Please try again." };
    }

    // Step 3: Send our branded email
    // If user has exactly one studio, use that studio's branding
    // Otherwise, use Salt default branding
    if (lookup.studio) {
      await sendBridgeMagicLinkEmail({
        studioId: lookup.studio.studioId,
        userEmail: trimmedEmail,
        magicLink,
        studioName: lookup.studio.studioName,
      });
    } else {
      // No studio found or multiple studios - use default Salt branding
      // The user might be signing in for the first time (invited but never logged in)
      // Or they have access to multiple studios (we'll show a picker after login)
      await sendBridgeMagicLinkEmail({
        studioId: "", // Empty - will use fallback branding
        userEmail: trimmedEmail,
        magicLink,
      });
    }

    return { success: true, studioMatch: lookup.studio || undefined };
  } catch (error) {
    console.error("Error in sendBridgeMagicLink:", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}
