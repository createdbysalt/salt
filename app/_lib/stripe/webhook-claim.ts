import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Webhook delivery idempotency.
 *
 * ## Why this is a claim and not a check
 *
 * Stripe guarantees at-least-once delivery, so the same event id can arrive
 * twice, and the two copies can be in flight at the same time. The obvious
 * shape -- ask whether the event has been seen, run the handlers, record it --
 * is a check-then-act race: both copies read "not seen", both run the
 * handlers, and the duplicate is only caught on the write that happens after
 * the side effects. On this endpoint those side effects move a workspace
 * between paid tiers.
 *
 * So the row goes in **first**, with `processed_at` still null, and the unique
 * index on `stripe_event_id` decides the winner. The loser gets 23505 and does
 * nothing. This is the same rule `app/_lib/usage/ledger.ts` follows for the
 * usage ledger: insert and let the constraint answer, never ask and then act.
 *
 * ## Crashes
 *
 * A worker can die between claiming and finishing, which would otherwise leave
 * the event owned by nobody forever. `claimed_at` makes the claim expire: after
 * {@link STALE_CLAIM_MS} a later delivery may take it over. The takeover is a
 * compare-and-swap -- the UPDATE only matches rows whose `claimed_at` is still
 * old, and it writes a fresh `claimed_at` -- so if two deliveries try to
 * reclaim the same stuck event, exactly one UPDATE matches and the other is
 * told the event is in flight.
 *
 * ## What this deliberately does not solve
 *
 * Ordering. Stripe does not promise that `customer.subscription.updated`
 * events arrive in the order they were created, so a delayed older event can
 * still land after a newer one and write stale state. Each event is processed
 * exactly once, but not necessarily in order. Fixing that means storing the
 * `stripe_created` of the last event applied to a subscription and refusing
 * anything older, which belongs next to the subscription record rather than
 * here. Tracked, not built.
 */

/** Postgres unique violation: another delivery already claimed this event. */
const UNIQUE_VIOLATION = "23505";

/**
 * How long a claim can sit unfinished before another delivery may take it.
 * Long enough that a slow-but-alive handler is never stolen from (Stripe's own
 * delivery timeout is far shorter), short enough that a crashed worker does not
 * strand a paid upgrade for long.
 */
export const STALE_CLAIM_MS = 5 * 60 * 1000;

export type WebhookEndpoint = "saas" | "connect";

export type ClaimResult =
  /** This process owns the event and must run the handlers. */
  | { status: "claimed" }
  /** Another delivery already completed it. Acknowledge and do nothing. */
  | { status: "duplicate" }
  /** Another delivery holds a fresh claim. Ask Stripe to redeliver later. */
  | { status: "in_flight" };

interface ClaimRow {
  processed_at: string | null;
  claimed_at: string;
}

/**
 * Take ownership of a webhook event, or report who already has it.
 *
 * Throws on any unexpected database error. That is deliberate: the caller
 * turns a throw into a non-2xx response, which makes Stripe redeliver. Failing
 * open here would mean a transient database blip silently re-runs a tier
 * change, which is the exact failure this module exists to prevent.
 */
export async function claimWebhookEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
  endpoint: WebhookEndpoint,
): Promise<ClaimResult> {
  const { error: insertError } = await supabase
    .from("billing_webhook_events")
    .insert({
      stripe_event_id: event.id,
      endpoint,
      event_type: event.type,
      stripe_created: new Date(event.created * 1000).toISOString(),
      payload: event,
      claimed_at: new Date().toISOString(),
      processed_at: null,
      processing_error: null,
    });

  if (!insertError) return { status: "claimed" };

  if (insertError.code !== UNIQUE_VIOLATION) {
    throw new Error(
      `Could not claim webhook event ${event.id}: ${insertError.message}`,
    );
  }

  // Someone else holds the row. Decide whether they finished, are still
  // working, or died holding it.
  const { data, error: readError } = await supabase
    .from("billing_webhook_events")
    .select("processed_at, claimed_at")
    .eq("stripe_event_id", event.id)
    .maybeSingle<ClaimRow>();

  if (readError) {
    throw new Error(
      `Could not read existing claim for ${event.id}: ${readError.message}`,
    );
  }

  // The row lost a race to exist and then vanished. Nothing sane to assume,
  // so make Stripe try again rather than guess.
  if (!data) return { status: "in_flight" };

  if (data.processed_at) return { status: "duplicate" };

  return reclaimIfStale(supabase, event.id);
}

/**
 * Compare-and-swap a stale claim. Only rows still unprocessed and claimed
 * before the cutoff match, and the UPDATE moves `claimed_at` forward, so the
 * first caller to land takes the event and every racing caller misses.
 */
async function reclaimIfStale(
  supabase: SupabaseClient,
  eventId: string,
): Promise<ClaimResult> {
  const now = Date.now();
  const cutoff = new Date(now - STALE_CLAIM_MS).toISOString();

  const { data, error } = await supabase
    .from("billing_webhook_events")
    .update({ claimed_at: new Date(now).toISOString(), processing_error: null })
    .eq("stripe_event_id", eventId)
    .is("processed_at", null)
    .lt("claimed_at", cutoff)
    .select("stripe_event_id");

  if (error) {
    throw new Error(`Could not reclaim webhook event ${eventId}: ${error.message}`);
  }

  return data && data.length > 0 ? { status: "claimed" } : { status: "in_flight" };
}

/** Close out a claim the handlers finished. */
export async function markWebhookEventProcessed(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({ processed_at: new Date().toISOString(), processing_error: null })
    .eq("stripe_event_id", eventId);

  // The work is done and Stripe is about to be acknowledged; a failure to
  // record that is worth shouting about but must not undo the handlers. The
  // claim goes stale on its own and the next delivery replays it.
  if (error) {
    console.error(
      `[stripe-webhook] processed ${eventId} but could not mark it complete: ${error.message}`,
    );
  }
}

/**
 * Release a claim whose handlers threw, leaving the reason behind.
 *
 * `claimed_at` is backdated past the stale window so Stripe's next redelivery
 * picks the event straight up instead of waiting out a claim nobody holds.
 */
export async function markWebhookEventFailed(
  supabase: SupabaseClient,
  eventId: string,
  reason: string,
): Promise<void> {
  const released = new Date(Date.now() - STALE_CLAIM_MS - 1000).toISOString();

  const { error } = await supabase
    .from("billing_webhook_events")
    .update({ processing_error: reason, processed_at: null, claimed_at: released })
    .eq("stripe_event_id", eventId);

  if (error) {
    console.error(
      `[stripe-webhook] could not record failure for ${eventId}: ${error.message}`,
    );
  }
}
