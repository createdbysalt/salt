import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface PostgrestError {
  code: string;
  message: string;
}

/** Rows returned by the mocked `select` chain in countBillablePlays. */
let selectRows: Array<{ id: string; reverses_event_id: string | null }> = [];
let selectError: PostgrestError | null = null;

/** Row returned by the mocked reversal lookup (`maybeSingle`). */
let lookupRow: Record<string, unknown> | null = null;
let lookupError: PostgrestError | null = null;

/** Result of the mocked insert. */
let insertError: PostgrestError | null = null;
let insertedRows: Record<string, unknown>[] = [];

function makeQuery() {
  const query: Record<string, unknown> = {};
  const chain = () => query;

  query.eq = chain;
  query.gte = chain;
  query.lt = chain;
  query.maybeSingle = async () => ({ data: lookupRow, error: lookupError });
  // countBillablePlays awaits the builder directly rather than a terminal call.
  query.then = (
    resolve: (value: { data: unknown; error: PostgrestError | null }) => unknown,
  ) => resolve({ data: selectRows, error: selectError });

  return query;
}

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => makeQuery(),
      insert: (row: Record<string, unknown>) => {
        insertedRows.push(row);
        return {
          select: () => ({
            single: async () => ({
              data: insertError ? null : { id: "event-1" },
              error: insertError,
            }),
          }),
        };
      },
    }),
  }),
}));

import {
  countBillablePlays,
  playIdempotencyKey,
  recordUsageEvent,
  reverseUsageEvent,
} from "./ledger";

const WORKSPACE = "ws-1";

beforeEach(() => {
  selectRows = [];
  selectError = null;
  lookupRow = null;
  lookupError = null;
  insertError = null;
  insertedRows = [];
});

describe("playIdempotencyKey", () => {
  // Stable across retries: a run that retries three times must bill once.
  it("derives from the run id alone", () => {
    expect(playIdempotencyKey("run-abc")).toBe("play_run-abc");
  });
});

describe("recordUsageEvent", () => {
  const input = {
    workspaceId: WORKSPACE,
    eventType: "play_executed" as const,
    billable: true,
    idempotencyKey: "play_run-1",
  };

  it("records a new event", async () => {
    const result = await recordUsageEvent(input);

    expect(result).toEqual({ ok: true, status: "recorded", eventId: "event-1" });
  });

  // The unique constraint firing is the guardrail working, not a failure.
  it("treats a unique violation as a successful duplicate", async () => {
    insertError = { code: "23505", message: "duplicate key value" };

    const result = await recordUsageEvent(input);

    expect(result).toEqual({ ok: true, status: "duplicate" });
  });

  it("reports other database errors as failures", async () => {
    insertError = { code: "42501", message: "permission denied" };

    const result = await recordUsageEvent(input);

    expect(result).toEqual({ ok: false, error: "permission denied" });
  });

  it("defaults cost to zero and never writes a negative", async () => {
    await recordUsageEvent({ ...input, costEstimateMicros: -500 });

    expect(insertedRows[0]?.cost_estimate_micros).toBe(0);
  });

  it("rounds fractional cost to a whole micro", async () => {
    await recordUsageEvent({ ...input, costEstimateMicros: 20_000.6 });

    expect(insertedRows[0]?.cost_estimate_micros).toBe(20_001);
  });

  it("leaves seat attribution null for single-seat workspaces", async () => {
    await recordUsageEvent(input);

    expect(insertedRows[0]?.seat_id).toBeNull();
  });
});

describe("reverseUsageEvent", () => {
  const input = {
    workspaceId: WORKSPACE,
    originalIdempotencyKey: "play_run-1",
    reason: "user_thumbs_down" as const,
  };

  it("writes a compensating row that mirrors the original", async () => {
    lookupRow = {
      id: "original-1",
      event_type: "play_executed",
      billable: true,
      cost_estimate_micros: 20_000,
      play_run_id: "run-1",
    };

    const result = await reverseUsageEvent(input);

    expect(result.ok).toBe(true);
    expect(insertedRows[0]).toMatchObject({
      event_type: "play_executed",
      billable: true,
      reverses_event_id: "original-1",
      reversal_reason: "user_thumbs_down",
      idempotency_key: "reversal_play_run-1",
    });
  });

  // The money was really spent, so the margin monitor must keep seeing it.
  it("does not credit COGS back", async () => {
    lookupRow = {
      id: "original-1",
      event_type: "play_executed",
      billable: true,
      cost_estimate_micros: 20_000,
      play_run_id: "run-1",
    };

    await reverseUsageEvent(input);

    expect(insertedRows[0]?.cost_estimate_micros).toBe(0);
  });

  // A play that failed before metering has nothing to credit.
  it("is a no-op when the original was never recorded", async () => {
    lookupRow = null;

    const result = await reverseUsageEvent(input);

    expect(result).toEqual({ ok: true, status: "duplicate" });
    expect(insertedRows).toHaveLength(0);
  });

  it("is idempotent when the credit already exists", async () => {
    lookupRow = {
      id: "original-1",
      event_type: "play_executed",
      billable: true,
      cost_estimate_micros: 0,
      play_run_id: "run-1",
    };
    insertError = { code: "23505", message: "duplicate key value" };

    const result = await reverseUsageEvent(input);

    expect(result).toEqual({ ok: true, status: "duplicate" });
  });

  it("reports a lookup failure rather than silently skipping the credit", async () => {
    lookupError = { code: "08006", message: "connection failure" };

    const result = await reverseUsageEvent(input);

    expect(result).toEqual({ ok: false, error: "connection failure" });
  });
});

describe("countBillablePlays", () => {
  const START = "2026-08-01T00:00:00.000Z";

  it("counts executions in the window", async () => {
    selectRows = [
      { id: "a", reverses_event_id: null },
      { id: "b", reverses_event_id: null },
      { id: "c", reverses_event_id: null },
    ];

    await expect(countBillablePlays(WORKSPACE, START)).resolves.toBe(3);
  });

  it("nets reversals against executions", async () => {
    selectRows = [
      { id: "a", reverses_event_id: null },
      { id: "b", reverses_event_id: null },
      { id: "credit-a", reverses_event_id: "a" },
    ];

    await expect(countBillablePlays(WORKSPACE, START)).resolves.toBe(1);
  });

  // A credit landing in a later period than its play must not go negative.
  it("never returns a negative count", async () => {
    selectRows = [
      { id: "credit-a", reverses_event_id: "a" },
      { id: "credit-b", reverses_event_id: "b" },
    ];

    await expect(countBillablePlays(WORKSPACE, START)).resolves.toBe(0);
  });

  // Failing open would hand out unlimited plays on a transient database error.
  it("returns zero when the query fails", async () => {
    selectError = { code: "08006", message: "connection failure" };

    await expect(countBillablePlays(WORKSPACE, START)).resolves.toBe(0);
  });
});
