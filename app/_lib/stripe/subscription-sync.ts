import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { CURRENT_PRICING_VERSION } from "@/app/_lib/usage/pricing-versions";
import { isWorkspaceTier } from "@/app/_lib/usage/tiers";
import type { SubscriptionStatus, WorkspaceTier } from "@/app/_lib/usage/types";
import { SAAS_PRICE_IDS } from "./saas-price-ids";

/**
 * Stripe → workspace entitlement sync.
 *
 * Salt's original billing wrote subscription state to `profiles`, which is
 * user-scoped, while the product is workspace-scoped. Capacity tiers are a
 * property of the workspace (plays pool at the workspace, per pricing §2), so
 * entitlement is mirrored into `workspace_subscriptions` here.
 *
 * `profiles.saas_*` is left in place and still updated by the webhook. It
 * remains the account-level record of what the user bought;
 * `workspace_subscriptions` is what the product reads to decide capacity.
 *
 * Every function takes a service-role client. There is no user-session path
 * into these writes — `workspace_subscriptions` grants no write to
 * `authenticated` — and the only caller is the signature-verified webhook.
 */

/** Stripe statuses Salt does not model collapse to the nearest equivalent. */
const STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "past_due",
  paused: "paused",
  incomplete: "incomplete",
  incomplete_expired: "canceled",
};

export function mapStripeStatus(status: string): SubscriptionStatus {
  return STATUS_MAP[status] ?? "incomplete";
}

/**
 * Resolve the tier for a subscription.
 *
 * Checkout metadata is the primary signal, with the Stripe price's product
 * metadata as a fallback. An unrecognised value resolves to Starter: an
 * ambiguous tier must never grant the largest bundle.
 */
export function resolveTierFromStripe(
  checkoutTier: string | null | undefined,
  priceMetadataTier?: string | null,
): WorkspaceTier {
  if (isWorkspaceTier(checkoutTier)) return checkoutTier;
  if (isWorkspaceTier(priceMetadataTier)) return priceMetadataTier;
  return "starter";
}

/**
 * Reverse the configured price map to recover a tier from a Stripe price id.
 *
 * Needed on `customer.subscription.updated`, where an upgrade or downgrade
 * arrives as a new price with no checkout metadata attached. Without this a
 * customer who upgrades keeps their old capacity.
 *
 * Returns null when the price is unknown, so callers can leave the stored tier
 * untouched rather than guessing.
 */
export function resolveTierFromPriceId(
  priceId: string | null | undefined,
): WorkspaceTier | null {
  if (!priceId) return null;

  for (const [key, configuredId] of Object.entries(SAAS_PRICE_IDS)) {
    if (configuredId !== priceId) continue;
    const tier = key.split("_")[0];
    if (isWorkspaceTier(tier)) return tier;
  }
  return null;
}

function toIso(seconds: number | null | undefined): string | null {
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : null;
}

/**
 * Workspaces a user's subscription entitles.
 *
 * Ownership, not membership: being invited into someone else's workspace must
 * not push your plan onto it. For launch this returns exactly one workspace
 * per user, since every workspace is single-seat.
 */
async function getOwnedWorkspaceIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_id", userId);

  if (error) {
    console.error(
      `[subscription-sync] failed to load workspaces for user ${userId}:`,
      error.message,
    );
    return [];
  }

  return (data ?? []).map((row) => row.id as string);
}

/**
 * Pricing version already stored for each workspace, if any.
 *
 * Sync upserts, so every column in the payload overwrites on conflict. Sending
 * the current version unconditionally would move a grandfathered workspace onto
 * today's pricing on any replayed webhook — silently, and with no record of
 * what it used to be. Existing versions are read first and preserved.
 *
 * Throws rather than degrading to an empty map: failing open here would stamp
 * the current version over grandfathered rows, which is the outcome this
 * function exists to prevent. A thrown error makes Stripe retry.
 */
async function getStoredPricingVersions(
  supabase: SupabaseClient,
  workspaceIds: string[],
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("workspace_subscriptions")
    .select("workspace_id, pricing_version")
    .in("workspace_id", workspaceIds);

  if (error) {
    throw new Error(
      `Failed to read stored pricing versions: ${error.message}`,
    );
  }

  return new Map(
    (data ?? [])
      .filter((row) => typeof row.pricing_version === "string")
      .map((row) => [row.workspace_id as string, row.pricing_version as string]),
  );
}

