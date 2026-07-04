import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/records-engine/types";
import type { Connection, Invoice, LinkedFile, LinkedWork } from "@/app/_lib/demo/people-demo-data";
import type { HealthBand, HealthFactor } from "@/app/_lib/health/core";
import type { OrgArchetype } from "@/app/_features/orgs/health/types";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";

export type OrgProfileFieldKey =
  | "website"
  | "industry"
  | "industry_parent"
  | "industry_child"
  | "relationship_status"
  | "key_contact"
  | "billing_email";

export interface OrgDetailMetrics {
  activeWork: number;
  outstandingCents: number;
  meetingWithinDays: number | null;
  mrrCents: number | null;
  retainerLabel: string | null;
  health: "good" | "watch" | "risk";
}

export interface OrgDetailSummary {
  id: string;
  name: string;
  slug: string | null;
  website: string | null;
  industry: string | null;
  industryParent: string | null;
  industryChild: string | null;
  relationshipStatus: RelationshipStatus;
  notes: string | null;
  primaryContact: { id: string; name: string } | null;
  people: Array<{ id: string; name: string; title: string | null }>;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  billingEmail: string | null;
  lastContactAt: string | null;
  createdAt: string | null;
  recordStatus: "active" | "inactive";
  metrics: OrgDetailMetrics;
  updatedAt: string | null;
  aiNarrative: FreshRecordNarrative | null;
}

export interface OrgProfileFieldProvenanceView {
  field: OrgProfileFieldKey | string;
  value: string | null;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  confidence: number | null;
  because: string | null;
  status: ProfileProvenanceStatus;
  evidence: Record<string, unknown>;
  setAt: string;
}

export interface OrgProfileFieldsView {
  orgId: string;
  website: string | null;
  industry: string | null;
  industryParent: string | null;
  industryChild: string | null;
  relationshipStatus: RelationshipStatus | null;
  primaryContact: { id: string; name: string } | null;
  provenance: OrgProfileFieldProvenanceView[];
}

export interface OrgHealthResult {
  score: number | null;
  band: HealthBand;
  archetype: OrgArchetype;
  label: string;
  factors: HealthFactor[];
  version: number;
}

export type OrgActivityEvent = {
  id: string;
  at: string;
  kind: "keeper" | "ai" | "user" | "system" | "salt";
  label: string;
  detail: string | null;
  field?: OrgProfileFieldKey | string;
  source?: ProfileProvenanceSource | "ai_fallback";
  status?: ProfileProvenanceStatus;
  entityName?: string | null;
  entityHref?: string | null;
};

export interface OrgDetailData {
  summary: OrgDetailSummary | null;
  profileFields: OrgProfileFieldsView | null;
  activity: OrgActivityEvent[];
  notes: EntityNoteWithProvenance[];
  connections: Connection[];
  work: LinkedWork[];
  invoices: Invoice[];
  files: LinkedFile[];
  health: OrgHealthResult | null;
  lifecycleEvents: import("@/app/_features/memory/queries/lifecycle-events").LifecycleEventDisplay[];
  sourceHistory: import("@/app/_features/memory/queries/source-history").SourceHistoryEntry[];
  billingMetrics: import("@/app/_features/billing/queries/billing-accounts").BillingAccountMetrics | null;
  unifiedConnections: import("@/app/_features/connections/types").ConnectionNode[];
}

export type OrgProvenanceRow = {
  field: string;
  value: { text?: string } | null;
  source: ProfileProvenanceSource;
  rule_id: string | null;
  confidence: number | null;
  evidence: Record<string, unknown>;
  status: ProfileProvenanceStatus;
  set_at: string;
};
