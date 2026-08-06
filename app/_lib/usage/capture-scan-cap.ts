import { getTierCapacity } from "./tiers";

/**
 * How many captures one manual scan may classify (pricing G3).
 *
 * A manual "sync and scan" is the largest single-click spend in the product:
 * every capture in the lookback window gets its own model call. It previously
 * had no ceiling at all, so the cost of one click was set by the size of the
 * user's inbox rather than by anything Salt chose.
 *
 * The ceiling is derived from the tier's capture budget rather than hardcoded,
 * so it scales with what the workspace pays for and moves automatically when
 * pricing is re-versioned. Deriving it also avoids adding a field to a shipped
 * pricing version, which the catalog forbids.
 *
 * This is a per-scan ceiling, not a budget check — it bounds the worst case of
 * a single click but does not know what the workspace has already spent this
 * period. The budget-aware admission check is `canSpend()` (G8); when that
 * lands it supersedes this, and this becomes the backstop beneath it.
 */

/**
 * Conservative cost of classifying one capture, in micro-USD.
 *
 * Sized from the `insights` routing slot at gpt-4o list rates — roughly 1.5k
 * input tokens of email body and 300 output tokens under the scan's 1000-token
 * cap. Deliberately priced against the more expensive model the slot can route
 * to rather than the cheaper one it usually does: over-estimating yields a
 * tighter cap, and a cap that is too tight is a visible, complainable problem,
 * whereas one that is too loose is exactly the invisible overspend this exists
 * to prevent.
 */
const CAPTURE_CLASSIFY_COST_MICROS = 7_000;

/**
 * Floor beneath any derived cap.
 *
 * A scan that classifies nothing looks broken rather than throttled, and a
 * misconfigured or zeroed capture budget should degrade to a small scan rather
 * than to a no-op that reads as an outage.
 */
const MIN_SCAN_CAPTURES = 50;

/** Tier and version stay loosely typed to match `getTierCapacity`, which
 *  resolves unknown values to the safe default rather than throwing. */
export function resolveScanCaptureCap(
  tier: string | null | undefined,
  version?: string | null,
): number {
  const capacity = getTierCapacity(tier, version);
  const derived = Math.floor(
    capacity.captureBudgetMicros / CAPTURE_CLASSIFY_COST_MICROS,
  );

  return Math.max(MIN_SCAN_CAPTURES, derived);
}
