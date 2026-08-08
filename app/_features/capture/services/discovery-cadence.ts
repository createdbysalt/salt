/**
 * Plan-tiered discovery cadence (Sources plan 4.4).
 *
 * Relationship discovery (held-sender promotion) is Lane B work: it runs
 * inside the capture-intelligence cron, which fires every 30 minutes, but a
 * workspace's discovery pass runs at most once per plan-tiered interval —
 * Starter 1x/day, paid tiers 4x/day, matching the 3.3 reconciliation cadence.
 *
 * The stamp lives on workspace_capture_settings.last_discovery_at (discovery
 * is workspace-scoped, so it cannot ride workspace_integrations.config like
 * the per-connection reconciliation stamp does).
 *
 * Pure functions — imported by the cron (gating) and the Sources loader
 * (honest "next discovery run" copy). No server-only dependencies.
 */

import { isWorkspaceTier } from "@/app/_lib/usage/tiers";

/** Starter discovers once a day; every paid tier discovers every 6 hours. */
export const DISCOVERY_INTERVALS = {
  starterMs: 24 * 60 * 60 * 1000,
  paidMs: 6 * 60 * 60 * 1000,
} as const;

/**
 * Interval for a tier. A missing/unknown tier reads as Starter — the cheaper
 * cadence, same fail-safe as getTierCapacity ("a malformed tier can never
 * grant extra capacity").
 */
export function discoveryIntervalMs(tier: string | null | undefined): number {
  return isWorkspaceTier(tier) && tier !== "starter"
    ? DISCOVERY_INTERVALS.paidMs
    : DISCOVERY_INTERVALS.starterMs;
}

/**
 * A workspace is due when it has never run, its stamp is unreadable, or the
 * tier interval has elapsed since the stamp.
 */
export function isDiscoveryDue(
  tier: string | null | undefined,
  lastDiscoveryAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const last = lastDiscoveryAt ? Date.parse(lastDiscoveryAt) : NaN;
  if (!Number.isFinite(last)) return true;
  return now - last >= discoveryIntervalMs(tier);
}

/**
 * When the next discovery pass becomes due, in epoch ms. `now` when the
 * workspace is already due (never ran, or interval elapsed) — the cron's
 * next tick picks it up.
 */
export function nextDiscoveryDueAt(
  tier: string | null | undefined,
  lastDiscoveryAt: string | null | undefined,
  now: number = Date.now(),
): number {
  const last = lastDiscoveryAt ? Date.parse(lastDiscoveryAt) : NaN;
  if (!Number.isFinite(last)) return now;
  return Math.max(last + discoveryIntervalMs(tier), now);
}
