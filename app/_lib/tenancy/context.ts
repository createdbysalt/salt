/**
 * Tenant Context Resolver
 *
 * CRITICAL: This is the single source of truth for tenant resolution.
 * All server components, API routes, and middleware MUST use this to resolve tenant context.
 *
 * DO NOT create ad-hoc auth checks—always use this resolver.
 */

import { cache } from "react";
import { createClient } from "@/app/_lib/supabase/server";
import { logger } from "@/app/_lib/logger";
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
  const isDev = process.env.NODE_ENV === "development";

  // Get authenticated user
  // In dev mode, use getSession() to avoid network call failures during HMR
  // In prod, use getUser() for proper server-side verification
  let user = null;
  if (isDev) {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
    // Server Actions can miss a readable session cookie during HMR; verify with getUser().
    if (!user) {
      const { data: { user: verifiedUser } } = await supabase.auth.getUser();
      user = verifiedUser ?? null;
    }
  } else {
    const { data, error: authError } = await supabase.auth.getUser();
    user = data.user;
  }
  
  // Determine actor type based on domain/path patterns
  const actorType = determineActorType(host, path);
  
  // Debug logging
  logger.debug("Tenant context resolution", { host, path, actorType, hasUser: !!user });
  
  // Allow magic link verification pages without authentication
  // These pages handle token exchange client-side before redirecting
  const isVerificationPage = path === "/signin";

  // If no user but trying to access protected routes, redirect to sign in
  if (!user && actorType !== "anonymous" && !isVerificationPage) {
    logger.info("No user found, redirecting to auth", { actorType, redirectTo: "/signin" });
    return {
      context: createAnonymousContext(host, path, userAgent),
      allowed: false,
      redirectTo: "/signin",
      error: "Authentication required",
    };
  }

  // If we reach here and it's a verification page without user, allow access
  if (!user && isVerificationPage) {
    return {
      context: createAnonymousContext(host, path, userAgent),
      allowed: true,
    };
  }
  
  // Build tenant context based on actor type
  const context: TenantContext = {
    actorType,
    userId: user?.id || null,
    workspace: null,
    studio: null,
    metadata: {
      host,
      path,
      userAgent,
    },
  };
  
  // Load workspace context if actor is a workspace member
  if (actorType === "workspaceMember" && user) {
    const workspaceContext = await loadWorkspaceContext(supabase, user.id);
    if (!workspaceContext) {
      return {
        context,
        allowed: false,
        redirectTo: "/onboarding/studio",
        error: "Workspace context not found",
      };
    }
    context.workspace = workspaceContext;
    context.studio = workspaceContext;
  }

  // Server Actions on localhost can miss x-pathname and resolve as anonymous "/".
  // If the user has a workspace membership, promote to workspaceMember so actions work.
  if (
    user &&
    actorType === "anonymous" &&
    (host.includes("localhost") || host.includes("lvh.me")) &&
    !context.workspace
  ) {
    const workspaceContext = await loadWorkspaceContext(supabase, user.id);
    if (workspaceContext) {
      context.actorType = "workspaceMember";
      context.workspace = workspaceContext;
      context.studio = workspaceContext;
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
 * - app.usesalt.dev or /hq, /plays, … → workspaceMember
 * - Public pages (including invoice payment links) → anonymous
 *
 * Note: the Bridge client portal (table.* hosts, /table paths, custom
 * domains) is retired — middleware redirects those hosts, and any
 * stragglers resolve as anonymous.
 */
function determineActorType(host: string, path: string): ActorType {
  // User Dashboard routes (Relationships + HQ + apps)
  if (
    host.includes("app.usesalt") ||
    host.includes("app.staging.usesalt") ||
    // Authenticated app API routes — same actor as the app shell. Without
    // this, localhost requests resolve as anonymous and the route guards
    // redirect the fetch to /signin instead of streaming.
    path.startsWith("/api/ask-salt") ||
    // Primary routes
    path.startsWith("/hq") ||
    path.startsWith("/plays") ||
    path.startsWith("/relationships") ||
    path.startsWith("/work") ||
    path.startsWith("/billing") ||
    path.startsWith("/sales") ||
    // New unified routes (Phase 4 sidebar restructure)
    path.startsWith("/actions") ||
    path.startsWith("/capture") ||
    path.startsWith("/messages") ||
    path.startsWith("/people") ||
    path.startsWith("/orgs") ||
    path.startsWith("/me") ||
    path.startsWith("/notes") ||
    path.startsWith("/files") ||
    path.startsWith("/memory") ||
    path.startsWith("/teams") ||
    path.startsWith("/conversations") ||
    path.startsWith("/meetings") ||
    path.startsWith("/spaces") ||
    path.startsWith("/payments") ||
    // Legacy routes (kept for backwards compatibility)
    path.startsWith("/clients") ||
    path.startsWith("/studio") ||
    path.startsWith("/strategy") ||
    path.startsWith("/serve") ||
    path.startsWith("/dashboard")
  ) {
    return "workspaceMember";
  }

  // Public/marketing pages
  return "anonymous";
}

/**
 * Load workspace context for a workspace member.
 */
async function loadWorkspaceContext(
  supabase: any,
  userId: string
): Promise<{ id: string; role: TenantRole } | null> {
  // Pick the earliest workspace membership until workspace switching is fully wired.
  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  
  if (error || !membership) {
    logger.error("Failed to load workspace context", error);
    return null;
  }
  
  return {
    id: membership.workspace_id,
    role: membership.role as TenantRole,
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
    workspace: null,
    studio: null,
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
 * if (context.actorType !== "workspaceMember") {
 *   redirect("/signin");
 * }
 * ```
 */
export const getTenantContext = cache(
  async (): Promise<TenantResolution> => {
    const { headers } = await import("next/headers");
    const headersList = await headers();

    const host = headersList.get("host") || "localhost:3000";
    const pathname = resolveRequestPathname(headersList);
    const userAgent = headersList.get("user-agent");

    return resolveTenantContext(host, pathname, userAgent);
  }
);

/**
 * Resolve pathname for tenant routing.
 * Server Actions may arrive without middleware's x-pathname; fall back to Referer.
 */
function resolveRequestPathname(headersList: Headers): string {
  const fromMiddleware = headersList.get("x-pathname")?.trim();
  if (fromMiddleware && fromMiddleware !== "/") {
    return fromMiddleware;
  }

  const referer = headersList.get("referer")?.trim();
  if (referer) {
    try {
      const refererPath = new URL(referer).pathname;
      if (refererPath && refererPath !== "/") {
        return refererPath;
      }
    } catch {
      // ignore malformed referer
    }
  }

  return fromMiddleware || "/";
}

