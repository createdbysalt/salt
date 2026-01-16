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
  if (context.actorType !== "studioMember" || !context.studio) {
    redirect("/signin");
  }
  return context.studio;
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

