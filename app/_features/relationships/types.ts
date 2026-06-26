// ============================================================================
// Entity Architecture Types
// New unified model for People + Organizations
// ============================================================================

/**
 * Relationship status replaces the old lifecycle_stage concept.
 * "Client" is now a status, not an entity type.
 */
export type RelationshipStatus =
  | "prospect"
  | "client"
  | "past_client"
  | "partner"
  | "vendor"
  | "other";

/**
 * Maps old lifecycle stages to new relationship statuses.
 * Used during migration and backwards compatibility.
 */
export const LIFECYCLE_TO_RELATIONSHIP_MAP: Record<string, RelationshipStatus> = {
  lead: "prospect",
  discovery: "prospect",
  pitch: "prospect",
  prospect: "prospect",
  active: "client",
  client: "client",
  complete: "past_client",
  "on-hold": "past_client",
  on_hold: "past_client",
  lost: "other",
};

// ============================================================================
// Organization (External Company)
// ============================================================================

export interface Organization {
  id: string;
  workspaceId: string;
  name: string;
  slug: string | null;
  relationshipStatus: RelationshipStatus;
  website: string | null;
  industry: string | null;
  address: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  migratedFromClientId: string | null;
  // Joined data (populated by queries)
  people?: Person[];
  primaryContact?: Person;
}

export interface OrganizationRow {
  id: string;
  workspace_id: string;
  name: string;
  slug: string | null;
  relationship_status: RelationshipStatus;
  website: string | null;
  industry: string | null;
  address: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  migrated_from_client_id: string | null;
}

// ============================================================================
// Person (External Contact)
// ============================================================================

export interface Person {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  relationshipStatus: RelationshipStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  avatarUrl: string | null;
  portalUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  migratedFromClientId: string | null;
  migratedFromClientUserId: string | null;
  // Joined data (populated by queries)
  organizations?: OrganizationMembership[];
}

export interface PersonRow {
  id: string;
  workspace_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  relationship_status: RelationshipStatus;
  notes: string | null;
  metadata: Record<string, unknown>;
  avatar_url: string | null;
  portal_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  migrated_from_client_id: string | null;
  migrated_from_client_user_id: string | null;
}

// ============================================================================
// Organization-Person Junction
// ============================================================================

export interface OrganizationPerson {
  id: string;
  organizationId: string;
  personId: string;
  role: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

export interface OrganizationPersonRow {
  id: string;
  organization_id: string;
  person_id: string;
  role: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string | null;
  isPrimary: boolean;
}

// ============================================================================
// Team (Internal Group)
// ============================================================================

export interface Team {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Joined data
  members?: TeamMember[];
  memberCount?: number;
}

export interface TeamRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Team Member Junction
// ============================================================================

export interface TeamMember {
  id: string;
  teamId: string;
  studioMemberId: string;
  role: string | null;
  createdAt: Date;
  // Joined data
  member?: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface TeamMemberRow {
  id: string;
  team_id: string;
  studio_member_id: string;
  role: string | null;
  created_at: string;
}

// ============================================================================
// Entity Relations (Obsidian-style linking)
// ============================================================================

export type EntityType =
  | "person"
  | "organization"
  | "project"
  | "note"
  | "message"
  | "file";

export type RelationType =
  | "works_at"
  | "contact_for"
  | "related_to"
  | "mentioned_in"
  | "parent_of"
  | "referred_by";

export interface EntityRelation {
  id: string;
  workspaceId: string;
  fromEntityType: EntityType;
  fromEntityId: string;
  toEntityType: EntityType;
  toEntityId: string;
  relationType: RelationType | null;
  context: string | null;
  createdAt: Date;
  createdBy: string | null;
}

export interface EntityRelationRow {
  id: string;
  workspace_id: string;
  from_entity_type: EntityType;
  from_entity_id: string;
  to_entity_type: EntityType;
  to_entity_id: string;
  relation_type: RelationType | null;
  context: string | null;
  created_at: string;
  created_by: string | null;
}

// ============================================================================
// Row → Domain Transformers
// ============================================================================

export function transformOrganizationRow(row: OrganizationRow): Organization {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    slug: row.slug,
    relationshipStatus: row.relationship_status,
    website: row.website,
    industry: row.industry,
    address: row.address,
    notes: row.notes,
    metadata: row.metadata,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    migratedFromClientId: row.migrated_from_client_id,
  };
}

export function transformPersonRow(row: PersonRow): Person {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    title: row.title,
    relationshipStatus: row.relationship_status,
    notes: row.notes,
    metadata: row.metadata,
    avatarUrl: row.avatar_url,
    portalUserId: row.portal_user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
    migratedFromClientId: row.migrated_from_client_id,
    migratedFromClientUserId: row.migrated_from_client_user_id,
  };
}

export function transformTeamRow(row: TeamRow): Team {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    color: row.color,
    icon: row.icon,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================================
// Backwards Compatibility Types
// ============================================================================

/**
 * Legacy Client type for backwards compatibility.
 * Maps to either Organization or Person depending on client_type.
 * @deprecated Use Organization or Person directly
 */
export interface LegacyClient {
  id: string;
  workspaceId: string;
  name: string;
  clientType: "individual" | "organization";
  contactEmail: string | null;
  contactPhone: string | null;
  lifecycleStage: string;
  notes: string | null;
  // Maps to the new entity
  entityId?: string;
  entityType?: "person" | "organization";
}

/**
 * Unified entity type for list views that show both people and organizations.
 */
export interface RelationshipEntity {
  id: string;
  entityType: "person" | "organization";
  name: string;
  relationshipStatus: RelationshipStatus;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Organization-specific
  website?: string | null;
  industry?: string | null;
  // Person-specific
  title?: string | null;
  avatarUrl?: string | null;
  hasPortalAccess?: boolean;
  // Joined data
  organizationName?: string | null;
  primaryContactName?: string | null;
}
