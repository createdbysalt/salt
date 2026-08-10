import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";

export type ProfilePlaybookKind = "acting" | "profile";

export type ProfileEntityType =
  | "person"
  | "organization"
  | "work"
  | "operator"
  | "workspace"
  | "billing_record"
  | "meeting"
  | "resource";

export type PersonProfileFieldKey =
  | "name"
  | "relationship_type"
  | "title"
  | "org_link"
  | "email"
  | "phone"
  | "billing_email"
  | "timezone"
  | "last_contact_at"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "postal_code"
  | "country";

export type OrgProfileFieldKey =
  | "name"
  | "website"
  | "industry"
  | "industry_parent"
  | "industry_child"
  | "relationship_status"
  | "key_contact"
  | "billing_email"
  | "last_contact_at"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "postal_code"
  | "country"
  | "tax_id";

export type WorkProfileFieldKey =
  | "name"
  | "status"
  | "description"
  | "deadline"
  | "start_date"
  | "service_id"
  | "work_type"
  | "stage"
  | "contract_value_cents"
  | "payment_type"
  | "payment_terms"
  | "currency"
  | "hourly_rate_cents"
  | "hours_estimate"
  | "retainer_mrr_cents"
  | "renewal_date"
  | "billing_cycle"
  | "billing_contact_id"
  | "po_number"
  | "estimated_timeline"
  | "discount_percent"
  | "discount_amount_cents"
  | "discount_reason"
  | "final_price_cents"
  | "organization_id"
  | "person_id";

/** Me — operator identity fields persisted on `profiles` (keeper-field-contracts 6.5). */
export type OperatorProfileFieldKey =
  | "display_name"
  | "role_title"
  | "tagline"
  | "timezone"
  | "location"
  | "working_hours"
  | "current_focus"
  | "email_signature"
  | "phone"
  | "gender"
  | "preferred_name"
  | "professional_credentials"
  | "address_line1"
  | "address_line2"
  | "city"
  | "state"
  | "postal_code"
  | "country";

/** Me — business fields persisted on `workspaces` (keeper-field-contracts 6.5). */
export type WorkspaceProfileFieldKey =
  | "name"
  | "slug"
  | "tagline"
  | "description"
  | "website_url"
  | "location"
  | "industry"
  | "team_size"
  | "founded_year"
  | "social_links"
  | "legal_business_name"
  | "business_type"
  | "legal_address"
  | "business_phone"
  | "business_email"
  | "tax_id_type"
  | "tax_id_last4"
  | "default_currency"
  | "payment_terms"
  | "legal_address_line1"
  | "legal_address_line2"
  | "legal_city"
  | "legal_state"
  | "legal_postal_code"
  | "legal_country";

/** Billing — inline-editable billing_records fields (updateBillingRecordField). */
export type BillingRecordProfileFieldKey =
  | "number"
  | "status"
  | "amount"
  | "amountPaid"
  | "currency"
  | "issuedAt"
  | "dueAt"
  | "paidAt"
  | "organizationId"
  | "personId"
  | "projectId";

/** Meeting — fields managed by Memory Records (memory-records:meeting). */
export type MeetingProfileFieldKey =
  | "status"
  | "meeting_type"
  | "location_type"
  | "meeting_url"
  | "organizationId"
  | "personId"
  | "workId";

/** File — fields managed by Memory Records (memory-records:file). */
export type FileProfileFieldKey =
  | "category"
  | "document_type"
  | "lifecycle_status"
  | "due_date"
  | "expiry_date"
  | "signed_date"
  | "organizationId"
  | "personId"
  | "workId";

export type ProfileFieldKey =
  | PersonProfileFieldKey
  | OrgProfileFieldKey
  | WorkProfileFieldKey
  | OperatorProfileFieldKey
  | WorkspaceProfileFieldKey
  | BillingRecordProfileFieldKey
  | MeetingProfileFieldKey
  | FileProfileFieldKey
  | NoteProfileFieldKey
  | OperatorFactProfileFieldKey;

export type ProfileProvenanceSource = "rule" | "ai_fallback" | "manual";

export type ProfileProvenanceStatus = "applied" | "pending";

