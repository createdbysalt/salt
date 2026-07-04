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
  | "file";

export type PersonProfileFieldKey =
  | "relationship_type"
  | "title"
  | "org_link"
  | "email"
  | "phone"
  | "billing_email"
  | "timezone"
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

export type ProfileFieldKey =
  | PersonProfileFieldKey
  | OrgProfileFieldKey
  | WorkProfileFieldKey
  | OperatorProfileFieldKey
  | WorkspaceProfileFieldKey
  | BillingRecordProfileFieldKey;

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

export const PROFILE_SIGNAL_OPS = ["eq", "neq", "exists", "not_exists", "gte"] as const;

export type ProfileSignalOp = (typeof PROFILE_SIGNAL_OPS)[number];

export type PersonProfileSignalKey =
  | "has_payment_received"
  | "has_stripe_payment"
  | "has_invoice_sent"
  | "is_bidirectional_thread"
  | "you_initiated"
  | "has_calendar_meeting"
  | "has_signature"
  | "email_count"
  | "email_domain_is_personal"
  | "email_domain_matches_workspace"
  | "email_domain_in_partner_list"
  | "email_domain_in_vendor_list"
  | "person_no_contact_30_days"
  | "person_appears_in_multiple_orgs"
  | "person_duplicate_email";

export type OrgProfileSignalKey =
  | "org_domain_known"
  | "org_created_from_domain"
  | "org_has_payment_received"
  | "org_has_invoice_sent"
  | "org_has_primary_contact"
  | "org_has_people"
  | "org_domain_in_partner_list"
  | "org_domain_in_vendor_list"
  | "inferred_industry"
  | "inferred_industry_parent"
  | "inferred_industry_child"
  | "org_missing_industry"
  | "org_missing_key_contact"
  | "org_duplicate_domain";

export type WorkProfileSignalKey =
  | "work_created"
  | "work_has_signed_contract"
  | "work_has_kickoff"
  | "work_is_blocked"
  | "work_has_completed_deliverable"
  | "work_has_due_date"
  | "inferred_description"
  | "inferred_deadline"
  | "inferred_start_date";

export type ProfileSignalKey =
  | PersonProfileSignalKey
  | OrgProfileSignalKey
  | WorkProfileSignalKey;

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
