/**
 * Bridge Queries
 *
 * Server-side queries for Bridge client portal data.
 */

import { createClient } from "@/app/_lib/supabase/server";
import {
  type BridgeBrandingConfig,
  resolveBrandingConfig,
  type ResolvedBrandingConfig,
} from "./branding-config";

export interface StudioBrandingForLogin {
  studioId: string;
  studioName: string;
  supportEmail: string | null;
  branding: ResolvedBrandingConfig;
}

/**
 * Get studio branding for the Bridge login page.
 *
 * Resolves studio from:
 * 1. Custom domain (if host is not saltcore.io)
 * 2. Returns null if no studio found (will use default branding)
 */
export async function getStudioBrandingForLogin(
  host: string
): Promise<StudioBrandingForLogin | null> {
  // Skip if this is a saltcore.io or localhost domain
  if (host.includes("saltcore") || host.includes("localhost") || host.includes("lvh.me")) {
    return null;
  }

  const supabase = await createClient();

  // Strip port if present
  const hostname = host.split(":")[0];

  // Look up verified custom domain
  const { data: domain, error: domainError } = await supabase
    .from("studio_domains")
    .select("studio_id")
    .eq("hostname", hostname)
    .eq("status", "verified")
    .single();

  if (domainError || !domain) {
    return null;
  }

  // Get studio details
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("id, name, support_email, bridge_branding")
    .eq("id", domain.studio_id)
    .single();

  if (studioError || !studio) {
    return null;
  }

  return {
    studioId: studio.id,
    studioName: studio.name,
    supportEmail: studio.support_email,
    branding: resolveBrandingConfig(studio.bridge_branding as BridgeBrandingConfig),
  };
}

/**
 * Default branding for login when no studio is resolved.
 * Used on bridge.saltcore.io or localhost.
 */
export function getDefaultLoginBranding(): StudioBrandingForLogin {
  return {
    studioId: "",
    studioName: "Your Studio",
    supportEmail: null,
    branding: resolveBrandingConfig(null),
  };
}
