import "server-only";

import { getWorkspaceCogs } from "./cogs";
import { getWorkspaceEntitlement } from "./entitlements";
import { getOverageCapCents, getOveragePlayPriceCents, getTierCapacity } from "./tiers";
import type { WorkspaceEntitlement } from "./types";

/**
 * Spend admission (pricing G7 — the circuit breaker).
 *
 * Everything else in `app/_lib/usage/` observes. This decides.
 *
 * ## What it measures, and why it is a ratio
 *
 * The trigger is month-to-date vendor COGS as a fraction of what the workspace
 * pays, evaluated per workspace. Not absolute dollars: a Max customer costing
 * $30 a month is a healthy account, and a Starter customer costing $30 a month
 * is losing us money every day. A single dollar threshold would either throttle
 * the first or ignore the second.
 *
 * ## Degrade before you deny
 *
 * Denial is the last resort. A paying customer hitting a wall is a support
 * ticket and often a cancellation; the same customer served quietly by a
 * cheaper model is neither. So the ladder pulls the least visible lever first,
 * and `degrade` is the common case rather than an edge case.
 *
 * Each exit point owns whichever lever it has: `sendLlm` swaps model class, a
 * capture scan shortens, a background job defers. `degrade` means "pull yours"
 * — the decision deliberately does not enumerate levers, because the caller
 * knows what it can give up and this module does not.
 *
 * ## Fail open, loudly
 *
 * If the ledger cannot be read, this allows. A billing-telemetry outage must
 * not become a product outage, and hard constraint 7 in the architecture doc
 * says so directly: an unmetered call beats a failed customer action. The
 * ledger is still written on the way out, so the gap is visible afterwards
 * rather than silently uncounted.
 */

/** Below this ratio, spend freely. ~70% gross margin, the SaaS floor. */
const DEGRADE_RATIO = 0.3;

/** At or above this ratio the workspace costs more than it pays. */
const DENY_RATIO = 1.0;

/** 1 cent = 10,000 micro-USD. Prices are cents; COGS is micros. Never mix. */
const MICROS_PER_CENT = 10_000;

const MONTHS_PER_YEAR = 12;

/** Which exit point is asking. Recorded for attribution; reserved for per-kind policy. */
export type SpendKind = "llm_tokens" | "composio_action" | "embedding" | "tts" | "capture_scan";

/**
 * Who the spend is for, which decides how far the ladder may go.
 *
 * `committed` exists to honour the guardrail that work already promised must
 * finish: an approved play that has started is not a candidate for refusal,
 * because refusing halfway leaves the user with a half-done action and no
 * explanation. Admission is the place to say no. Committed work can still be
 * served more cheaply, so it degrades like everything else.
 */
export type SpendOrigin = "user" | "background" | "committed";

export type SpendOutcome = "allow" | "degrade" | "queue" | "deny";

export interface SpendDecision {
  outcome: SpendOutcome;
  /** Diagnostic, for logs. Not customer-safe — it exposes margin internals. */
  reason: string;
  /** Copy that may be shown to the customer. Present when blocked. */
  userMessage: string | null;
  /** MTD COGS ÷ revenue, or null when there is no revenue basis. */
  ratio: number | null;
  cogsMicros: number;
  revenueMicros: number | null;
}

export interface CanSpendInput {
  workspaceId: string;
  kind: SpendKind;
  origin: SpendOrigin;
  /** Forward-looking cost, so a single large spend is caught before it lands. */
  estimateMicros?: number;
  now?: Date;
  /** Reuse an entitlement the caller already resolved, to save a query. */
  entitlement?: WorkspaceEntitlement;
}

function allow(
  reason: string,
  cogsMicros = 0,
  revenueMicros: number | null = null,
  ratio: number | null = null
): SpendDecision {
  return { outcome: "allow", reason, userMessage: null, ratio, cogsMicros, revenueMicros };
}

/**
 * Monthly revenue basis for a workspace, in micro-USD.
 *
 * Annual plans are divided down to a monthly equivalent so the ratio compares
 * a month of cost against a month of revenue.
 *
 * Returns null when the catalog carries no price. Today that is Enterprise,
 * whose terms are negotiated per deal and are not in the catalog at all —
 * treating its $0 as real revenue would make every ratio infinite and deny
 * the account instantly. Null means "no basis", which resolves to allow.
 *
 * Overage opt-in raises the basis rather than being ignored. A customer who
 * has accepted overage billing is paying for the excess, so their revenue
 * genuinely rises with their consumption; measuring them against the base
 * subscription would throttle the one cohort that is fully covering its costs.
 * The G5 cap applies, because overage cannot bill past the price of the next
 * tier up.
 */