export const PROFILE_RELATIONSHIP_VALUES: readonly RelationshipType[] = [
  "client",
  "prospect",
  "team",
  "partner",
  "vendor",
  "personal",
  "unknown",
];

export type OrgRelationshipStatus =
  | "prospect"
  | "client"
  | "past_client"
  | "partner"
  | "vendor"
  | "other";

export const PROFILE_ORG_RELATIONSHIP_VALUES: readonly OrgRelationshipStatus[] = [
  "prospect",
  "client",
  "past_client",
  "partner",
  "vendor",
  "other",
];

export type WorkStatusValue =
  | "draft"
  | "signed"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";

export const PROFILE_WORK_STATUS_VALUES: readonly WorkStatusValue[] = [
  "draft",
  "signed",
  "active",
  "on_hold",
  "completed",
  "archived",
];

export type BillingStatusValue =
  | "draft"
  | "due"
  | "overdue"
  | "paid"
  | "partial"
  | "refunded"
  | "disputed";

export const PROFILE_BILLING_STATUS_VALUES: readonly BillingStatusValue[] = [
  "draft",
  "due",
  "overdue",
  "paid",
  "partial",
  "refunded",
  "disputed",
];

export type MeetingStatusValue =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no-show";

export const PROFILE_MEETING_STATUS_VALUES: readonly MeetingStatusValue[] = [
  "scheduled",
  "completed",
  "cancelled",
  "no-show",
];

export type MeetingTypeValue =
  | "discovery"
  | "kickoff"
  | "check-in"
  | "review"
  | "presentation"
  | "workshop"
  | "interview"
  | "other";

export const PROFILE_MEETING_TYPE_VALUES: readonly MeetingTypeValue[] = [
  "discovery",
  "kickoff",
  "check-in",
  "review",
  "presentation",
  "workshop",
  "interview",
  "other",
];

export type FileCategoryValue =
  | "brand_asset"
  | "deliverable"
  | "contract"
  | "invoice"
  | "proposal"
  | "reference"
  | "media"
  | "notes"
  | "process"
  | "screenshot"
  | "other";

export const PROFILE_FILE_CATEGORY_VALUES: readonly FileCategoryValue[] = [
  "brand_asset",
  "deliverable",
  "contract",
  "invoice",
  "proposal",
  "reference",
  "media",
  "notes",
  "process",
  "screenshot",
  "other",
];

export type FileLifecycleValue =
  | "draft"
  | "sent"
  | "viewed"
  | "awaiting_signature"
  | "signed"
  | "expired"
  | "archived";

export const PROFILE_FILE_LIFECYCLE_VALUES: readonly FileLifecycleValue[] = [
  "draft",
  "sent",
  "viewed",
  "awaiting_signature",
  "signed",
  "expired",
  "archived",
];

export const PROFILE_SIGNAL_OPS = ["eq", "neq", "exists", "not_exists", "gte"] as const;

export type ProfileSignalOp = (typeof PROFILE_SIGNAL_OPS)[number];

export const PERSON_PROFILE_SIGNAL_KEYS = [
  "person_created",
  "person_updated",
  "has_payment_received",
  "has_stripe_payment",
  "has_invoice_sent",
  "is_bidirectional_thread",
  "you_initiated",
  "has_calendar_meeting",
  "has_signature",
  "email_count",
  "email_domain_is_personal",
  "email_domain_matches_workspace",
  "email_domain_in_partner_list",
  "email_domain_in_vendor_list",
  "person_no_contact_30_days",
  "person_appears_in_multiple_orgs",
  // Duplicate detection
  "person_duplicate_email",
  "person_duplicate_phone",
  "person_name_fuzzy_match",
  "person_same_name_same_org",
  // Hygiene
  "person_missing_email",
  "person_missing_relationship_type",
  "person_missing_org",
  "person_no_activity_30d",
  "person_no_activity_60d",
  "person_no_activity_90d",
  "person_no_activity_180d",
  "person_orphan",
] as const;

export type PersonProfileSignalKey = (typeof PERSON_PROFILE_SIGNAL_KEYS)[number];

