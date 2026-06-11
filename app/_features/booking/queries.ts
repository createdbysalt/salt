/**
 * Booking Feature - Server Queries
 *
 * Data fetching functions for booking/scheduling.
 * Includes public queries (no auth) for booking pages.
 */

import "server-only";

import { createClient } from "@/app/_lib/supabase/server";

// =============================================================================
// PUBLIC QUERIES (No Auth Required)
// =============================================================================

/** Public studio info for booking pages */
export interface PublicStudioBookingInfo {
  id: string;
  name: string;
  slug: string;
  calcomUsername: string | null;
}

/**
 * Get studio with Cal.com integration by slug.
 * Public query - no authentication required.
 *
 * Used for public booking pages at /book/[studioSlug]
 */
export async function getStudioBookingInfoBySlug(
  slug: string
): Promise<PublicStudioBookingInfo | null> {
  const supabase = await createClient();

  // First get the studio
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (studioError || !studio) {
    return null;
  }

  // Then check for active Cal.com integration
  const { data: integration } = await supabase
    .from("workspace_integrations")
    .select("config")
    .eq("workspace_id", studio.id)
    .eq("provider", "calcom")
    .eq("is_active", true)
    .single();

  const calcomUsername = integration?.config
    ? (integration.config as { username?: string }).username ?? null
    : null;

  return {
    id: studio.id,
    name: studio.name,
    slug: studio.slug,
    calcomUsername,
  };
}
