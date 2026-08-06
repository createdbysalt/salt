import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/_lib/supabase/admin", () => {
  // Fully chainable query mock: every filter method returns the chain, and
  // terminal awaits resolve to empty data.
  const makeChain = (): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "lt", "gt", "gte", "lte", "is", "in", "not", "or", "order"]) {
      chain[method] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() => Promise.resolve({ data: [], error: null }));
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    return chain;
  };

  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn(() => makeChain()),
    })),
  };
});

vi.mock("@/app/_features/capture/services/play-triggers", () => ({
  processBillingSignalTriggers: vi.fn(() =>
    Promise.resolve({ success: true, playsCreated: 0, signalsDispatched: [] })
  ),
  processMeetingSignalTriggers: vi.fn(() =>
    Promise.resolve({ success: true, playsCreated: 0, signalsDispatched: [] })
  ),
  processPersonSignalTriggers: vi.fn(() =>
    Promise.resolve({ success: true, playsCreated: 0, signalsDispatched: [] })
  ),
}));

import { runSignalScan } from "./signal-scanner";

describe("signal-scanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty result when no signals fire", async () => {
    const result = await runSignalScan("workspace-123", { dryRun: true });

    expect(result.workspaceId).toBe("workspace-123");
    expect(result.billingScanned).toBe(0);
    expect(result.meetingsScanned).toBe(0);
    expect(result.peopleScanned).toBe(0);
    expect(result.playsCreated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles dryRun mode without calling dispatch", async () => {
    const { processBillingSignalTriggers } = await import(
      "@/app/_features/capture/services/play-triggers"
    );

    await runSignalScan("workspace-123", { dryRun: true });

    expect(processBillingSignalTriggers).not.toHaveBeenCalled();
  });

  it("exports runSignalScanAllWorkspaces function", async () => {
    const { runSignalScanAllWorkspaces } = await import("./signal-scanner");
    expect(typeof runSignalScanAllWorkspaces).toBe("function");
  });
});