export const ORG_PROFILE_SIGNAL_KEYS = [
  "org_created",
  "org_updated",
  "org_domain_known",
  "org_created_from_domain",
  "org_has_payment_received",
  "org_has_invoice_sent",
  "org_has_primary_contact",
  "org_has_people",
  "org_domain_in_partner_list",
  "org_domain_in_vendor_list",
  "inferred_industry",
  "inferred_industry_parent",
  "inferred_industry_child",
  // Duplicate detection
  "org_duplicate_domain",
  "org_name_fuzzy_match",
  "org_same_billing_email",
  // Hygiene
  "org_missing_domain",
  "org_missing_industry",
  "org_missing_key_contact",
  "org_missing_primary_contact",
  "org_no_activity_90d",
  "org_no_activity_180d",
] as const;

export type OrgProfileSignalKey = (typeof ORG_PROFILE_SIGNAL_KEYS)[number];

export const WORK_PROFILE_SIGNAL_KEYS = [
  "work_created",
  "work_updated",
  "work_has_signed_contract",
  "work_has_kickoff",
  "work_is_blocked",
  "work_has_completed_deliverable",
  "work_has_due_date",
  "inferred_description",
  "inferred_deadline",
  "inferred_start_date",
  // Duplicate detection
  "work_duplicate_name_same_org",
  "work_duplicate_po_number",
  // Hygiene
  "work_missing_client",
  "work_missing_status",
  "work_missing_deadline",
  "work_missing_value",
  "work_stale_active",
  "work_no_activity_60d",
  "work_orphan",
] as const;

export type WorkProfileSignalKey = (typeof WORK_PROFILE_SIGNAL_KEYS)[number];

export const BILLING_PROFILE_SIGNAL_KEYS = [
  "billing_created",
  "billing_updated",
  "billing_payment_matched",
  "billing_amount_paid_covers_total",
  "billing_due_date_passed",
  "billing_party_email_match",
  "billing_party_customer_id_match",
  "inferred_organization_id",
  "inferred_person_id",
  "inferred_work_id",
  // Duplicate detection
  "billing_duplicate_number",
  "billing_duplicate_amount_date",
  // Hygiene
  "billing_missing_party",
  "billing_missing_due_date",
  "billing_overdue_90d",
  "billing_orphan",
] as const;

export type BillingProfileSignalKey = (typeof BILLING_PROFILE_SIGNAL_KEYS)[number];

export const MEETING_PROFILE_SIGNAL_KEYS = [
  "meeting_created",
  "meeting_updated",
  "meeting_synced_from_calendar",
  "meeting_end_passed",
  "meeting_has_attendance_evidence",
  "meeting_cancelled_by_calendar",
  "meeting_attendee_email_match",
  "inferred_meeting_type",
  // Duplicate detection
  "meeting_duplicate_time_attendees",
  // Hygiene
  "meeting_missing_attendees",
  "meeting_past_no_outcome",
] as const;

export type MeetingProfileSignalKey = (typeof MEETING_PROFILE_SIGNAL_KEYS)[number];

export const FILE_PROFILE_SIGNAL_KEYS = [
  "file_signature_event_sent",
  "file_signature_event_viewed",
  "file_signature_event_signed",
  "file_signature_event_expired",
  "file_source_context_match",
  "inferred_category",
  "inferred_document_type",
  "inferred_due_date",
  "inferred_expiry_date",
  "inferred_signed_date",
  // Duplicate detection
  "file_duplicate_hash",
  "file_duplicate_name_same_entity",
  // Hygiene
  "file_missing_category",
  "file_missing_linked_entity",
  "file_orphan",
] as const;

export type FileProfileSignalKey = (typeof FILE_PROFILE_SIGNAL_KEYS)[number];

/**
 * Capture signals — fired when capture extracts learnings from content.
 * These signals feed cross-cutting Memory Care capabilities like entity notes.
 */
export const CAPTURE_SIGNAL_KEYS = [
  "entity_learning_extracted",
  "capture_email_received",
  "capture_email_sent",
  "capture_meeting_completed",
  "capture_processed",
  "org_person_contacted",
  "note_created",
  "note_flagged",
  "preference_detected",
  "context_extracted",
  "connection_inferred",
  "connection_strengthened",
  "relationship_at_risk",
  "file_shared",
] as const;

