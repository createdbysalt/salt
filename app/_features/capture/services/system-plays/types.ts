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
  | "file"
  | "meeting"
  | "invoice"
  | "payment";

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
  title?: string;
  relationship_type?: RelationshipType;
  relationship_status?: "prospect" | "client" | "past_client" | "partner" | "vendor" | "other";
  created_via?: "manual" | "system_play" | "bootstrap" | "import" | "ask_salt";
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
    deadline: string;
    start_date: string;
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

// File operations
export interface CreateFileInput {
  name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
  source?: string;
}

export interface UpdateFileInput {
  file_id: string;
  fields: Partial<{
    name: string;
    url: string;
    mime_type: string;
  }>;
}

export interface ArchiveFileInput {
  file_id: string;
  reason?: string;
}

// Meeting operations
export interface CreateMeetingInput {
  title: string;
  start_at: string;
  end_at?: string;
  location?: string;
  calendar_id?: string;
  /** Optional Gmail capture this meeting was inferred from */
  source_capture_id?: string;
  /** Idempotency key for memory-plan creates */
  external_id?: string;
}

export interface UpdateMeetingInput {
  meeting_id: string;
  fields: Partial<{
    title: string;
    start_at: string;
    end_at: string;
    location: string;
    notes: string;
  }>;
}

export interface ArchiveMeetingInput {
  meeting_id: string;
  reason?: string;
}

// Invoice/Payment operations
export interface CreateInvoiceInput {
  person_id?: string;
  org_id?: string;
  amount_cents: number;
  currency: string;
  description?: string;
  due_at?: string;
}

export interface UpdateInvoiceInput {
  invoice_id: string;
  fields: Partial<{
    amount_cents: number;
    description: string;
    due_at: string;
    status: string;
  }>;
}

export interface ArchiveInvoiceInput {
  invoice_id: string;
  reason?: string;
}

export interface RecordPaymentInput {
  person_id?: string;
  org_id?: string;
  invoice_id?: string;
  amount_cents: number;
  currency: string;
  paid_at: string;
  source?: string;
}

// File links
export interface LinkFilePersonInput {
  file_id: string;
  person_id: string;
}

export interface LinkFileOrgInput {
  file_id: string;
  org_id: string;
}

export interface LinkFileWorkInput {
  file_id: string;
  work_id: string;
}

// Meeting links
export interface LinkMeetingPersonInput {
  meeting_id: string;
  person_id: string;
  role?: string;
}

export interface LinkMeetingOrgInput {
  meeting_id: string;
  org_id: string;
}

export interface LinkMeetingWorkInput {
  meeting_id: string;
  work_id: string;
}

// Invoice links
export interface LinkInvoicePersonInput {
  invoice_id: string;
  person_id: string;
}

export interface LinkInvoiceOrgInput {
  invoice_id: string;
  org_id: string;
}

export interface LinkInvoiceWorkInput {
  invoice_id: string;
  work_id: string;
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
  error_id?: string;
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
  // File
  | "system:create-file"
  | "system:update-file"
  | "system:archive-file"
  // Meeting
  | "system:create-meeting"
  | "system:update-meeting"
  | "system:archive-meeting"
  // Invoice
  | "system:create-invoice"
  | "system:update-invoice"
  | "system:archive-invoice"
  | "system:record-payment"
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
  // Person links
  | "system:link-person-org"
  | "system:unlink-person-org"
  | "system:link-person-work"
  | "system:unlink-person-work"
  | "system:link-person-person"
  | "system:unlink-person-person"
  | "system:link-person-space"
  | "system:unlink-person-space"
  // Org links
  | "system:link-org-work"
  | "system:unlink-org-work"
  // Work links
  | "system:link-work-space"
  | "system:unlink-work-space"
  // File links
  | "system:link-file-person"
  | "system:unlink-file-person"
  | "system:link-file-org"
  | "system:unlink-file-org"
  | "system:link-file-work"
  | "system:unlink-file-work"
  // Meeting links
  | "system:link-meeting-person"
  | "system:unlink-meeting-person"
  | "system:link-meeting-org"
  | "system:unlink-meeting-org"
  | "system:link-meeting-work"
  | "system:unlink-meeting-work"
  // Invoice links
  | "system:link-invoice-person"
  | "system:link-invoice-org"
  | "system:link-invoice-work";
