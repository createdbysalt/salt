/**
 * System Play Types
 *
 * Type definitions for the system plays infrastructure.
 * System plays are immutable core operations that all user plays compose from.
 *
 * Safety constraints:
 * - Entities: create, update, archive (NEVER delete)
 * - Links: link, unlink (simple add/remove)
 */

// ============================================================================
// Action Types
// ============================================================================

export type SystemPlayAction =
  | "create"
  | "update"
  | "archive"
  | "link"
  | "unlink"
  | "attach"
  | "classify";

export type SystemPlayTarget =
  | "person"
  | "org"
  | "work"
  | "playbook"
  | "player"
  | "space"
  | "note"
  | "conversation"
  | "email"
  | "file";

// ============================================================================
// System Play Registry
// ============================================================================

export interface SystemPlay {
  slug: string;
  name: string;
  description: string | null;
  target_entity: SystemPlayTarget;
  action_type: SystemPlayAction;
  input_schema: Record<string, unknown>;
  is_system: boolean;
  created_at: string;
}

// ============================================================================
// System Play Inputs (per slug)
// ============================================================================

// Person operations
export interface CreatePersonInput {
  name: string;
  email?: string;
  relationship_type?: RelationshipType;
}

export interface UpdatePersonInput {
  person_id: string;
  fields: Partial<{
    name: string;
    email: string;
    phone: string;
    title: string;
    notes: string;
    relationship_type: RelationshipType;
  }>;
}

export interface ArchivePersonInput {
  person_id: string;
  reason?: string;
}

export interface ClassifyPersonInput {
  person_id: string;
  relationship_type: RelationshipType;
}

// Org operations
export interface CreateOrgInput {
  name: string;
  domain?: string;
}

export interface UpdateOrgInput {
  org_id: string;
  fields: Partial<{
    name: string;
    domain: string;
    website: string;
    notes: string;
  }>;
}

export interface ArchiveOrgInput {
  org_id: string;
  reason?: string;
}

// Work operations
export interface CreateWorkInput {
  name: string;
  person_id?: string;
  org_id?: string;
}

export interface UpdateWorkInput {
  work_id: string;
  fields: Partial<{
    name: string;
    description: string;
    status: string;
  }>;
}

export interface ArchiveWorkInput {
  work_id: string;
  reason?: string;
}

// Link operations (graph edges)
export interface LinkPersonOrgInput {
  person_id: string;
  org_id: string;
}

export interface LinkPersonWorkInput {
  person_id: string;
  work_id: string;
}

export interface LinkPersonPersonInput {
  person_id: string;
  target_person_id: string;
}

export interface LinkPersonSpaceInput {
  person_id: string;
  space_id: string;
}

export interface LinkOrgWorkInput {
  org_id: string;
  work_id: string;
}

export interface LinkWorkSpaceInput {
  work_id: string;
  space_id: string;
}

// Attachment operations
export interface AttachEmailInput {
  email_id: string;
  target_type: "person" | "org" | "work";
  target_id: string;
}

export interface CreateNoteInput {
  content: string;
  target_type: "person" | "org" | "work" | "space";
  target_id: string;
}

// ============================================================================
// Relationship Types
// ============================================================================

export type RelationshipType =
  | "client"
  | "prospect"
  | "team"
  | "partner"
  | "vendor"
  | "personal"
  | "unknown";

// ============================================================================
// Execution Result
// ============================================================================

export interface SystemPlayResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  entity_id?: string;
  entity_type?: SystemPlayTarget;
}

// ============================================================================
// System Play Slugs (type-safe)
// ============================================================================

export type SystemPlaySlug =
  // Person
  | "system:create-person"
  | "system:update-person"
  | "system:archive-person"
  | "system:classify-person"
  // Org
  | "system:create-org"
  | "system:update-org"
  | "system:archive-org"
  // Work
  | "system:create-work"
  | "system:update-work"
  | "system:archive-work"
  // Playbook
  | "system:create-playbook"
  | "system:update-playbook"
  | "system:archive-playbook"
  // Player
  | "system:create-player"
  | "system:update-player"
  | "system:archive-player"
  // Space
  | "system:create-space"
  | "system:update-space"
  | "system:archive-space"
  // Note & Conversation
  | "system:create-note"
  | "system:create-conversation"
  // Attachments
  | "system:attach-email"
  // Links
  | "system:link-person-org"
  | "system:unlink-person-org"
  | "system:link-person-work"
  | "system:unlink-person-work"
  | "system:link-person-person"
  | "system:unlink-person-person"
  | "system:link-person-space"
  | "system:unlink-person-space"
  | "system:link-org-work"
  | "system:unlink-org-work"
  | "system:link-work-space"
  | "system:unlink-work-space";
