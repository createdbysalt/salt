
/**
 * Auth Feature - Query Functions
 *
 * Authentication and authorization queries.
 * Re-exports from the tenancy module for consistent auth access.
 *
 * Usage:
 *   import { getTenantContext } from '@/app/_features/auth/queries'
 */

// Tenant context resolution
export { getTenantContext } from "@/app/_lib/tenancy/context";

// Auth guards
export {
  requireStudioMember,
  requireClientUser,
  requireAuth,
  requireActorType,
} from "@/app/_lib/tenancy/guards";

// Types
export type {
  TenantContext,
  TenantResolution,
  ActorType,
  TenantRole,
} from "@/app/_lib/tenancy/types";