export type CaptureSignalKey = (typeof CAPTURE_SIGNAL_KEYS)[number];

/**
 * Workspace-scoped signals — fired for workspace-level events rather than a
 * Memory entity. The emitted entity is the workspace itself.
 */
export const WORKSPACE_SIGNAL_KEYS = [
  "connector_connected",
] as const;

export type WorkspaceSignalKey = (typeof WORKSPACE_SIGNAL_KEYS)[number];

/**
 * Email Intelligence signals — fired when email classification detects patterns.
 * These signals enable inbox triage, priority sorting, and behavioral learning.
 */
export const EMAIL_INTELLIGENCE_SIGNAL_KEYS = [
  // Content classification signals
  "email_urgency_high",
  "email_deadline_mentioned",
  "email_money_amount_detected",
  "email_invoice_attached",
  "email_payment_link_detected",
  "email_question_asked",
  "email_action_requested",
  // Sender relationship signals
  "sender_first_contact",
  "sender_reply_expected",
  "sender_high_engagement",
  "sender_vip",
  // Thread signals
  "thread_stale_48h",
  "thread_awaiting_reply",
  // Category classification signals
  "email_classified_action_required",
  "email_classified_money_moves",
  "email_classified_opportunities",
  "email_classified_updates",
  "email_classified_subscribed",
  "email_classified_noise",
  // Behavioral feedback signals (fired on user action)
  "email_archived_fast",
  "email_archived_unread",
  "email_replied_fast",
  "email_snoozed",
  "email_marked_important",
  "email_training_more_like_this",
  "email_training_less_like_this",
] as const;

export type EmailIntelligenceSignalKey =
  (typeof EMAIL_INTELLIGENCE_SIGNAL_KEYS)[number];

/** Email category values for classification. */
export const EMAIL_CATEGORY_VALUES = [
  "action_required",
  "money_moves",
  "opportunities",
  "updates",
  "subscribed",
  "noise",
] as const;

export type EmailCategoryValue = (typeof EMAIL_CATEGORY_VALUES)[number];

/** Email priority tier values. */
export const EMAIL_PRIORITY_TIER_VALUES = [
  "urgent",
  "important",
  "normal",
  "low",
  "noise",
] as const;

export type EmailPriorityTierValue = (typeof EMAIL_PRIORITY_TIER_VALUES)[number];

/** Note — fields managed by Memory Care entity notes. */
export type NoteProfileFieldKey = "note_kind";

/** Operator fact — fields managed by Memory Care for operator_memory_facts. */
export type OperatorFactProfileFieldKey = "fact_category" | "fact_kind";

/** Operator fact category values (what domain the fact belongs to). */
export const OPERATOR_FACT_CATEGORY_VALUES = [
  "identity",
  "business",
  "preference",
  "goal",
  "voice",
  "relationship",
] as const;

export type OperatorFactCategoryValue = (typeof OPERATOR_FACT_CATEGORY_VALUES)[number];

/** Operator fact kind values (what type of knowledge this is). */
export const OPERATOR_FACT_KIND_VALUES = [
  "fact",
  "preference",
  "procedure",
] as const;

export type OperatorFactKindValue = (typeof OPERATOR_FACT_KIND_VALUES)[number];

/** Operator fact signals — pattern-based classification for operator memory facts. */
export const OPERATOR_FACT_SIGNAL_KEYS = [
  // Identity patterns
  "pattern_signature_block",
  "pattern_timezone_mention",
  "pattern_title_role",
  "pattern_name_correction",
  "pattern_phone_number",
  "pattern_address_mention",
  "pattern_credentials",
  // Business patterns
  "pattern_business_name",
  "pattern_legal_entity",
  "pattern_tax_context",
  "pattern_rate_pricing",
  "pattern_payment_terms",
  "pattern_currency_default",
  "pattern_business_address",
  // Preference patterns
  "pattern_communication_pref",
  "pattern_scheduling_pref",
  "pattern_workflow_pref",
  "pattern_tool_pref",
  // Voice patterns
  "pattern_voice_correction",
  "pattern_terminology_pref",
  "pattern_tone_indicator",
  // Relationship patterns
  "pattern_referral_source",
  "pattern_partnership_mention",
  "pattern_team_context",
] as const;

