import type { RelationshipStatus } from "@/app/_features/relationships/types";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";
import type { Connection, Invoice, LinkedFile, LinkedWork, PersonNote } from "@/app/_lib/demo/people-demo-data";
import type { HealthBand, HealthFactor } from "@/app/_lib/health/core";
import type { OrgArchetype } from "@/app/_features/orgs/health/types";

export type OrgProfileFieldKey = "website" | "industry" | "relationship_status" | "key_contact";

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
  relationshipStatus: RelationshipStatus;
  notes: string | null;
  migratedFromClientId: string | null;
  primaryContact: { id: string; name: string } | null;
  people: Array<{ id: string; name: string; title: string | null }>;
  metrics: OrgDetailMetrics;
  updatedAt: string | null;
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

export interface OrgNote extends PersonNote {
  pinned?: boolean;
}

export type OrgActivityEvent = {
  id: string;
  at: string;
  kind: "keeper" | "ai" | "user" | "system";
  label: string;
  detail: string | null;
  field: OrgProfileFieldKey | string;
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
};

export interface OrgDetailData {
  summary: OrgDetailSummary | null;
  profileFields: OrgProfileFieldsView | null;
  activity: OrgActivityEvent[];
  notes: OrgNote[];
  connections: Connection[];
  work: LinkedWork[];
  invoices: Invoice[];
  files: LinkedFile[];
  health: OrgHealthResult | null;
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
