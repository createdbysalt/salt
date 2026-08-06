/**
 * Usage ledger types (pricing G1).
 *
 * Costs are expressed in **micro-USD** (millionths of a dollar) throughout.
 * A single Composio action costs roughly $0.002 and would round to zero in
 * whole cents, so the billing path uses integers at 1e-6 resolution and never
 * touches floating point.
 */

export type UsageEventType =
  | "play_executed"
  | "action_sent"
  | "ask_salt_query"
  | "capture_ingested"
  | "capture_processed"
  | "storage_delta";

export type UsageReversalReason =
  | "play_failed"
  | "user_thumbs_down"
  | "support_credit"
  | "billing_correction";

export type WorkspaceTier = "starter" | "pro" | "max" | "enterprise";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "incomplete";

export type BillingInterval = "month" | "year";

/**
 * One tier's capacity within one pricing version.
 *
 * Capacity lives in code rather than a database column on purpose: a number
 * never persisted per-workspace is a number no customer can edit, and
 * `workspaces` grants UPDATE to owners through PostgREST. The only stored
 * capacity value is `workspace_subscriptions.plays_included_override`, which is
 * service-role-writable and exists for one-off deals.
 */
export interface TierCapacity {
  tier: WorkspaceTier;
  label: string;
  /** Monthly list price in whole US cents. */
  monthlyPriceCents: number;
  /** Annual list price in whole US cents — one month free, roughly 8% off. */
  annualPriceCents: number;
  /** Plays with external effect included per billing period, pooled. */
  playsIncluded: number;
  /** Ask Salt fair-use soft limit per seat per rolling day (G2). */
  askSaltDailyLimit: number;
  /** Upload quota in bytes. Captures, Memory, and embeddings are excluded. */
  storageQuotaBytes: number;
  /** Connected seats carried by the tier price. Single-seat until G6 ships. */
  connectedSeatsIncluded: number;
  /**
   * Internal monthly capture-processing budget in micro-USD (§6.3). Never
   * shown to users; the controller shifts processing depth as spend nears it.
   */
  captureBudgetMicros: number;
}

/**
 * Itemized COGS for a single event (G10).
 *
 * Storing the breakdown is what lets the margin monitor *explain* a change
 * rather than merely detect one.
 */
export interface CostBreakdown {
  /** Language-model spend, micro-USD. */
  ai?: number;
  /** Composio tool execution and trigger delivery, micro-USD. */
  composio?: number;
  /** Fixed orchestration overhead, micro-USD. */
  overhead?: number;
  /** Tool slugs executed, for per-connector cost attribution (G9). */
  tools?: string[];
  /** Number of language-model calls made. */
  aiCalls?: number;
}

export interface RecordUsageEventInput {
  workspaceId: string;
  /** Reserved for the deferred team model (G6). Null for single-seat. */
  seatId?: string | null;
  eventType: UsageEventType;
  /** Whether this event consumes the workspace's play bundle. */
  billable: boolean;
  /**
   * Stable per billable occurrence. Play metering uses `play_<runId>` so a run
   * that retries three times bills exactly once.
   */
  idempotencyKey: string;
  costEstimateMicros?: number;
  costBreakdown?: CostBreakdown;
  playRunId?: string | null;
  externalEffect?: boolean | null;
}

export interface ReverseUsageEventInput {
  workspaceId: string;
  /** Idempotency key of the event being cancelled. */
  originalIdempotencyKey: string;
  reason: UsageReversalReason;
}

export interface UsageEvent {
  id: string;
  workspaceId: string;
  seatId: string | null;
  eventType: UsageEventType;
  billable: boolean;
  costEstimateMicros: number;
  costBreakdown: CostBreakdown;
  idempotencyKey: string;
  playRunId: string | null;
  externalEffect: boolean | null;
  reversesEventId: string | null;
  reversalReason: UsageReversalReason | null;
  createdAt: string;
}

/**
 * Outcome of a ledger write.
 *
 * `duplicate` is a success, not an error: it means the idempotency constraint
 * did its job. Callers must not retry or treat it as a failure.
 */
export type LedgerWriteResult =
  | { ok: true; status: "recorded"; eventId: string }
  | { ok: true; status: "duplicate" }
  | { ok: false; error: string };

/** A workspace's resolved entitlement and current consumption. */
export interface WorkspaceEntitlement {
  workspaceId: string;
  tier: WorkspaceTier;
  /**
   * Pricing version this workspace is billed under. Capacity above is resolved
   * from it, so a grandfathered workspace reports its original bundle rather
   * than today's catalog.
   */
  pricingVersion: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  /** Bundle size from the tier catalog, or the grandfathered override. */
  playsIncluded: number;
  /** Net billable plays this period — reversals already subtracted. */
  playsUsed: number;
  /** Never negative. Zero means the bundle is exhausted. */
  playsRemaining: number;
  overageEnabled: boolean;
  periodStart: string;
  periodEnd: string | null;
}
