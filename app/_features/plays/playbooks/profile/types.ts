import type { RelationshipType } from "@/app/_features/capture/services/system-plays/types";

export type ProfilePlaybookKind = "acting" | "profile";

export type ProfileEntityType = "person" | "organization" | "work";

export type ProfileFieldKey =
  | "relationship_type"
  | "title"
  | "org_link";

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

export const PROFILE_SIGNAL_OPS = ["eq", "neq", "exists", "not_exists", "gte"] as const;

export type ProfileSignalOp = (typeof PROFILE_SIGNAL_OPS)[number];

export type ProfileSignalKey =
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
  | "email_domain_in_vendor_list";

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

export interface PersonProfileFacts {
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
