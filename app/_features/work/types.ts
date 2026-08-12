import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";
import type {
  ProfileProvenanceSource,
  ProfileProvenanceStatus,
} from "@/app/_features/plays/playbooks/records-engine/types";
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
  | "final_price_cents"
  | "organization_id"
  | "person_id";

export type WorkPaymentType = "fixed" | "retainer" | "hourly" | "milestone";
export type WorkPaymentTerms =
  | "due_on_receipt"
  | "net_15"
  | "net_30"
  | "net_45"
  | "net_60"
  | "custom";
export type WorkBillingCycle = "monthly" | "quarterly" | "annually" | "one_time";
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
  progressOverride: number | null;
  healthScore: number | null;
  healthBand: string | null;
  healthArchetype: string | null;
  healthFactors: (WorkHealthFactor | import("@/app/_lib/health/core").HealthFactor)[] | null;
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
  kind: "salt" | "ai" | "user" | "system";
  label: string;
  detail: string | null;
  field: string;
  source: ProfileProvenanceSource;
  status: ProfileProvenanceStatus;
};

export interface WorkDetailViewModel {
  id: string;
  title: string;
  /** Presentation badge derived from status + dates (deriveWorkStatusBadge). */
  status: WorkStatus;
  /** Raw projects.status value — the canonical work_status vocabulary. */
  dbStatus: string;
  progress: number;
  overdue: boolean;
  org?: { id: string; name: string };
  /** Structured FK on work.person_id — canonical primary contact. */
  primaryPerson?: { id: string; name: string };
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
    archetype?: string;
    label?: string;
    factors: (WorkHealthFactor | import("@/app/_lib/health/core").HealthFactor)[];
  } | null;
  summary: string;
  worthAttention: { reason: string; suggestedPlay: string } | null;
}

export interface WorkDetailData {
  summary: WorkDetailSummary | null;
  profileFields: WorkProfileFieldsView | null;
  connections: Connection[];
  unifiedConnections: import("@/app/_features/connections/types").ConnectionNode[];
  availableServices: WorkServiceRef[];
  activity: WorkActivityEvent[];
  supplementalActivity: ProfileActivityTimelineEntry[];
  notes: EntityNoteWithProvenance[];
  lifecycleEvents: import("@/app/_features/memory/queries/lifecycle-events").LifecycleEventDisplay[];
  sourceHistory: import("@/app/_features/memory/queries/source-history").SourceHistoryEntry[];
  blockers: WorkBlocker[];
  milestones: WorkMilestone[];
  billingRollup: WorkBillingRollup | null;
}

/**
 * Receivable billing records linked to this work, rolled up for the
 * overview's reconciliation line ("Billed $X of $Y · $Z collected").
 */
export interface WorkBillingRollup {
  /** Non-draft receivable invoices linked to the work. */
  invoiceCount: number;
  /** Sum of amount_cents across non-draft receivables. */
  invoicedCents: number;
  /** Sum of amount_paid_cents across all linked receivables. */
  collectedCents: number;
  currency: string;
}

export type WorkBlockerType =
  | "awaiting_reply"
  | "meeting_cancelled"
  | "approval_pending"
  | "asset_pending"
  | "payment_pending"
  | "dependency"
  | "resource_unavailable"
  | "custom";

export type WorkBlockerStatus = "active" | "resolved" | "dismissed";

export type WorkMilestoneStatus = "pending" | "due" | "invoiced" | "paid" | "skipped";
export type WorkMilestoneTriggerType = "stage" | "date" | "manual";

export interface WorkMilestone {
  id: string;
  workId: string;
  name: string;
  percent: number | null;
  amountCents: number | null;
  triggerType: WorkMilestoneTriggerType;
  triggerStage: string | null;
  dueDate: string | null;
  status: WorkMilestoneStatus;
  becameDueAt: string | null;
  invoiceRef: string | null;
  paidAt: string | null;
  sortOrder: number;
}

export interface WorkBlocker {
  id: string;
  workId: string;
  blockerType: WorkBlockerType;
  title: string;
  detail: string | null;
  source: "salt_inferred" | "user_flagged";
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  confidence: number | null;
  status: WorkBlockerStatus;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNote: string | null;
}
