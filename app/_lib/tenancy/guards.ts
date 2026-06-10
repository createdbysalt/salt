/**
 * Tenant Guards
 * 
 * Server-side guard functions that throw or redirect if tenant context is invalid.
 * Use these in server components and API routes to enforce access control.
 */

import { redirect } from "next/navigation";
import type { TenantContext, ActorType } from "./types";

/**
 * Require that the actor is a studio member.
 * Throws/redirects if not authenticated or not a studio member.
 * 
 * Usage:
 * ```ts
 * const { context } = await getTenantContext();
 * const studio = requireStudioMember(context);
 * // Now studio is guaranteed to exist
 * ```
 */
export function requireStudioMember(context: TenantContext) {
  const member = context.studio ?? context.workspace;

  if (
    (context.actorType !== "studioMember" && context.actorType !== "workspaceMember") ||
    !member
  ) {
    redirect("/signin");
  }
  return member;
}

/**
 * Workspace-named alias for the tenant guard.
 *
 * The database still uses studio/studio_id until the workspace rename migration
 * lands, but new product code should call this form.
 */
export function requireWorkspaceMember(context: TenantContext) {
  const member = context.workspace ?? context.studio;

  if (
    (context.actorType !== "workspaceMember" && context.actorType !== "studioMember") ||
    !member
  ) {
    redirect("/signin");
  }
  return member;
}

/**
 * Require that the actor is a client user.
 * Throws/redirects if not authenticated or not a client user.
 */
export function requireClientUser(context: TenantContext) {
  if (context.actorType !== "clientUser" || !context.client) {
    redirect("/signin");
  }
  return context.client;
}

/**
 * Require specific actor type(s).
 * 
 * Usage:
 * ```ts
 * requireActorType(context, ["studioMember", "clientUser"]);
 * ```
 */
export function requireActorType(
  context: TenantContext,
  allowedTypes: ActorType[]
) {
  if (!allowedTypes.includes(context.actorType)) {
    redirect("/signin");
  }
}

/**
 * Require authenticated user (any type except anonymous).
 */
export function requireAuth(context: TenantContext) {
  if (context.actorType === "anonymous" || !context.userId) {
    redirect("/signin");
  }
  return context.userId;
}

