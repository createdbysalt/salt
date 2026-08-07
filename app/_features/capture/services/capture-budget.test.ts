import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let captureCount = 0;
let captureCountError: { message: string } | null = null;
let recentWarnings: Array<{ id: string }> = [];
const warningInserts: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "capture_events") {
        return {
          select: () => ({
            eq: () => ({
              gte: () =>
                Promise.resolve({ count: captureCount, error: captureCountError }),
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
  getDailyCaptureBudgetLimit,
  recordBudgetExceededWarning,
} from "./capture-budget";

beforeEach(() => {
  captureCount = 0;
  captureCountError = null;
  recentWarnings = [];
  warningInserts.length = 0;
  delete process.env.CAPTURE_DAILY_CAPTURE_BUDGET;
});

afterEach(() => {
  delete process.env.CAPTURE_DAILY_CAPTURE_BUDGET;
});

describe("getDailyCaptureBudgetLimit", () => {
  it("defaults to the global budget", () => {
    expect(getDailyCaptureBudgetLimit()).toBe(DEFAULT_DAILY_CAPTURE_BUDGET);
  });

  it("honors the env override when it is a positive integer", () => {
    process.env.CAPTURE_DAILY_CAPTURE_BUDGET = "25";
    expect(getDailyCaptureBudgetLimit()).toBe(25);
  });

  it("ignores malformed env values", () => {
    process.env.CAPTURE_DAILY_CAPTURE_BUDGET = "not-a-number";
    expect(getDailyCaptureBudgetLimit()).toBe(DEFAULT_DAILY_CAPTURE_BUDGET);
    process.env.CAPTURE_DAILY_CAPTURE_BUDGET = "-5";
    expect(getDailyCaptureBudgetLimit()).toBe(DEFAULT_DAILY_CAPTURE_BUDGET);
  });
});

describe("getCaptureBudgetStatus", () => {
  it("reports within-budget when the 24h count is below the limit", async () => {
    captureCount = 10;
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status).toEqual({
      limit: DEFAULT_DAILY_CAPTURE_BUDGET,
      count: 10,
      exceeded: false,
    });
  });

  it("reports exceeded when the 24h count reaches the limit", async () => {
    process.env.CAPTURE_DAILY_CAPTURE_BUDGET = "3";
    captureCount = 3;
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status.exceeded).toBe(true);
    expect(status.count).toBe(3);
  });

  it("fails open when the count query errors", async () => {
    captureCountError = { message: "db down" };
    const status = await getCaptureBudgetStatus("ws-1");
    expect(status.exceeded).toBe(false);
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
