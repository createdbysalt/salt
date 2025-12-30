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
  
  // Allow magic link verification pages without authentication
  // These pages handle token exchange client-side before redirecting
  const isVerificationPage = path === "/bridge/verify" || path === "/signin";
  
  // If no user but trying to access protected routes, redirect to signin
  if (!user && actorType !== "anonymous" && !isVerificationPage) {
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
    // Check if this is a custom domain and resolve studio
    const customDomainStudioId = await resolveStudioFromCustomDomain(supabase, host);
    
    // Read active client ID from cookie (if present)
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const activeClientId = cookieStore.get("bridge_active_client_id")?.value;
    
    const clientData = await loadClientContext(
      supabase, 
      user.id, 
      host, 
      path, 
      activeClientId,
      customDomainStudioId
    );
    
    // If no memberships at all, deny access
    if (clientData.allMemberships.length === 0) {
      return {
        context,
        allowed: false,
        redirectTo: "/no-access",
        error: "No client access",
      };
    }
    
    // Store all memberships in context
    context.clientMemberships = clientData.allMemberships;
    context.client = clientData.activeClient;
    context.needsClientSelection = clientData.needsSelection;
    
    // If selection is needed (2+ clients, no valid active), redirect to picker
    if (clientData.needsSelection) {
      return {
        context,
        allowed: false,
        redirectTo: "/bridge/select",
        error: "Client selection required",
      };
    }
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
    // Custom domains (will be verified against studio_domains table)
    (!host.includes("saltcore") && !host.includes("localhost"))
  ) {
    return "clientUser";
  }
  
  // Public/marketing pages
  return "anonymous";
}

/**
 * Resolve studio ID from custom domain (if applicable)
 * Returns null if host is not a custom domain or domain is not verified
 */
async function resolveStudioFromCustomDomain(
  supabase: any,
  host: string
): Promise<string | null> {
  // Skip if this is a saltcore.io or localhost domain
  if (host.includes("saltcore") || host.includes("localhost")) {
    return null;
  }
  
  // Strip port if present
  const hostname = host.split(":")[0];
  
  // Look up verified custom domain
  const { data: domain, error } = await supabase
    .from("studio_domains")
    .select("studio_id, status")
    .eq("hostname", hostname)
    .eq("status", "verified")
    .single();
  
  if (error || !domain) {
    console.log(`Custom domain ${hostname} not found or not verified`);
    return null;
  }
  
  return domain.studio_id;
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
 * Load client context for a client user (supports multi-client membership).
 * Returns the active client (from cookie) or null if selection is needed.
 * If customDomainStudioId is provided, filters memberships to that studio only.
 */
async function loadClientContext(
  supabase: any,
  userId: string,
  host: string,
  path: string,
  activeClientId?: string | null,
  customDomainStudioId?: string | null
): Promise<{
  activeClient: { id: string; role: TenantRole; portalId: string } | null;
  allMemberships: Array<{
    clientId: string;
    clientName: string;
    role: TenantRole;
    portalId: string;
    studioId: string;
  }>;
  needsSelection: boolean;
}> {
  // Query ALL client_users memberships for this user
  let query = supabase
    .from("client_users")
    .select(`
      client_id,
      role,
      status,
      clients!inner(id, name, studio_id)
    `)
    .eq("user_id", userId)
    .eq("status", "active"); // Only active memberships
  
  // If on a custom domain, filter to that studio's clients only
  if (customDomainStudioId) {
    query = query.eq("clients.studio_id", customDomainStudioId);
  }
  
  const { data: memberships, error } = await query;
  
  if (error || !memberships || memberships.length === 0) {
    console.error("Failed to load client context:", error);
    return {
      activeClient: null,
      allMemberships: [],
      needsSelection: false,
    };
  }
  
  // Map memberships to a cleaner structure
  const allMemberships = memberships.map((m: any) => ({
    clientId: m.client_id,
    clientName: m.clients.name,
    role: m.role as TenantRole,
    studioId: m.clients.studio_id,
  }));
  
  // If only 1 membership, auto-select it
  if (allMemberships.length === 1) {
    const single = allMemberships[0];
    return {
      activeClient: {
        id: single.clientId,
        role: single.role,
        portalId: single.clientId, // Use client_id as portal identifier
      },
      allMemberships: allMemberships.map(m => ({
        ...m,
        portalId: m.clientId, // Use client_id as portal identifier
      })),
      needsSelection: false,
    };
  }
  
  // If 2+ memberships, try to resolve active client from cookie
  if (activeClientId) {
    const match = allMemberships.find(m => m.clientId === activeClientId);
    if (match) {
      return {
        activeClient: {
          id: match.clientId,
          role: match.role,
          portalId: match.clientId, // Use client_id as portal identifier
        },
        allMemberships: allMemberships.map(m => ({
          ...m,
          portalId: m.clientId, // Use client_id as portal identifier
        })),
        needsSelection: false,
      };
    }
  }
  
  // No valid active client: need selection
  return {
    activeClient: null,
    allMemberships: allMemberships.map(m => ({
      ...m,
      portalId: m.clientId, // Use client_id as portal identifier
    })),
    needsSelection: true,
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

