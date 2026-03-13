"use server";

import { createClient } from "@/app/_lib/supabase/server";
import {
  resolveBrandingConfig,
  type ResolvedBrandingConfig,
} from "@/app/_lib/bridge/branding-config";

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

  // Step 1: Find user_id from profiles table by email
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

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

  // Only reveal studio info when exactly one match
  if (count === 1) {
    const [studio] = Array.from(uniqueStudios.values());
    return { count, studio };
  }

  return { count, studio: null };
}
