import { describe, it, expect, vi, beforeEach } from "vitest";

// Per-table row fixtures for the admin query mock. Any query whose chain
// terminates at limit() resolves with that table's rows.
const tableRows: Record<string, Array<Record<string, unknown>>> = {};

vi.mock("@/app/_lib/supabase/admin", () => {
  // Fully chainable query mock: every filter method returns the chain, and
  // terminal awaits resolve to the table's fixture rows (empty by default).
  const makeChain = (table: string): Record<string, unknown> => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "lt", "gt", "gte", "lte", "is", "in", "not", "or", "order"]) {
      chain[method] = vi.fn(() => chain);
    }
    chain.limit = vi.fn(() =>
      Promise.resolve({ data: tableRows[table] ?? [], error: null })
    );
    chain.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    return chain;
  };

  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn((table: string) => makeChain(table)),
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

const buildWorkspaceRecordConditionIndex = vi.fn(
  async (_workspaceId: string) => new Map<string, unknown[]>()
);
const dispatchRecordConditionTrigger = vi.fn(
  async (_input: unknown, _options?: unknown) => [] as unknown[]
);

vi.mock("@/app/_features/plays/playbooks/trigger-dispatch", () => ({
  processEntitySignals: vi.fn(async () => ({ dispatched: [], results: [] })),
  buildWorkspaceRecordConditionIndex: (workspaceId: string) =>
    buildWorkspaceRecordConditionIndex(workspaceId),
  dispatchRecordConditionTrigger: (input: unknown, options?: unknown) =>
    dispatchRecordConditionTrigger(input, options),
}));

import { runSignalScan } from "./signal-scanner";

describe("signal-scanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(tableRows)) delete tableRows[key];
    buildWorkspaceRecordConditionIndex.mockResolvedValue(new Map());
    dispatchRecordConditionTrigger.mockResolvedValue([]);
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

  describe("record-condition sweep (Phase 5)", () => {
    function indexWith(entries: Array<Record<string, unknown>>) {
      const index = new Map<string, unknown[]>();
      index.set("person.relationshipType", entries);
      buildWorkspaceRecordConditionIndex.mockResolvedValue(index);
      return index;
    }

    const clientConditionEntry = {
      playbook: {
        slug: "welcome-client",
        name: "Welcome Client",
        description: "",
        layer: "act",
        section: "relationships",
      },
      trigger: {
        type: "record_condition",
        entity: "person",
        field: "relationshipType",
        op: "eq",
        value: "client",
      },
    };

    it("does no record-condition work when no conditions are indexed", async () => {
      const result = await runSignalScan("workspace-123");

      expect(result.recordConditionsScanned).toBe(0);
      expect(result.recordConditionMatches).toBe(0);
      expect(dispatchRecordConditionTrigger).not.toHaveBeenCalled();
    });

    it("dispatches rows whose stored value satisfies the condition", async () => {
      const index = indexWith([clientConditionEntry]);
      tableRows["people"] = [
        { id: "p1", name: "Anna", relationship_type: "client" },
        { id: "p2", name: "Bob", relationship_type: "prospect" },
      ];
      dispatchRecordConditionTrigger.mockResolvedValue([
        { success: true, playbookSlug: "welcome-client", playRunId: "run-1" },
      ]);

      const result = await runSignalScan("workspace-123");

      expect(dispatchRecordConditionTrigger).toHaveBeenCalledTimes(1);
      expect(dispatchRecordConditionTrigger).toHaveBeenCalledWith(
        {
          workspaceId: "workspace-123",
          entity: "person",
          field: "relationshipType",
          newValue: "client",
          entityId: "p1",
          entityLabel: "Anna",
        },
        { index }
      );
      expect(result.recordConditionMatches).toBe(1);
      expect(result.playsCreated).toBe(1);
    });

    it("counts matches without dispatching in dryRun mode", async () => {
      indexWith([clientConditionEntry]);
      tableRows["people"] = [
        { id: "p1", name: "Anna", relationship_type: "Client" },
      ];

      const result = await runSignalScan("workspace-123", { dryRun: true });

      expect(result.recordConditionMatches).toBe(1);
      expect(dispatchRecordConditionTrigger).not.toHaveBeenCalled();
    });

    it("evaluates numeric conditions against stored column values", async () => {
      const index = new Map<string, unknown[]>();
      index.set("billing.amountCents", [
        {
          playbook: {
            slug: "big-invoice",
            name: "Big Invoice",
            description: "",
            layer: "act",
            section: "billing",
          },
          trigger: {
            type: "record_condition",
            entity: "billing",
            field: "amountCents",
            op: "gt",
            value: "100000",
          },
        },
      ]);
      buildWorkspaceRecordConditionIndex.mockResolvedValue(index);
      tableRows["billing_records"] = [
        { id: "b1", number: "INV-1", amount_cents: 250000 },
        { id: "b2", number: "INV-2", amount_cents: 5000 },
      ];

      const result = await runSignalScan("workspace-123");

      expect(dispatchRecordConditionTrigger).toHaveBeenCalledTimes(1);
      expect(dispatchRecordConditionTrigger).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: "billing",
          entityId: "b1",
          newValue: 250000,
        }),
        expect.anything()
      );
      expect(result.recordConditionMatches).toBe(1);
    });
  });
});
