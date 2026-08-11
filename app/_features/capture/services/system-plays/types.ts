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
  phone?: string;
  billing_email?: string;
  timezone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  relationship_type?: RelationshipType;
  relationship_status?: "prospect" | "client" | "past_client" | "partner" | "vendor" | "other";
  created_via?: "manual" | "system_play" | "bootstrap" | "import" | "ask_salt";
  last_contact_at?: string;
  first_contact_at?: string;
}

export interface UpdatePersonInput {
  person_id: string;
  fields: Partial<{
    name: string;
    email: string;
    phone: string;
    billing_email: string;
    timezone: string;
    title: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    notes: string;
    relationship_type: RelationshipType;
    last_contact_at: string;
    first_contact_at: string;
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
  website?: string;
  billing_email?: string;
  industry?: string;
  industry_parent?: string;
  industry_child?: string;
  estimated_company_size?: string;
  estimated_budget_tier?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  last_contact_at?: string;
  notes?: string;
}

export interface UpdateOrgInput {
  org_id: string;
  fields: Partial<{
    name: string;
    domain: string;
    website: string;
    billing_email: string;
    industry: string;
    industry_parent: string;
    industry_child: string;
    estimated_company_size: string;
    estimated_budget_tier: string;
    address_line_1: string;
    address_line_2: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    last_contact_at: string;
    notes: string;
  }>;
}

export interface ArchiveOrgInput {
  org_id: string;
  reason?: string;
}

// Work types
export type WorkType = "project" | "retainer" | "hourly" | "event" | "other";
export type WorkPaymentType = "fixed" | "hourly" | "retainer" | "milestone" | "other";
export type WorkPaymentTerms = "net_7" | "net_14" | "net_30" | "net_60" | "due_on_receipt" | "custom";
export type WorkBillingCycle = "weekly" | "biweekly" | "monthly" | "quarterly" | "annually" | "one_time";

// Work operations
export interface CreateWorkInput {
  name: string;
  person_id?: string;
  org_id?: string;
  description?: string;
  work_type?: WorkType;
  status?: string;
  deadline?: string;
  start_date?: string;
  contract_value_cents?: number;
  base_price_cents?: number;
  currency?: string;
  hourly_rate_cents?: number;
  hours_estimate?: number;
  payment_type?: WorkPaymentType;
  payment_terms?: WorkPaymentTerms;
  billing_cycle?: WorkBillingCycle;
  retainer_mrr_cents?: number;
  po_number?: string;
  is_bundle?: boolean;
  value_proposition?: string;
  deliverables?: string;
  prerequisites?: string;
  differentiators?: string;
}

export interface UpdateWorkInput {
  work_id: string;
  fields: Partial<{
    name: string;
    description: string;
    status: string;
    work_type: WorkType;
    deadline: string;
    start_date: string;
    contract_value_cents: number;
    base_price_cents: number;
    currency: string;
    hourly_rate_cents: number;
    hours_estimate: number;
    hours_logged: number;
    payment_type: WorkPaymentType;
    payment_terms: WorkPaymentTerms;
    billing_cycle: WorkBillingCycle;
    retainer_mrr_cents: number;
    po_number: string;
    is_bundle: boolean;
    value_proposition: string;
    deliverables: string;
    prerequisites: string;
    differentiators: string;
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

// Blocker operations
export interface CreateBlockerInput {
  work_id: string;
  blocker_type:
    | "awaiting_reply"
    | "meeting_cancelled"
    | "approval_pending"
    | "asset_pending"
    | "payment_pending"
    | "dependency"
    | "resource_unavailable"
    | "custom";
  title: string;
  detail?: string;
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

// Meeting operations (capture-based - for calendar sync)
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

// Manual meeting operations (meetings table - for Ask Salt)
export interface CreateClientMeetingInput {
  title: string;
  /** Person ID from memory_find_people - the client/contact for this meeting */
  person_id: string;
  /** Optional person name if creating alongside */
  person_name?: string;
  /** Meeting type - defaults to 'other' */
  meeting_type?: "discovery" | "check-in" | "review" | "kickoff" | "other";
  /** ISO datetime for meeting start */
  start_time: string;
  /** ISO datetime for meeting end - defaults to 30 min after start */
  end_time?: string;
  /** How the meeting will be held - defaults to 'google-meet' */
  location_type?: "google-meet" | "zoom" | "phone" | "in-person" | "custom";
  /** Meeting URL if virtual */
  meeting_url?: string;
  /** Optional description */
  description?: string;
  /** Optional work/project ID to link to */
  work_id?: string;
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

// Billing operations
export type BillingDirection = "receivable" | "payable";
export type BillingStatus = "draft" | "due" | "overdue" | "paid" | "partial";
export type BillingCategory = "contractor" | "software" | "other";

export interface CreateBillingInput {
  direction: BillingDirection;
  amount_cents: number;
  currency?: string;
  status?: BillingStatus;
  category?: BillingCategory;
  vendor_label?: string;
  number?: string;
  due_at?: string;
  issued_at?: string;
  paid_at?: string;
  person_id?: string;
  organization_id?: string;
  work_id?: string;
  tags?: string[];
  /**
   * Hosted invoice/bill page (Stripe hosted_invoice_url et al.). When
   * present, creation also attaches a link Resource to the record
   * (artifact-first) and this column stays a projection of it.
   */
  app_url?: string;
}

export interface UpdateBillingInput {
  billing_id: string;
  fields: Partial<{
    amount_cents: number;
    amount_paid_cents: number;
    currency: string;
    status: BillingStatus;
    category: BillingCategory;
    vendor_label: string;
    number: string;
    due_at: string;
    issued_at: string;
    paid_at: string;
    tags: string[];
  }>;
}

export interface ArchiveBillingInput {
  billing_id: string;
  reason?: string;
}

// File operations
export type FileCategory = "brand_asset" | "deliverable" | "contract" | "screenshot" | "invoice" | "proposal" | "reference" | "media" | "notes" | "process" | "other";
export type FileDirection = "from_client" | "to_client" | "internal";

export interface CreateFileRecordInput {
  file_name: string;
  external_url?: string;
  category?: FileCategory;
  description?: string;
  document_type?: string;
  direction?: FileDirection;
  due_date?: string;
  expiry_date?: string;
  follow_up_date?: string;
  total_amount_cents?: number;
  currency?: string;
  shared_with_client?: boolean;
  is_operator_asset?: boolean;
  person_id?: string;
  organization_id?: string;
}

export interface UpdateFileRecordInput {
  file_id: string;
  fields: Partial<{
    file_name: string;
    description: string;
    category: FileCategory;
    document_type: string;
    direction: FileDirection;
    due_date: string;
    expiry_date: string;
    follow_up_date: string;
    total_amount_cents: number;
    currency: string;
    shared_with_client: boolean;
    is_operator_asset: boolean;
    lifecycle_status: string;
  }>;
}

export interface ArchiveFileRecordInput {
  file_id: string;
  reason?: string;
}

// Me / Operator fact operations
export type OperatorFactCategory = "identity" | "business" | "preference" | "goal" | "voice" | "relationship";
export type OperatorFactKind = "fact" | "preference" | "procedure";
export type OperatorFactScope = "global" | "person" | "org" | "topic";
export type OperatorFactStatus = "proposed" | "confirmed" | "dismissed";

export interface CreateMeFactInput {
  value: string;
  label?: string;
  category?: OperatorFactCategory;
  kind?: OperatorFactKind;
  scope_type?: OperatorFactScope;
  scope_value?: string;
  status?: OperatorFactStatus;
  confidence?: number;
}

export interface UpdateMeFactInput {
  fact_id: string;
  fields: Partial<{
    value: string;
    label: string;
    category: OperatorFactCategory;
    kind: OperatorFactKind;
    scope_type: OperatorFactScope;
    scope_value: string;
    status: OperatorFactStatus;
    confidence: number;
  }>;
}

export interface ArchiveMeFactInput {
  fact_id: string;
  reason?: string;
}

// Tag operations
export type TagEntityType = "person" | "org" | "work" | "billing" | "resource";
export type TagScope = "person" | "org" | "work" | "billing" | "resource" | "all";
export type TagCategory = "segment" | "signal" | "priority" | "custom";

export interface AssignTagInput {
  entity_type: TagEntityType;
  entity_id: string;
  tag_label: string;
  because?: string;
}

export interface UnassignTagInput {
  entity_type: TagEntityType;
  entity_id: string;
  tag_label: string;
}

export interface CreateTagInput {
  label: string;
  scope?: TagScope;
  category?: TagCategory;
  description?: string;
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
  /**
   * In-memory canon spelling. `SystemPlayTarget` mirrors the
   * `system_play_target` DB enum, which still says `file` — resource plays
   * report `resource` here (the enum itself is a separate migration).
   */
  entity_type?: SystemPlayTarget | "resource";
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
  // Meeting (capture-based)
  | "system:create-meeting"
  | "system:update-meeting"
  | "system:archive-meeting"
  // Meeting (manual - meetings table)
  | "system:create-client-meeting"
  // Invoice (legacy)
  | "system:create-invoice"
  | "system:update-invoice"
  | "system:archive-invoice"
  | "system:record-payment"
  // Billing (billing_records table)
  | "system:create-billing"
  | "system:update-billing"
  | "system:archive-billing"
  // Me / Operator facts
  | "system:create-me-fact"
  | "system:update-me-fact"
  | "system:archive-me-fact"
  // Tags
  | "system:assign-tag"
  | "system:unassign-tag"
  | "system:create-tag"
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
  // Blocker
  | "system:add-blocker"
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
