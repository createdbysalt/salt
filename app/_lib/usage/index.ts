/**
 * Usage metering and entitlement (pricing G1).
 *
 * Canonical source: docs/architecture/billing-metering.md
 * Business rationale: docs/reference/pricing-proposal-tiered-plays.md
 *
 * ```typescript
 * import { recordPlayExecution, getWorkspaceEntitlement } from "@/app/_lib/usage";
 * ```
 *
 * `tiers.ts`, `types.ts`, and `play-cost.ts` are pure and safe to import from
 * anywhere. Everything else is server-only: the ledger and entitlement reads
 * use the service-role client because `usage_events` and
 * `workspace_subscriptions` grant no write access to user sessions.
 */

export * from "./types";
export * from "./tiers";
export * from "./pricing-versions";
export * from "./play-cost";
export * from "./llm-cost";
export {
  recordUsageEvent,
  reverseUsageEvent,
  countBillablePlays,
  playIdempotencyKey,
} from "./ledger";
export { recordPlayExecution, creditPlayExecution } from "./record-play-usage";
export type { RecordPlayUsageInput } from "./record-play-usage";
export { getWorkspaceEntitlement } from "./entitlements";
export { checkPlayAdmission } from "./play-admission";
export type {
  PlayAdmissionCandidate,
  PlayAdmissionDecision,
} from "./play-admission";
export { checkAskSaltAllowance, recordAskSaltUsage } from "./ask-salt-usage";
export type {
  AskSaltAllowance,
  RecordAskSaltUsageInput,
} from "./ask-salt-usage";
export { recordLlmCall } from "./record-llm-usage";
export type { RecordLlmCallInput } from "./record-llm-usage";
export { resolveScanCaptureCap } from "./capture-scan-cap";
export {
  canSpend,
  isBlocked,
  resolveOutcome,
  resolveRevenueMicros,
  shouldDegrade,
  SPEND_THRESHOLDS,
} from "./can-spend";
export type {
  CanSpendInput,
  SpendDecision,
  SpendKind,
  SpendOrigin,
  SpendOutcome,
} from "./can-spend";
export { getWorkspaceCogs, noteLocalSpend, resetCogsCache } from "./cogs";