export type OperatorFactSignalKey = (typeof OPERATOR_FACT_SIGNAL_KEYS)[number];

/** Note extraction signals — pattern-based classification for entity notes. */
export const NOTE_PROFILE_SIGNAL_KEYS = [
  "pattern_employment",
  "pattern_location",
  "pattern_birthday",
  "pattern_education",
  "pattern_preference_explicit",
  "pattern_preference_negative",
  "pattern_preference_time",
  "pattern_context_milestone",
  "pattern_context_history",
  "pattern_relationship_referral",
  "pattern_relationship_connection",
  "pattern_relationship_family",
  "pattern_flag_silence",
  "pattern_flag_sentiment",
  "pattern_flag_risk",
  "pattern_flag_overdue",
] as const;

export type NoteProfileSignalKey = (typeof NOTE_PROFILE_SIGNAL_KEYS)[number];

export const NOTE_KIND_VALUES = [
  "fact",
  "preference",
  "context",
  "relationship",
  "flag",
] as const;

export type NoteKindValue = (typeof NOTE_KIND_VALUES)[number];

export const PROFILE_SIGNAL_KEYS = [
  ...PERSON_PROFILE_SIGNAL_KEYS,
  ...ORG_PROFILE_SIGNAL_KEYS,
  ...WORK_PROFILE_SIGNAL_KEYS,
  ...BILLING_PROFILE_SIGNAL_KEYS,
  ...MEETING_PROFILE_SIGNAL_KEYS,
  ...FILE_PROFILE_SIGNAL_KEYS,
  ...NOTE_PROFILE_SIGNAL_KEYS,
  ...OPERATOR_FACT_SIGNAL_KEYS,
  ...CAPTURE_SIGNAL_KEYS,
  ...EMAIL_INTELLIGENCE_SIGNAL_KEYS,
  ...WORKSPACE_SIGNAL_KEYS,
] as const;

export type ProfileSignalKey = (typeof PROFILE_SIGNAL_KEYS)[number];

export interface ProfileRuleCondition {
  signal: ProfileSignalKey;
  op: ProfileSignalOp;
  value?: string | number | boolean;
}

export interface ProfileFillRule {
  id: string;
  field: ProfileFieldKey;
  when: ProfileRuleCondition;
  set: {
    value: string;
  };
  confidence: number;
  because: string;
}

export interface ProfileFillRulesDocument {
  version: number;
  fields: ProfileFieldKey[];
  rules: ProfileFillRule[];
}

export interface ProfileContextFacts {
  workspace_domains?: string[];
  partner_domains?: string[];
  vendor_domains?: string[];
}

export interface ProfilePlaybookSettings {
  autoApplyThreshold: number;
  aiFallbackEnabled: boolean;
  contextFacts: ProfileContextFacts;
  fillRulesOverride: ProfileFillRulesDocument | null;
  activeSections: ProfileFieldKey[];
}

export type ProfileFactValue = string | number | boolean | null | undefined;

export interface ProfileFacts {
  [key: string]: ProfileFactValue;
}

export interface PersonProfileFacts extends ProfileFacts {
  email: string;
  has_payment_received?: boolean;
  has_stripe_payment?: boolean;
  has_invoice_sent?: boolean;
  is_bidirectional_thread?: boolean;
  you_initiated?: boolean;
  has_calendar_meeting?: boolean;
  has_signature?: boolean;
  email_count?: number;
  extracted_title?: string | null;
  org_domain?: string | null;
}