export interface SyncWorkspaceSubscriptionInput {
  supabase: SupabaseClient;
  userId: string;
  subscription: Stripe.Subscription;
  tier: WorkspaceTier;
}

/**
 * Write tier and period state onto every workspace the user owns.
 *
 * Upsert on `workspace_id` so this is safe to replay: Stripe retries webhooks,
 * and `customer.subscription.updated` fires for changes Salt has already seen.
 */
export async function syncWorkspaceSubscription({
  supabase,
  userId,
  subscription,
  tier,
}: SyncWorkspaceSubscriptionInput): Promise<void> {
  const workspaceIds = await getOwnedWorkspaceIds(supabase, userId);
  if (workspaceIds.length === 0) {
    console.warn(
      `[subscription-sync] user ${userId} owns no workspace — entitlement not applied`,
    );
    return;
  }

  const item = subscription.items.data[0];
  // `current_period_*` moved off the top-level Subscription type in recent API
  // versions but is still present on the wire.
  const period = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  const row = {
    tier,
    status: mapStripeStatus(subscription.status),
    billing_interval:
      item?.price.recurring?.interval === "year" ? "year" : "month",
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: item?.price.id ?? null,
    current_period_start: toIso(period.current_period_start),
    current_period_end: toIso(period.current_period_end),
    trial_ends_at: toIso(subscription.trial_end),
    cancel_at_period_end: subscription.cancel_at_period_end === true,
    updated_at: new Date().toISOString(),
  };

  // Keep whatever version a workspace already has; stamp current only on the
  // first subscription. The column default is a backstop for legacy rows and
  // goes stale the moment a new version ships, so code decides here.
  const storedVersions = await getStoredPricingVersions(supabase, workspaceIds);

  const { error } = await supabase
    .from("workspace_subscriptions")
    .upsert(
      workspaceIds.map((workspaceId) => ({
        workspace_id: workspaceId,
        pricing_version: storedVersions.get(workspaceId) ?? CURRENT_PRICING_VERSION,
        ...row,
      })),
      { onConflict: "workspace_id" },
    );

  if (error) {
    // Thrown so the webhook returns 500 and Stripe retries. A workspace stuck
    // on the wrong tier is worse than a duplicate delivery.
    throw new Error(
      `Failed to sync workspace entitlement for user ${userId}: ${error.message}`,
    );
  }
}

/**
 * Update status for whichever workspace a Stripe subscription backs.
 *
 * Keyed on `stripe_subscription_id` rather than the customer, because one
 * customer can hold several subscriptions and only one of them changed.
 */
export async function updateWorkspaceSubscriptionStatus(
  supabase: SupabaseClient,
  subscriptionId: string,
  status: SubscriptionStatus,
  extra?: {
    cancelAtPeriodEnd?: boolean;
    /**
     * Must be rolled forward on renewal. `countBillablePlays` aggregates from
     * this timestamp, so a stale value would let plays accumulate across
     * periods and the bundle would never reset.
     */
    currentPeriodStart?: number | null;
    currentPeriodEnd?: number | null;
    /** Omit to leave the stored tier untouched — an unknown price is not a downgrade. */
    tier?: WorkspaceTier | null;
  },
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (extra?.cancelAtPeriodEnd !== undefined) {
    patch.cancel_at_period_end = extra.cancelAtPeriodEnd;
  }
  if (extra?.currentPeriodStart !== undefined) {
    patch.current_period_start = toIso(extra.currentPeriodStart);
  }
  if (extra?.currentPeriodEnd !== undefined) {
    patch.current_period_end = toIso(extra.currentPeriodEnd);
  }
  if (extra?.tier) {
    patch.tier = extra.tier;
  }

  const { error } = await supabase
    .from("workspace_subscriptions")
    .update(patch)
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new Error(
      `Failed to update workspace entitlement for subscription ${subscriptionId}: ${error.message}`,
    );
  }
}

/**
 * Drop a workspace back to Starter when its subscription ends.
 *
 * Capacity shrinks; access is not revoked here. Tiers differ on capacity only,
 * and pricing §6.1 forbids a state where captures stop.
 */
export async function downgradeWorkspaceSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_subscriptions")
    .update({
      tier: "starter",
      status: "canceled",
      overage_enabled: false,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    throw new Error(
      `Failed to downgrade workspace entitlement for subscription ${subscriptionId}: ${error.message}`,
    );
  }
}
