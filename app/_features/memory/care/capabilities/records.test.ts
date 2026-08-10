import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const memoryGetFacts = vi.fn(async (_input: unknown) => ({
  facts: {},
  signals: {} as Record<string, boolean | number | string>,
}));
const memoryUpdateField = vi.fn(async (_input: unknown) => ({
  action: "accumulated" as const,
  threshold: 85,
  confidence: 90,
  message: "accumulated",
}));

vi.mock("@/app/_lib/memory-tools", () => ({
  memoryGetFacts: (input: unknown) => memoryGetFacts(input),
  memoryUpdateField: (input: unknown) => memoryUpdateField(input),
}));

const queriedTables: string[] = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      queriedTables.push(table);
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "is", "not", "order", "limit"]) {
        chain[method] = vi.fn(() => chain);
      }
      chain.then = (resolve: (value: unknown) => void) =>
        resolve({ data: [] });
      return chain;
    }),
  })),
}));

vi.mock("../decision-pipeline", () => ({
  getCareFieldBar: vi.fn(async () => ({
    tier: "standard",
    bar: 85,
    alwaysAuto: false,
  })),
}));

import { runRecordsCapability, runRecordsForWorkspace } from "./records";

describe("records capability — work and billing coverage (7.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queriedTables.length = 0;
    memoryGetFacts.mockResolvedValue({ facts: {}, signals: {} });
  });

  it("fires the registry's work status rule when the signal is present", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { work_proposal_accepted: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "work",
      entityId: "work-1",
    });

    expect(result.rulesEvaluated).toBeGreaterThan(0);
    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    expect(statusWrite?.value).toBe("won");
  });

  it("fires the registry's billing paid rule when payment covers the total", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { billing_amount_paid_covers_total: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "billing",
      entityId: "bill-1",
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    expect(statusWrite?.value).toBe("paid");
  });

  it("scans people, organizations, work, billing, and meetings tables", async () => {
    await runRecordsForWorkspace({ workspaceId: "ws-1" });

    expect(queriedTables).toEqual(
      expect.arrayContaining([
        "people",
        "organizations",
        "work",
        "billing_records",
        "meetings",
      ])
    );
  });

  it("completes past meetings from the end-passed signal", async () => {
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { meeting_end_passed: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "meeting",
      entityId: "meet-1",
    });

    expect(result.rulesMatched).toBeGreaterThan(0);
    const statusWrite = memoryUpdateField.mock.calls
      .map((call) => call[0] as { field: string; value: string })
      .find((input) => input.field === "status");
    expect(statusWrite?.value).toBe("completed");
  });

  it("never writes boolean signal values through {{extracted}} templates", async () => {
    // meeting_synced_from_calendar is a scan-computed boolean; the eight
    // {{extracted}} rules keyed on it (start_time, meeting_url, …) must skip
    // rather than propose the literal string "true".
    memoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { meeting_synced_from_calendar: true },
    });

    const result = await runRecordsCapability({
      workspaceId: "ws-1",
      signal: "scheduled_scan",
      entityType: "meeting",
      entityId: "meet-2",
    });

    const writes = memoryUpdateField.mock.calls.map(
      (call) => call[0] as { field: string; value: string }
    );
    expect(writes.every((w) => w.value !== "true")).toBe(true);
    // The concrete-value status rule still fires.
    expect(writes.find((w) => w.field === "status")?.value).toBe("scheduled");
    expect(result.rulesMatched).toBe(1);
  });
});
