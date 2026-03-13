/**
 * Bridge Queries
 *
 * Server-side queries for Bridge client portal data.
 */

import { createClient } from "@/app/_lib/supabase/server";
import { createAdminClient } from "@/app/_lib/supabase/admin";
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

/**
 * Salt Core branding for login when studio has no custom branding.
 * Shows "The Bridge" branding instead of generic "Your Studio".
 */
export function getSaltCoreBranding(): StudioBrandingForLogin {
  return {
    studioId: "",
    studioName: "The Bridge",
    supportEmail: "support@saltcore.io",
    branding: resolveBrandingConfig(null), // Uses default Salt Core colors
  };
}

/**
 * Get studio branding by slug for the Bridge login page.
 *
 * Used for URLs like bridge.saltcore.io/saltstudio
 *
 * @param slug - The studio slug from the URL
 * @returns Studio branding if found, null if slug doesn't exist
 */
export async function getStudioBrandingBySlug(
  slug: string
): Promise<StudioBrandingForLogin | null> {
  const supabase = createAdminClient();

  const { data: studio, error } = await supabase
    .from("studios")
    .select("id, name, support_email, bridge_branding")
    .eq("slug", slug)
    .single();

  if (error || !studio) {
    return null;
  }

  const branding = resolveBrandingConfig(
    studio.bridge_branding as BridgeBrandingConfig
  );

  return {
    studioId: studio.id,
    studioName: studio.name,
    supportEmail: studio.support_email,
    branding,
  };
}

/**
 * Get studio branding for authenticated Bridge users.
 *
 * @param studioId - The studio ID to fetch branding for
 * @returns Resolved branding config or default if not found
 */
export async function getStudioBrandingById(
  studioId: string
): Promise<ResolvedBrandingConfig> {
  // Use admin client - branding is public info needed by Bridge clients
  // Regular client is blocked by RLS for client users
  const supabase = createAdminClient();

  const { data: studio, error } = await supabase
    .from("studios")
    .select("bridge_branding")
    .eq("id", studioId)
    .single();

  if (error || !studio) {
    return resolveBrandingConfig(null);
  }

  return resolveBrandingConfig(studio.bridge_branding as BridgeBrandingConfig);
}

/**
 * Get studio ID from a client ID.
 *
 * @param clientId - The client ID to look up
 * @returns The studio ID or null if not found
 */
export async function getStudioIdFromClient(
  clientId: string
): Promise<string | null> {
  // Use admin client to ensure we can read the client
  const supabase = createAdminClient();

  const { data: client, error } = await supabase
    .from("clients")
    .select("studio_id")
    .eq("id", clientId)
    .single();

  if (error || !client) {
    return null;
  }

  return client.studio_id;
}

export interface BridgeUserInfo {
  name: string;
  email: string;
  avatar: string | null;
}

export interface BridgeStudioInfo {
  name: string;
  logoUrl: string | null;
}

export interface BridgeProject {
  id: string;
  name: string;
  url: string;
}

/**
 * Get studio info for Bridge sidebar header.
 *
 * @param studioId - The studio ID
 * @returns Studio name and logo URL for light mode
 */
export async function getBridgeStudioInfo(
  studioId: string
): Promise<BridgeStudioInfo> {
  // Use admin client - studio branding is public info for Bridge clients
  const supabase = createAdminClient();

  // Get studio name and bridge_branding (contains logo URLs)
  const { data: studio, error: studioError } = await supabase
    .from("studios")
    .select("name, bridge_branding")
    .eq("id", studioId)
    .single();

  if (studioError) {
    console.error("[getBridgeStudioInfo] Error:", studioError.message);
    return { name: "Studio", logoUrl: null };
  }

  // Extract logo URL from bridge_branding JSONB
  // For light mode Bridge, use logo.lightUrl
  const branding = studio?.bridge_branding as {
    logo?: { lightUrl?: string; darkUrl?: string };
  } | null;

  const logoUrl = branding?.logo?.lightUrl || null;

  return {
    name: studio?.name || "Studio",
    logoUrl,
  };
}

/**
 * Get projects for a client (for Bridge sidebar).
 *
 * @param clientId - The client ID
 * @returns List of projects with id, name, and url
 */
export async function getBridgeProjects(
  clientId: string
): Promise<BridgeProject[]> {
  // Use admin client to bypass RLS for fetching client's projects
  const supabase = createAdminClient();

  // Show all non-deleted, non-archived projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .not("status", "eq", "archived")
    .order("name");

  return (projects || []).map((p) => ({
    id: p.id,
    name: p.name,
    url: `/bridge/projects/${p.id}`,
  }));
}

/**
 * Get user info for the Bridge sidebar.
 *
 * @param userId - The authenticated user ID
 * @returns User info with name, email, and avatar
 */
export async function getBridgeUserInfo(
  userId: string
): Promise<BridgeUserInfo> {
  const supabase = await createClient();

  // Get email from client_users
  const { data: clientUser } = await supabase
    .from("client_users")
    .select("email")
    .eq("user_id", userId)
    .limit(1)
    .single();

  // Get name and avatar from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, first_name, display_name, avatar_url")
    .eq("id", userId)
    .single();

  const email = clientUser?.email || "";
  const name =
    profile?.full_name ||
    profile?.display_name ||
    profile?.first_name ||
    email.split("@")[0] ||
    "User";

  return {
    name,
    email,
    avatar: profile?.avatar_url || null,
  };
}
