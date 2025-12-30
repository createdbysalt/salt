/**
 * Permissions Types
 * 
 * Type definitions for role-based permissions and authorization checks.
 */

import type { TenantRole } from "../tenancy/types";

/**
 * Resource types in Salt Core
 */
export type ResourceType = 
  | "studio"
  | "client"
  | "project"
  | "deliverable"
  | "request"
  | "audit"
  | "invoice";

/**
 * Actions that can be performed on resources
 */
export type Action = 
  | "create"
  | "read"
  | "update"
  | "delete"
  | "publish"
  | "archive";

/**
 * Permission check result
 */
export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
}

/**
 * Role hierarchy (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};

