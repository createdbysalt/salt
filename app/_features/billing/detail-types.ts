import type { Connection, SourceKind } from "@/app/_lib/demo/people-demo-data";
import type { BillingProviderDisplay } from "./utils/provider-display";
import type { BillingRecord, BillingOrigin, BillingStatus } from "./data";
import type { PaymentSidebarDisplay } from "./utils/payment-display";
import type { LifecycleEventDisplay } from "@/app/_features/memory/queries/lifecycle-events";
import type { SourceHistoryEntry } from "@/app/_features/memory/queries/source-history";
import type { EntityNoteWithProvenance } from "@/app/_features/memory/types/taxonomies";
import type { ProfileActivityTimelineEntry } from "@/app/_features/people/utils/activity";

export type BillingDetailData = {
  record: BillingRecord | null;
  billingPlays?: BillingPlaySummary[];
  captureSourceUrl?: string | null;
  documentUrl?: string | null;
  updatedAt?: string;
  unifiedConnections?: import("@/app/_features/connections/types").ConnectionNode[];
  notes?: EntityNoteWithProvenance[];
  lifecycleEvents?: LifecycleEventDisplay[];
  supplementalActivity?: ProfileActivityTimelineEntry[];
  sourceHistory?: SourceHistoryEntry[];
};

export type BillingDetailLinks = {
  captureSourceUrl?: string | null;
  documentUrl?: string | null;
  updatedAt?: string;
};

export type BillingPlaySummary = {
  id: string;
  subject: string;
  recipient: string;
  channel: string;
  playerName: string;
  playerMonogram: string;
  state: "approval" | "scheduled" | "team";
};

export type BillingMetric = {
  label: string;
  value: string;
  detail?: string;
};

export type BillingStatusReason = {
  label: string;
  detail: string;
  tone: "warning" | "neutral" | "success";
};

export type BillingDetailViewModel = {
  id: string;
  direction: BillingRecord["direction"];
  directionLabel: string;
  title: string;
  number: string;
  provider: BillingRecord["provider"];
  providerDisplay: BillingProviderDisplay;
  origin: BillingOrigin;
  sourceLabel: string;
  originLabel: string;
  source: SourceKind;
  sourceExternalId?: string;
  amount: string;
  amountCents: number;
  amountPaid: string;
  amountPaidCents: number;
  balance: string;
  balanceCents: number;
  currency: string;
  status: BillingStatus;
  statusLabel: string;
  statusTone: string;
  dueAt: string;
  dueLabel: string;
  dueCountdownLabel: string;
  issuedAt: string;
  issuedLabel: string;
  issuedRelativeLabel: string;
  paidAt?: string;
  paidLabel?: string;
  appUrl?: string;
  appActionLabel: string;
  partyLabel: string;
  partySubtitle?: string;
  organizationName?: string;
  organizationId?: string | null;
  billingContactName?: string;
  personId: string | null;
  work?: { id: string; title: string };
  categoryLabel?: string;
  lineItems: Array<{ description: string; amount: string }>;
  activity: BillingRecord["activity"];
  connections: Connection[];
  tags: string[];
  metrics: BillingMetric[];
  worthAttention?: BillingRecord["worthAttention"];
  statusReasons: BillingStatusReason[];
  retainerTier?: string;
  mrr?: string;
  recurrenceLabel?: string;
  extraction?: BillingRecord["extraction"];
  duplicateOf?: string;
  summary: string;
  paymentFlowLabel: string;
  paymentSidebar: PaymentSidebarDisplay;
  captureSourceUrl?: string | null;
  documentUrl?: string | null;
  sourceReclassifiedAsManual?: boolean;
  updatedAt?: string;
};
