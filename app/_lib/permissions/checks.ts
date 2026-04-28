/**
 * Permission Checks
 * 
 * Role-based permission checking utilities.
 * These work in conjunction with Supabase RLS policies.
 * 
 * Pattern: RLS is the final enforcer; these checks provide UI/UX guardrails.
 */

import type { TenantContext, TenantRole } from "../tenancy/types";
import type { Action, ResourceType, PermissionCheck } from "./types";
import { ROLE_HIERARCHY } from "./types";

/**
 * Check if a role has permission to perform an action on a resource.
 * 
 * This implements SALT's permission model:
 * - Owners can do everything
 * - Admins can do everything except delete studio/transfer ownership
 * - Members can create/read/update their assigned work
 * - Viewers can only read
 * 
 * @param role - The user's role in the context (studio or client)
 * @param action - The action being attempted
 * @param resource - The resource type being accessed
 * @returns PermissionCheck with allowed status and reason
 */
export function can(
  role: TenantRole,
  action: Action,
  resource: ResourceType
): PermissionCheck {
  const roleLevel = ROLE_HIERARCHY[role];
  
  // Owners can do everything
  if (role === "owner") {
    return { allowed: true };
  }
  
  // Admins can do most things except critical operations
  if (role === "admin") {
    if (action === "delete" && (resource === "studio" || resource === "client")) {
      return {
        allowed: false,
        reason: "Only owners can delete studios or clients",
      };
    }
    return { allowed: true };
  }
  
  // Members can create/read/update but not delete or archive
  if (role === "member") {
    if (action === "delete" || action === "archive") {
      return {
        allowed: false,
        reason: "Members cannot delete or archive resources",
      };
    }
    if (action === "publish" && resource !== "deliverable") {
      return {
        allowed: false,
        reason: "Members can only publish their own deliverables",
      };
    }
    return { allowed: true };
  }
  
  // Viewers can only read
  if (role === "viewer") {
    if (action === "read") {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Viewers have read-only access",
    };
  }
  
  return { allowed: false, reason: "Unknown role" };
}

/**
 * Check if user has minimum role level.
 * 
 * Usage:
 * ```ts
 * if (hasMinRole(context.studio.role, "admin")) {
 *   // User is admin or owner
 * }
 * ```
 */
export function hasMinRole(
  userRole: TenantRole,
  requiredRole: TenantRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Require minimum role or throw.
 * 
 * Usage in server components:
 * ```ts
 * requireMinRole(context.studio.role, "admin");
 * ```
 */
export function requireMinRole(
  userRole: TenantRole,
  requiredRole: TenantRole,
  errorMessage?: string
): void {
  if (!hasMinRole(userRole, requiredRole)) {
    throw new Error(
      errorMessage || `Requires ${requiredRole} role or higher`
    );
  }
}

/**
 * Check if studio member can access a client's resources.
 * 
 * Rule: Studio members can access all clients within their studio.
 */
export function canAccessClient(
  context: TenantContext,
  clientId: string
): PermissionCheck {
  if (context.actorType !== "studioMember" || !context.studio) {
    return {
      allowed: false,
      reason: "Must be a studio member",
    };
  }
  
  // TODO: Once we have clients table, verify clientId belongs to studio
  // For now, allow access (will be enforced by RLS)
  return { allowed: true };
}

/**
 * Check if client user can access a project.
 * 
 * Rule: Client users can only access projects within their client.
 */
export function canAccessProject(
  context: TenantContext,
  projectId: string
): PermissionCheck {
  if (context.actorType === "studioMember") {
    // Studio members can access all projects in their studio
    return { allowed: true };
  }
  
  if (context.actorType === "clientUser" && context.client) {
    // TODO: Verify projectId belongs to client
    // For now, allow (will be enforced by RLS)
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: "No access to this project",
  };
}