export interface OrgProfileFacts extends ProfileFacts {
  org_name: string;
  org_domain?: string | null;
  org_website?: string | null;
  inferred_industry?: string | null;
  inferred_industry_parent?: string | null;
  inferred_industry_child?: string | null;
  inferred_key_contact?: string | null;
  org_domain_known?: boolean;
  org_created_from_domain?: boolean;
  org_has_payment_received?: boolean;
  org_has_invoice_sent?: boolean;
  org_has_primary_contact?: boolean;
  org_has_people?: boolean;
  org_domain_in_partner_list?: boolean;
  org_domain_in_vendor_list?: boolean;
  org_missing_industry?: boolean;
  org_missing_key_contact?: boolean;
  org_duplicate_domain?: boolean;
}

export interface WorkProfileFacts extends ProfileFacts {
  work_name: string;
  current_status?: string | null;
  current_description?: string | null;
  current_deadline?: string | null;
  current_start_date?: string | null;
  inferred_description?: string | null;
  inferred_deadline?: string | null;
  inferred_start_date?: string | null;
  work_created?: boolean;
  work_has_signed_contract?: boolean;
  work_has_kickoff?: boolean;
  work_is_blocked?: boolean;
  work_has_completed_deliverable?: boolean;
  work_has_due_date?: boolean;
}

export interface BillingProfileFacts extends ProfileFacts {
  billing_number: string;
  current_status?: string | null;
  current_organization_id?: string | null;
  current_person_id?: string | null;
  current_work_id?: string | null;
  billing_payment_matched?: boolean;
  billing_amount_paid_covers_total?: boolean;
  billing_due_date_passed?: boolean;
  billing_party_email_match?: boolean;
  billing_party_customer_id_match?: boolean;
  inferred_organization_id?: string | null;
  inferred_person_id?: string | null;
  inferred_work_id?: string | null;
}

export interface MeetingProfileFacts extends ProfileFacts {
  meeting_title: string;
  current_status?: string | null;
  current_meeting_type?: string | null;
  current_organization_id?: string | null;
  current_person_id?: string | null;
  current_work_id?: string | null;
  meeting_synced_from_calendar?: boolean;
  meeting_end_passed?: boolean;
  meeting_has_attendance_evidence?: boolean;
  meeting_cancelled_by_calendar?: boolean;
  meeting_attendee_email_match?: boolean;
  inferred_meeting_type?: string | null;
  inferred_organization_id?: string | null;
  inferred_person_id?: string | null;
  inferred_work_id?: string | null;
}

export interface FileProfileFacts extends ProfileFacts {
  file_name: string;
  current_category?: string | null;
  current_lifecycle_status?: string | null;
  current_organization_id?: string | null;
  current_person_id?: string | null;
  current_work_id?: string | null;
  file_signature_event_sent?: boolean;
  file_signature_event_viewed?: boolean;
  file_signature_event_signed?: boolean;
  file_signature_event_expired?: boolean;
  file_source_context_match?: boolean;
  inferred_category?: string | null;
  inferred_document_type?: string | null;
  inferred_due_date?: string | null;
  inferred_expiry_date?: string | null;
  inferred_signed_date?: string | null;
  inferred_organization_id?: string | null;
  inferred_person_id?: string | null;
  inferred_work_id?: string | null;
}

export interface ProfileRuleMatch {
  rule: ProfileFillRule;
  confidence: number;
  because: string;
}

export interface ProfileFieldResult {
  field: ProfileFieldKey;
  value: string | null;
  confidence: number;
  because: string;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  status: ProfileProvenanceStatus;
  evidence: Record<string, unknown>;
}

export interface ProfileFieldProvenanceView {
  field: ProfileFieldKey;
  value: string | null;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  confidence: number | null;
  because: string | null;
  status: ProfileProvenanceStatus;
  evidence: Record<string, unknown>;
  setAt: string;
}

export interface PersonProfileFieldsView {
  personId: string;
  relationshipType: RelationshipType | null;
  title: string | null;
  primaryOrg: { id: string; name: string } | null;
  provenance: ProfileFieldProvenanceView[];
}

export interface ProfileProvenanceStats {
  applied: number;
  pending: number;
  appliedThisWeek: number;
}

export interface ProfileProvenanceFeedItem {
  id: string;
  entityId: string;
  entityName: string | null;
  entityHref: string | null;
  field: ProfileFieldKey;
  value: string | null;
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
  because: string | null;
  setAt: string;
}
