import "server-only";

import { createAdminClient } from "@/app/_lib/supabase/admin";
import { countBillablePlays } from "./ledger";
import { CURRENT_PRICING_VERSION } from "./pricing-versions";
import { getTierCapacity, resolvePlaysIncluded } from "./tiers";
import type {
  BillingInterval,
  SubscriptionStatus,
  WorkspaceEntitlement,
  WorkspaceTier,
} from "./types";

/**
 * Workspace entitlement resolution.
 *
 * Reads the service-role-only `workspace_subscriptions` row, derives bundle
 * size from the tier catalog, and aggregates consumption from the ledger.
 * Nothing here trusts a client-supplied value.
 *
 * A workspace with no subscription row resolves to Starter. That is the safe
 * direction: an unknown workspace gets the smallest bundle, never the largest.
 */

interface SubscriptionRow {
  tier: string | null;
  status: string | null;
  billing_interval: string | null;
  plays_included_override: number | null;
  overage_enabled: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string | null;
  pricing_version: string | null;
}

const VALID_STATUSES: readonly SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
  "incomplete",
];

function coerceStatus(value: string | null): SubscriptionStatus {
  return VALID_STATUSES.includes(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : "trialing";
}

/**
 * Start of the current bundle window.
 *
 * Stripe's period start is authoritative once a subscription exists. Before
 * then — trials, workspaces created ahead of checkout — the window falls back
 * to the first of the current calendar month so shadow metering still has a
 * coherent period to aggregate over.
 */
function resolvePeriodStart(row: SubscriptionRow | null, now: Date): string {
  if (row?.current_period_start) return row.current_period_start;

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  ).toISOString();
}

export async function getWorkspaceEntitlement(
  workspaceId: string,
  now: Date = new Date(),
): Promise<WorkspaceEntitlement> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select(
      "tier, status, billing_interval, plays_included_override, overage_enabled, current_period_start, current_period_end, created_at, pricing_version",
    )
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    console.error(
      `[usage] entitlement lookup failed for workspace ${workspaceId}:`,
      error.message,
    );
  }

  const row = (data as SubscriptionRow | null) ?? null;

  // Price this workspace under the version it was sold, not today's catalog.
  // A workspace with no row has bought nothing yet, so current is correct.
  const pricingVersion = row?.pricing_version ?? CURRENT_PRICING_VERSION;

  const capacity = getTierCapacity(row?.tier, pricingVersion);
  const playsIncluded = resolvePlaysIncluded(
    row?.tier,
    row?.plays_included_override,
    pricingVersion,
  );
  const periodStart = resolvePeriodStart(row, now);
  const periodEnd = row?.current_period_end ?? null;

  const playsUsed = await countBillablePlays(workspaceId, periodStart, periodEnd);

  return {
    workspaceId,
    tier: capacity.tier as WorkspaceTier,
    pricingVersion,
    status: coerceStatus(row?.status ?? null),
    billingInterval: (row?.billing_interval === "year"
      ? "year"
      : "month") as BillingInterval,
    playsIncluded,
    playsUsed,
    playsRemaining: Math.max(0, playsIncluded - playsUsed),
    overageEnabled: row?.overage_enabled === true,
    periodStart,
    periodEnd,
  };
}
