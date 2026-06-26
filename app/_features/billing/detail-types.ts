import type { Connection, SourceKind } from "@/app/_lib/demo/people-demo-data";
import type { BillingProviderDisplay } from "./utils/provider-display";
import type { BillingRecord, BillingStatus } from "./data";
import type { PaymentSidebarDisplay } from "./utils/payment-display";

export type BillingDetailData = {
  record: BillingRecord | null;
  billingPlays?: BillingPlaySummary[];
  captureSourceUrl?: string | null;
  documentUrl?: string | null;
  updatedAt?: string;
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
  sourceLabel: string;
  originLabel: string;
  source: SourceKind;
  sourceExternalId?: string;
  amount: string;
  amountPaid: string;
  balance: string;
  balanceCents: number;
  currency: string;
  status: BillingStatus;
  statusLabel: string;
  statusTone: string;
  dueLabel: string;
  dueCountdownLabel: string;
  issuedLabel: string;
  issuedRelativeLabel: string;
  paidLabel?: string;
  appUrl?: string;
  appActionLabel: string;
  partyLabel: string;
  partySubtitle?: string;
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
  updatedAt?: string;
};
