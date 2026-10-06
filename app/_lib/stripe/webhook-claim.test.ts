import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import {
  STALE_CLAIM_MS,
  claimWebhookEvent,
  markWebhookEventFailed,
  markWebhookEventProcessed,
} from "./webhook-claim";

interface PostgrestError {
  code: string;
  message: string;
}

/** What the fake database does on the claiming INSERT. */
let insertError: PostgrestError | null = null;
/** The row a second delivery finds when its INSERT loses the race. */
let existingRow: { processed_at: string | null; claimed_at: string } | null = null;
let readError: PostgrestError | null = null;
/** Rows returned by the compare-and-swap reclaim. Empty means it did not match. */
let reclaimedRows: Array<{ stripe_event_id: string }> = [];
let updateError: PostgrestError | null = null;

/** Everything written, so tests can assert on ordering and on the CAS filters. */
let insertedRows: Record<string, unknown>[] = [];
let updates: Array<{ patch: Record<string, unknown>; filters: Record<string, unknown> }> = [];

function fakeSupabase(): SupabaseClient {
  const client = {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          insertedRows.push(row);
          return Promise.resolve({ data: null, error: insertError });
        },

        select() {
          const chain: Record<string, unknown> = {};
          chain.eq = () => chain;
          chain.maybeSingle = async () => ({ data: existingRow, error: readError });
          return chain;
        },

        update(patch: Record<string, unknown>) {
          const filters: Record<string, unknown> = {};
          const record = { patch, filters };
          updates.push(record);

          const chain: Record<string, unknown> = {};
          chain.eq = (col: string, val: unknown) => {
            filters[col] = val;
            return chain;
          };
          chain.is = (col: string, val: unknown) => {
            filters[`is:${col}`] = val;
            return chain;
          };
          chain.lt = (col: string, val: unknown) => {
            filters[`lt:${col}`] = val;
            return chain;
          };
          // The reclaim ends in .select(); the bookkeeping updates are awaited
          // directly, so the builder has to be thenable either way.
          chain.select = () =>
            Promise.resolve({ data: reclaimedRows, error: updateError });
          chain.then = (
            resolve: (value: { data: unknown; error: PostgrestError | null }) => unknown,
          ) => resolve({ data: null, error: updateError });

          return chain;
        },
      };
    },
  };

  return client as unknown as SupabaseClient;
}

function stripeEvent(id = "evt_123"): Stripe.Event {
  return {
    id,
    type: "checkout.session.completed",
    created: 1_760_000_000,
    data: { object: { id: "cs_test_1" } },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  insertError = null;
  existingRow = null;
  readError = null;
  reclaimedRows = [];
  updateError = null;
  insertedRows = [];
  updates = [];
});

const uniqueViolation: PostgrestError = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "billing_webhook_events_stripe_event_id_key"',
};

