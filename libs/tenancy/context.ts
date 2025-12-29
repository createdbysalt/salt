/**
 * Tenant Context Resolver
 * 
 * CRITICAL: This is the single source of truth for tenant resolution.
 * All server components, API routes, and middleware MUST use this to resolve tenant context.
 * 
 * DO NOT create ad-hoc auth checks—always use this resolver.
 */

import { createClient } from "@/libs/supabase/server";
import type { TenantContext, TenantResolution, ActorType, TenantRole } from "./types";

/**
 * Resolve tenant context from an incoming request.
 * 
 * This function:
 * 1. Checks authentication (Supabase session)
 * 2. Determines actor type based on host/path
 * 3. Loads associated studio or client context
 * 4. Returns complete TenantContext
 * 
 * @param request - The incoming request object (with headers for host/path)
 * @returns TenantResolution with context and routing decisions
 */
export async function resolveTenantContext(
  host: string,
  path: string,
  userAgent: string | null = null
): Promise<TenantResolution> {
  const supabase = await createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // Determine actor type based on domain/path patterns
  const actorType = determineActorType(host, path);
  
  // If no user but trying to access protected routes, redirect to signin
  if (!user && actorType !== "anonymous") {
    return {
      context: createAnonymousContext(host, path, userAgent),
      allowed: false,
      redirectTo: "/signin",
      error: "Authentication required",
    };
  }
  
  // Build tenant context based on actor type
  const context: TenantContext = {
    actorType,
    userId: user?.id || null,
    studio: null,
    client: null,
    metadata: {
      host,
      path,
      userAgent,
    },
  };
  
  // Load studio context if actor is a studio member
  if (actorType === "studioMember" && user) {
    const studioContext = await loadStudioContext(supabase, user.id);
    if (!studioContext) {
      return {
        context,
        allowed: false,
        redirectTo: "/onboarding/studio",
        error: "Studio context not found",
      };
    }
    context.studio = studioContext;
  }
  
  // Load client context if actor is a client user
  if (actorType === "clientUser" && user) {
    const clientContext = await loadClientContext(supabase, user.id, host, path);
    if (!clientContext) {
      return {
        context,
        allowed: false,
        redirectTo: "/signin",
        error: "Client context not found",
      };
    }
    context.client = clientContext;
  }
  
  return {
    context,
    allowed: true,
  };
}

/**
 * Determine actor type based on host and path patterns.
 * 
 * Rules:
 * - app.saltcore.dev or /dashboard/** → studioMember
 * - bridge.saltcore.dev or custom domain → clientUser
 * - Public pages → anonymous
 */
function determineActorType(host: string, path: string): ActorType {
  // User Dashboard routes
  if (
    host.includes("app.saltcore") || 
    path.startsWith("/dashboard")
  ) {
    return "studioMember";
  }
  
  // Client Bridge routes
  if (
    host.includes("bridge.saltcore") ||
    path.startsWith("/bridge") ||
    // Custom domains (will be checked against portal_domains table in Phase 4)
    (!host.includes("saltcore") && !host.includes("localhost"))
  ) {
    return "clientUser";
  }
  
  // Public/marketing pages
  return "anonymous";
}

/**
 * Load studio context for a studio member.
 */
async function loadStudioContext(
  supabase: any,
  userId: string
): Promise<{ id: string; role: TenantRole } | null> {
  // Query studio_members to get the user's studio and role
  const { data: membership, error } = await supabase
    .from("studio_members")
    .select("studio_id, role")
    .eq("user_id", userId)
    .single();
  
  if (error || !membership) {
    console.error("Failed to load studio context:", error);
    return null;
  }
  
  return {
    id: membership.studio_id,
    role: membership.role as TenantRole,
  };
}

/**
 * Load client context for a client user.
 */
async function loadClientContext(
  supabase: any,
  userId: string,
  host: string,
  path: string
): Promise<{ id: string; role: TenantRole; portalId: string } | null> {
  // Query client_users to get the user's client membership
  const { data: membership, error } = await supabase
    .from("client_users")
    .select("client_id, role, clients!inner(id), bridge_portals!inner(id)")
    .eq("user_id", userId)
    .single();
  
  if (error || !membership) {
    console.error("Failed to load client context:", error);
    return null;
  }
  
  return {
    id: membership.client_id,
    role: membership.role as TenantRole,
    portalId: membership.bridge_portals[0]?.id || membership.client_id, // Fallback to client_id
  };
}

/**
 * Create anonymous context for unauthenticated requests.
 */
function createAnonymousContext(
  host: string,
  path: string,
  userAgent: string | null
): TenantContext {
  return {
    actorType: "anonymous",
    userId: null,
    studio: null,
    client: null,
    metadata: {
      host,
      path,
      userAgent,
    },
  };
}

/**
 * Helper: Get tenant context in server components.
 * 
 * Usage:
 * ```ts
 * const { context } = await getTenantContext();
 * if (context.actorType !== "studioMember") {
 *   redirect("/signin");
 * }
 * ```
 */
export async function getTenantContext(): Promise<TenantResolution> {
  const { headers } = await import("next/headers");
  const headersList = await headers();
  
  const host = headersList.get("host") || "localhost:3000";
  const pathname = headersList.get("x-pathname") || "/";
  const userAgent = headersList.get("user-agent");
  
  return resolveTenantContext(host, pathname, userAgent);
}