export function resolveRevenueMicros(entitlement: WorkspaceEntitlement): number | null {
  const capacity = getTierCapacity(entitlement.tier, entitlement.pricingVersion);

  const subscriptionCents =
    entitlement.billingInterval === "year"
      ? Math.round(capacity.annualPriceCents / MONTHS_PER_YEAR)
      : capacity.monthlyPriceCents;

  if (subscriptionCents <= 0) return null;

  let overageCents = 0;
  if (entitlement.overageEnabled) {
    const excess = Math.max(0, entitlement.playsUsed - entitlement.playsIncluded);
    const uncapped = excess * getOveragePlayPriceCents(entitlement.pricingVersion);
    const cap = getOverageCapCents(entitlement.tier, entitlement.pricingVersion);
    overageCents = cap === null ? uncapped : Math.min(uncapped, cap);
  }

  return (subscriptionCents + overageCents) * MICROS_PER_CENT;
}

/**
 * Map a cost-to-revenue ratio and an origin onto a decision.
 *
 * Split out from the I/O so the policy itself is testable without a database
 * and readable as a table.
 */
export function resolveOutcome(ratio: number, origin: SpendOrigin): SpendOutcome {
  if (ratio < DEGRADE_RATIO) return "allow";
  if (ratio < DENY_RATIO) return "degrade";

  switch (origin) {
    // Refusing work already underway strands the user mid-action. Serve it
    // cheaply and refuse the next one at admission instead.
    case "committed":
      return "degrade";
    // Never fail a cron in a way that makes Salt look broken. Deferring is
    // invisible; a background error is a support ticket about a feature the
    // user never explicitly invoked.
    case "background":
      return "queue";
    case "user":
      return "deny";
  }
}

const BLOCKED_MESSAGE =
  "This workspace has reached its usage limit for the current billing period. " +
  "Upgrade your plan or enable overage in Billing to continue.";

const QUEUED_MESSAGE =
  "Background processing is paused for this billing period. Recent items will " +
  "be picked up next period, or sooner if you upgrade.";

/**
 * Decide whether a workspace may incur vendor cost right now.
 *
 * Never throws. Every failure path allows, because the alternative is letting
 * a billing bug break customer work.
 */
export async function canSpend(input: CanSpendInput): Promise<SpendDecision> {
  try {
    const now = input.now ?? new Date();

    const entitlement =
      input.entitlement ?? (await getWorkspaceEntitlement(input.workspaceId, now));

    const revenueMicros = resolveRevenueMicros(entitlement);
    if (revenueMicros === null) {
      return allow("no revenue basis in catalog (negotiated or unpriced tier)");
    }

    const cogs = await getWorkspaceCogs(
      input.workspaceId,
      entitlement.periodStart,
      entitlement.periodEnd,
      now.getTime()
    );

    if (!cogs.known) {
      return allow("ledger unavailable — failing open", 0, revenueMicros);
    }

    const projectedMicros = cogs.micros + Math.max(0, input.estimateMicros ?? 0);
    const ratio = projectedMicros / revenueMicros;
    const outcome = resolveOutcome(ratio, input.origin);

    const reason =
      `${input.kind}/${input.origin}: MTD COGS ${projectedMicros}µ$ vs ` +
      `revenue ${revenueMicros}µ$ = ${(ratio * 100).toFixed(1)}% -> ${outcome}`;

    if (outcome === "deny" || outcome === "queue") {
      // Loud on purpose. Blocking a paying customer is the most consequential
      // thing this module does and must never happen without a trace.
      console.warn(
        "[usage] spend",
        outcome,
        "for workspace",
        input.workspaceId,
        "—",
        reason,
      );
    }

    return {
      outcome,
      reason,
      userMessage:
        outcome === "deny" ? BLOCKED_MESSAGE : outcome === "queue" ? QUEUED_MESSAGE : null,
      ratio,
      cogsMicros: projectedMicros,
      revenueMicros,
    };
  } catch (error) {
    console.error(
      "[usage] canSpend threw for workspace",
      input.workspaceId,
      "— allowing:",
      error,
    );
    return allow("canSpend threw — failing open");
  }
}

/** Work must not proceed. */
export function isBlocked(decision: SpendDecision): boolean {
  return decision.outcome === "deny" || decision.outcome === "queue";
}

/** Proceed, but on the cheapest path this caller has. */
export function shouldDegrade(decision: SpendDecision): boolean {
  return decision.outcome === "degrade";
}

/** Exported for tests and for docs that quote the policy. */
export const SPEND_THRESHOLDS = {
  degradeRatio: DEGRADE_RATIO,
  denyRatio: DENY_RATIO,
} as const;
