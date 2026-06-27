import type { Connection, PersonNote } from "@/app/_lib/demo/people-demo-data";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/profile/types";
import type { FreshRecordNarrative } from "@/app/_features/memory/utils/record-narrative-cache";
import type { WorkStatus } from "./data";

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
  | "final_price_cents";

export type WorkPaymentType = "fixed" | "retainer" | "hourly" | "milestone";
export type WorkPaymentTerms = "due_on_receipt" | "net_15" | "net_30" | "net_60";
export type WorkBillingCycle = "monthly" | "quarterly" | "annually";
export type WorkType = "project" | "retainer" | "hourly" | "proposal" | "quick" | "event";

export type WorkServiceRef = {
  id: string;
  name: string;
  basePriceCents: number | null;
  typicalTimeline: string | null;
  currency: string;
};

export interface WorkHealthFactor {
  factor: string;
  impact: number;
  reason: string;
}

export interface WorkDetailSummary {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  description: string | null;
  workType: WorkType | null;
  stage: string | null;
  org: { id: string; name: string } | null;
  clientId: string | null;
  people: Array<{ id: string; name: string; title: string | null }>;
  service: WorkServiceRef | null;
  serviceId: string | null;
  contractValueCents: number | null;
  paymentType: WorkPaymentType | null;
  paymentTerms: WorkPaymentTerms | null;
  currency: string;
  hourlyRateCents: number | null;
  hoursEstimate: number | null;
  retainerMrrCents: number | null;
  renewalDate: string | null;
  billingCycle: WorkBillingCycle | null;
  billingContactId: string | null;
  poNumber: string | null;
  estimatedTimeline: string | null;
  discountPercent: number | null;
  discountAmountCents: number | null;
  discountReason: string | null;
  finalPriceCents: number | null;
  scopeItems: Array<Record<string, unknown>>;
  startDate: string | null;
  deadline: string | null;
  stageEnteredAt: string | null;
  healthScore: number | null;
  healthBand: string | null;
  healthFactors: WorkHealthFactor[] | null;
  healthUpdatedAt: string | null;
  updatedAt: string | null;
  createdAt: string | null;
  aiNarrative: FreshRecordNarrative | null;
}

export interface WorkProfileFieldProvenanceView {
  field: WorkProfileFieldKey | string;
  value: string | null;
  source: ProfileProvenanceSource;
  ruleId: string | null;
  confidence: number | null;
  because: string | null;
  status: ProfileProvenanceStatus;
  evidence: Record<string, unknown>;
  setAt: string;
}

export interface WorkProfileFieldsView {
  workId: string;
  status: string | null;
  workType: WorkType | null;
  stage: string | null;
  description: string | null;
  deadline: string | null;
  startDate: string | null;
  provenance: WorkProfileFieldProvenanceView[];
}

export type WorkActivityEvent = {
  id: string;
  at: string;
  kind: "keeper" | "ai" | "user" | "system";
  label: string;
  detail: string | null;
  field: string;
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
};

export interface WorkDetailViewModel {
  id: string;
  title: string;
  status: WorkStatus;
  progress: number;
  overdue: boolean;
  org?: { id: string; name: string };
  service: WorkServiceRef | null;
  description: string | null;
  slug: string | null;
  workType: WorkType | null;
  stage: string | null;
  contractValueCents: number | null;
  paymentType: WorkPaymentType | null;
  paymentTerms: WorkPaymentTerms | null;
  currency: string;
  hourlyRateCents: number | null;
  hoursEstimate: number | null;
  retainerMrrCents: number | null;
  renewalDate: string | null;
  billingCycle: WorkBillingCycle | null;
  billingContactId: string | null;
  poNumber: string | null;
  estimatedTimeline: string | null;
  discountPercent: number | null;
  discountAmountCents: number | null;
  discountReason: string | null;
  finalPriceCents: number | null;
  scopeItems: Array<Record<string, unknown>>;
  tags: string[];
  lastActivityAt: string;
  startDate: string | null;
  deadline: string | null;
  createdAt: string | null;
  source: "user" | "imported" | "salt_inferred";
  signals: [];
  contactCount: number;
  connections: Connection[];
  health: {
    score: number;
    band: string;
    factors: WorkHealthFactor[];
  } | null;
  summary: string;
  worthAttention: { reason: string; suggestedPlay: string } | null;
}

export interface WorkDetailData {
  summary: WorkDetailSummary | null;
  profileFields: WorkProfileFieldsView | null;
  connections: Connection[];
  availableServices: WorkServiceRef[];
  activity: WorkActivityEvent[];
  notes: PersonNote[];
  lifecycleEvents: import("@/app/_features/memory/queries/lifecycle-events").LifecycleEventDisplay[];
}
