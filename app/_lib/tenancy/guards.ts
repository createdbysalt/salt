/**
 * Tenant Guards
 * 
 * Server-side guard functions that throw or redirect if tenant context is invalid.
 * Use these in server components and API routes to enforce access control.
 */

import { redirect } from "next/navigation";
import type { TenantContext, ActorType } from "./types";

/**
 * Require that the actor is a workspace member.
 * Throws/redirects if not authenticated or not a workspace member.
 * 
 * Usage:
 * ```ts
 * const { context } = await getTenantContext();
 * const workspace = requireWorkspaceMember(context);
 * // Now workspace is guaranteed to exist
 * ```
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

/** @deprecated Use requireWorkspaceMember. */
export const requireStudioMember = requireWorkspaceMember;

/**
 * Server-action safe workspace guard — returns null instead of redirect().
 * Use in actions invoked from client components to avoid NEXT_REDIRECT toasts.
 */
export function getWorkspaceMemberOrNull(context: TenantContext) {
  const member = context.workspace ?? context.studio;

  if (
    !context.userId ||
    (context.actorType !== "workspaceMember" && context.actorType !== "studioMember") ||
    !member
  ) {
    return null;
  }

  return member;
}

/**
 * Require specific actor type(s).
 *
 * Usage:
 * ```ts
 * requireActorType(context, ["workspaceMember"]);
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

