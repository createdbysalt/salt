import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

interface PostgrestError {
  code: string;
  message: string;
}

/** Rows returned by the mocked `usage_events` window query. */
let windowRows: Array<{ created_at: string }> = [];
let windowError: PostgrestError | null = null;

/** Captured `recordUsageEvent` inputs. */
let recorded: Record<string, unknown>[] = [];
let recordResult: { ok: boolean; status?: string; error?: string } = {
  ok: true,
  status: "recorded",
};

/** Tier + pricing version the mocked entitlement resolves to. */
let entitlementTier = "starter";
let entitlementVersion = "2026-08";

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => {
        const query: Record<string, unknown> = {};
        const chain = () => query;
        query.eq = chain;
        query.gte = chain;
        query.order = () => ({ data: windowRows, error: windowError });
        return query;
      },
    }),
  }),
}));

vi.mock("./ledger", () => ({
  recordUsageEvent: async (input: Record<string, unknown>) => {
    recorded.push(input);
    return recordResult;
  },
}));

vi.mock("./entitlements", () => ({
  getWorkspaceEntitlement: async () => ({
    tier: entitlementTier,
    pricingVersion: entitlementVersion,
  }),
}));

import { checkAskSaltAllowance, recordAskSaltUsage } from "./ask-salt-usage";

const WORKSPACE = "ws-1";
const NOW = new Date("2026-08-06T12:00:00.000Z");

function rowsAgo(count: number, hoursAgo: number): Array<{ created_at: string }> {
  const at = new Date(NOW.getTime() - hoursAgo * 60 * 60 * 1000).toISOString();
  return Array.from({ length: count }, () => ({ created_at: at }));
}

beforeEach(() => {
  windowRows = [];
  windowError = null;
  recorded = [];
  recordResult = { ok: true, status: "recorded" };
  entitlementTier = "starter";
  entitlementVersion = "2026-08";
  vi.restoreAllMocks();
});

describe("checkAskSaltAllowance", () => {
  it("pools the per-seat fair-use figure across the tier's included seats", async () => {
    entitlementTier = "pro"; // 75/day/seat x 3 connected seats
    const allowance = await checkAskSaltAllowance(WORKSPACE, NOW);

    expect(allowance.limit).toBe(225);
  });

  it("uses the starter ceiling for a starter workspace", async () => {
    const allowance = await checkAskSaltAllowance(WORKSPACE, NOW);

    expect(allowance.limit).toBe(30);
    expect(allowance.allowed).toBe(true);
    expect(allowance.used).toBe(0);
  });

  it("allows the query that reaches the limit but not the one past it", async () => {
    windowRows = rowsAgo(29, 1);
    expect((await checkAskSaltAllowance(WORKSPACE, NOW)).allowed).toBe(true);

    windowRows = rowsAgo(30, 1);
    const atLimit = await checkAskSaltAllowance(WORKSPACE, NOW);
    expect(atLimit.allowed).toBe(false);
    expect(atLimit.used).toBe(30);
  });

  it("reports reset as 24h after the oldest query in the window", async () => {
    // Oldest is 20h old, so the first slot frees in 4h — not 24h from now.
    // Reporting "try again tomorrow" when a slot opens in four hours would be
    // a worse lie than giving no time at all.
    windowRows = [
      { created_at: new Date(NOW.getTime() - 20 * 3_600_000).toISOString() },
      { created_at: new Date(NOW.getTime() - 2 * 3_600_000).toISOString() },
    ];

    const allowance = await checkAskSaltAllowance(WORKSPACE, NOW);

    expect(allowance.resetAt).toBe(new Date(NOW.getTime() + 4 * 3_600_000).toISOString());
  });

  it("fails open when the ledger read errors", async () => {
    windowError = { code: "57014", message: "statement timeout" };

    const allowance = await checkAskSaltAllowance(WORKSPACE, NOW);

    // A telemetry outage must not take Ask Salt down. Spend is still recorded
    // on completion, so the gap is auditable rather than silently uncounted.
    expect(allowance.allowed).toBe(true);
    expect(allowance.used).toBe(0);
  });

  it("measures a grandfathered workspace against its own pricing version", async () => {
    entitlementTier = "max";
    entitlementVersion = "2026-08";

    const allowance = await checkAskSaltAllowance(WORKSPACE, NOW);

    expect(allowance.limit).toBe(750); // 150/day/seat x 5 seats
  });
});

describe("recordAskSaltUsage", () => {
  it("records the turn as non-billable so it never consumes a play bundle", async () => {
    await recordAskSaltUsage({
      workspaceId: WORKSPACE,
      idempotencyKey: "ask_salt_resp-1",
      model: "openai/gpt-4o",
      usage: { inputTokens: 1_000, outputTokens: 500 },
      calls: 3,
    });

    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({
      workspaceId: WORKSPACE,
      eventType: "ask_salt_query",
      billable: false,
      idempotencyKey: "ask_salt_resp-1",
      costEstimateMicros: 7_500,
    });
  });

  it("carries the aggregate step count into the breakdown", async () => {
    await recordAskSaltUsage({
      workspaceId: WORKSPACE,
      idempotencyKey: "ask_salt_resp-2",
      model: "openai/gpt-4o",
      usage: { inputTokens: 100, outputTokens: 0 },
      calls: 12,
    });

    expect(recorded[0].costBreakdown).toMatchObject({ aiCalls: 12 });
  });

  it("swallows a ledger failure rather than throwing after the response is sent", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    recordResult = { ok: false, error: "insert failed" };

    await expect(
      recordAskSaltUsage({
        workspaceId: WORKSPACE,
        idempotencyKey: "ask_salt_resp-3",
        model: "openai/gpt-4o",
        usage: { inputTokens: 10 },
      }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalled();
  });

  it("records zero cost when the provider omits usage", async () => {
    await recordAskSaltUsage({
      workspaceId: WORKSPACE,
      idempotencyKey: "ask_salt_resp-4",
      model: "openai/gpt-4o",
      usage: {},
    });

    expect(recorded[0]).toMatchObject({ costEstimateMicros: 0 });
  });
});
