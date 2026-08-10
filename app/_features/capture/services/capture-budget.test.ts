import { describe, it, expect, vi, beforeEach } from "vitest";

let budgetConfig: { daily_limit: number; window_hours: number } | null = {
  daily_limit: 500,
  window_hours: 24,
};
let budgetConfigError: { message: string } | null = null;
let captureCount = 0;
let captureCountError: { message: string } | null = null;
let recentWarnings: Array<{ id: string }> = [];
const warningInserts: Array<Record<string, unknown>> = [];
const countFilters: string[] = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "capture_budget_config") {
        return {
          select: () => ({
            maybeSingle: () =>
              Promise.resolve({ data: budgetConfig, error: budgetConfigError }),
          }),
        };
      }
      if (table === "capture_events") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                not: () => ({
                  gte: () => ({
                    or: (filter: string) => {
                      countFilters.push(filter);
                      return Promise.resolve({
                        count: captureCount,
                        error: captureCountError,
                      });
                    },
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "connector_sync_events") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  limit: () => Promise.resolve({ data: recentWarnings }),
                }),
              }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            warningInserts.push(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

import {
  DEFAULT_DAILY_CAPTURE_BUDGET,
  getCaptureBudgetStatus,
  recordBudgetExceededWarning,
} from "./capture-budget";

beforeEach(() => {
  budgetConfig = { daily_limit: 500, window_hours: 24 };
  budgetConfigError = null;
  captureCount = 0;
  captureCountError = null;
  recentWarnings = [];
  warningInserts.length = 0;
  countFilters.length = 0;
});

describe("getCaptureBudgetStatus", () => {
  it("reports within-budget when the 24h count is below the limit", async () => {
    captureCount = 10;
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status).toEqual({ limit: 500, count: 10, exceeded: false });
  });

  it("reports exceeded when the 24h count reaches the DB-configured limit", async () => {
    budgetConfig = { daily_limit: 3, window_hours: 24 };
    captureCount = 3;
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status.exceeded).toBe(true);
    expect(status.count).toBe(3);
    expect(status.limit).toBe(3);
  });

  it("falls back to the default limit when the config row is unreadable", async () => {
    budgetConfig = null;
    budgetConfigError = { message: "permission denied" };
    captureCount = 10;
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status.limit).toBe(DEFAULT_DAILY_CAPTURE_BUDGET);
    expect(status.exceeded).toBe(false);
  });

  it("fails open when the count query errors", async () => {
    captureCountError = { message: "db down" };
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status.exceeded).toBe(false);
  });

  it("counts only budget-consuming rows — noise/drop/held excluded, NULL-gate legacy rows kept", async () => {
    await getCaptureBudgetStatus("ws-1");
    expect(countFilters).toEqual([
      "gate_action.is.null,gate_action.not.in.(noise,drop,held)",
    ]);
  });
});

describe("recordBudgetExceededWarning", () => {
  const status = { limit: 500, count: 500, exceeded: true };

  it("inserts a throttled capture_budget_exceeded event", async () => {
    await recordBudgetExceededWarning("ws-1", status);

    expect(warningInserts).toHaveLength(1);
    expect(warningInserts[0]).toMatchObject({
      kind: "capture_budget_exceeded",
      subject_slug: "daily_capture_budget",
      detail: { workspaceId: "ws-1", count: 500, limit: 500 },
    });
  });

  it("skips the insert when a warning exists within the throttle window", async () => {
    recentWarnings = [{ id: "evt-1" }];

    await recordBudgetExceededWarning("ws-1", status);

    expect(warningInserts).toHaveLength(0);
  });
});
