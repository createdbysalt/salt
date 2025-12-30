/**
 * Tenancy Types
 * 
 * Core type definitions for multi-tenant architecture.
 * These types are used throughout the application to ensure type-safe tenant context.
 */

export type ActorType = "studioMember" | "clientUser" | "anonymous";

export type TenantRole = "owner" | "admin" | "member" | "viewer";

/**
 * Base tenant context that every authenticated request must resolve to.
 * This is the "source of truth" for who is making a request and what they can access.
 */
export interface TenantContext {
  /** The type of actor making the request */
  actorType: ActorType;
  
  /** The authenticated user ID from Supabase auth.users */
  userId: string | null;
  
  /** Studio context (for studio members) */
  studio: {
    id: string;
    role: TenantRole;
  } | null;
  
  /** Client context (for client users) */
  client: {
    id: string;
    role: TenantRole;
    portalId: string; // The bridge_portal.id for this client
  } | null;
  
  /** Request metadata */
  metadata: {
    host: string;
    path: string;
    userAgent: string | null;
  };
}

/**
 * Studio member details (expanded from TenantContext)
 */
export interface StudioMember {
  id: string;
  userId: string;
  studioId: string;
  role: TenantRole;
  email: string;
  createdAt: Date;
}

/**
 * Client user details (expanded from TenantContext)
 */
export interface ClientUser {
  id: string;
  userId: string;
  clientId: string;
  role: TenantRole;
  email: string;
  createdAt: Date;
}

/**
 * Tenant resolution result
 * Used by middleware and server components to determine routing/access
 */
export interface TenantResolution {
  context: TenantContext;
  /** Whether the request should be allowed to proceed */
  allowed: boolean;
  /** Redirect URL if not allowed or context requires redirect */
  redirectTo?: string;
  /** Error message if resolution failed */
  error?: string;
}