describe("claimWebhookEvent", () => {
  it("claims an unseen event by inserting before any handler runs", async () => {
    const result = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(result).toEqual({ status: "claimed" });
    expect(insertedRows).toHaveLength(1);
    // The claim is what makes this idempotent: the row exists while the
    // handlers are still running, which is the whole point of the change.
    expect(insertedRows[0]).toMatchObject({
      stripe_event_id: "evt_123",
      endpoint: "saas",
      processed_at: null,
    });
  });

  it("treats a finished event as a duplicate and does not reclaim it", async () => {
    insertError = uniqueViolation;
    existingRow = {
      processed_at: new Date().toISOString(),
      claimed_at: new Date(Date.now() - STALE_CLAIM_MS * 10).toISOString(),
    };

    const result = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(result).toEqual({ status: "duplicate" });
    // Even though the claim is ancient, a processed event is terminal.
    expect(updates).toHaveLength(0);
  });

  it("refuses a second delivery that arrives while the first is still working", async () => {
    // Both copies of the event are in flight. The loser's INSERT hits the
    // unique index, and the claim it finds is fresh, so it must stand down.
    insertError = uniqueViolation;
    existingRow = { processed_at: null, claimed_at: new Date().toISOString() };
    reclaimedRows = [];

    const result = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(result).toEqual({ status: "in_flight" });
  });

  it("takes over a claim whose worker died, and only on the stale window", async () => {
    insertError = uniqueViolation;
    existingRow = {
      processed_at: null,
      claimed_at: new Date(Date.now() - STALE_CLAIM_MS - 60_000).toISOString(),
    };
    reclaimedRows = [{ stripe_event_id: "evt_123" }];

    const result = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(result).toEqual({ status: "claimed" });

    // The takeover must be a compare-and-swap, not a blind write: unprocessed
    // only, older than the cutoff, and it moves claimed_at forward so a racing
    // reclaim finds nothing to match.
    const [reclaim] = updates;
    expect(reclaim.filters["is:processed_at"]).toBeNull();
    expect(reclaim.filters["lt:claimed_at"]).toBeDefined();
    const cutoff = Date.parse(reclaim.filters["lt:claimed_at"] as string);
    expect(Date.now() - cutoff).toBeGreaterThanOrEqual(STALE_CLAIM_MS - 1000);
    expect(Date.parse(reclaim.patch.claimed_at as string)).toBeGreaterThan(cutoff);
  });

  it("lets only one of two deliveries win a reclaim", async () => {
    insertError = uniqueViolation;
    existingRow = {
      processed_at: null,
      claimed_at: new Date(Date.now() - STALE_CLAIM_MS - 60_000).toISOString(),
    };

    // First reclaim matches the stale row.
    reclaimedRows = [{ stripe_event_id: "evt_123" }];
    const winner = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    // The winner moved claimed_at forward, so the loser's identical UPDATE
    // matches zero rows.
    reclaimedRows = [];
    const loser = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(winner).toEqual({ status: "claimed" });
    expect(loser).toEqual({ status: "in_flight" });
  });

  it("fails closed when the claim write errors for any other reason", async () => {
    insertError = { code: "57014", message: "statement timeout" };

    // Never resolve to "claimed" on an unknown failure: the caller turns a
    // throw into a non-2xx and Stripe redelivers, which is always safer than
    // running a tier change twice.
    await expect(
      claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas"),
    ).rejects.toThrow(/Could not claim webhook event evt_123/);
  });

  it("fails closed when the existing claim cannot be read", async () => {
    insertError = uniqueViolation;
    readError = { code: "57014", message: "statement timeout" };

    await expect(
      claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas"),
    ).rejects.toThrow(/Could not read existing claim/);
  });

  it("asks for redelivery if the claimed row cannot be found at all", async () => {
    insertError = uniqueViolation;
    existingRow = null;

    const result = await claimWebhookEvent(fakeSupabase(), stripeEvent(), "saas");

    expect(result).toEqual({ status: "in_flight" });
  });
});

describe("closing a claim out", () => {
  it("stamps processed_at once the handlers succeed", async () => {
    await markWebhookEventProcessed(fakeSupabase(), "evt_123");

    const [update] = updates;
    expect(update.filters.stripe_event_id).toBe("evt_123");
    expect(update.patch.processed_at).toEqual(expect.any(String));
    expect(update.patch.processing_error).toBeNull();
  });

  it("releases a failed claim immediately instead of stranding the event", async () => {
    await markWebhookEventFailed(fakeSupabase(), "evt_123", "tier lookup failed");

    const [update] = updates;
    expect(update.patch.processing_error).toBe("tier lookup failed");
    expect(update.patch.processed_at).toBeNull();

    // Backdated past the stale window, so the next delivery can take it over
    // right away rather than waiting out a claim nobody is holding.
    const released = Date.parse(update.patch.claimed_at as string);
    expect(Date.now() - released).toBeGreaterThan(STALE_CLAIM_MS);
  });

  it("does not throw when the bookkeeping write fails after the work is done", async () => {
    updateError = { code: "57014", message: "statement timeout" };

    // The side effects already happened and Stripe is about to be
    // acknowledged; losing the bookkeeping must not turn into a 500 that
    // replays them.
    await expect(
      markWebhookEventProcessed(fakeSupabase(), "evt_123"),
    ).resolves.toBeUndefined();
  });
});
