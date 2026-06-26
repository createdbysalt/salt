/**
 * Tenancy Types
 *
 * Core type definitions for multi-tenant architecture.
 * These types are used throughout the application to ensure type-safe tenant context.
 */

export type ActorType = "workspaceMember" | "studioMember" | "clientUser" | "anonymous";

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

  /** Workspace context (for workspace members) */
  workspace: {
    id: string;
    role: TenantRole;
  } | null;

  /** Studio context (deprecated alias for workspace during the rename window) */
  studio: {
    id: string;
    role: TenantRole;
  } | null;

  /** Client context (for client users) - the currently active client */
  client: {
    id: string;
    role: TenantRole;
    portalId: string; // The bridge_portal.id for this client
  } | null;

  /** All client memberships (for multi-client users) */
  clientMemberships?: Array<{
    clientId: string;
    clientName: string;
    role: TenantRole;
    portalId: string;
    workspaceId: string; // For disambiguating cross-workspace memberships
    /** @deprecated Use workspaceId. */
    studioId?: string;
  }>;

  /** Whether client selection is needed (2+ memberships, no valid active client) */
  needsClientSelection?: boolean;

  /** Request metadata */
  metadata: {
    host: string;
    path: string;
    userAgent: string | null;
  };
}

/**
 * Deprecated tenant member alias retained for older imports.
 */
export type StudioMember = WorkspaceMember;

/**
 * Product-facing tenant member details.
 */
export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
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
