import { beforeEach, describe, expect, it, vi } from "vitest";

// Per-table row fixtures; queries resolve through limit() with these rows.
const tableRows: Record<string, Array<Record<string, unknown>>> = {};
const gteCalls: Array<{ column: string; value: unknown }> = [];

function fakeQuery(table: string) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order"]) {
    builder[method] = () => builder;
  }
  builder.gte = (column: string, value: unknown) => {
    gteCalls.push({ column, value });
    return builder;
  };
  builder.limit = async () => ({
    data: tableRows[table] ?? [],
    error: null,
  });
  return builder;
}

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => fakeQuery(table),
  })),
}));

vi.mock("@/app/_lib/tenancy/context", () => ({
  getTenantContext: vi.fn(async () => ({
    context: {
      actorType: "workspaceMember",
      userId: "user-1",
      workspace: { id: "ws-1", role: "owner" },
      studio: null,
    },
  })),
}));

vi.mock("@/app/_lib/tenancy/guards", () => ({
  requireWorkspaceMember: vi.fn(
    (context: { workspace: { id: string } }) => context.workspace
  ),
}));

import { testRecordConditionAction } from "./record-conditions";

describe("testRecordConditionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gteCalls.length = 0;
    for (const key of Object.keys(tableRows)) delete tableRows[key];
  });

  it("returns rows whose stored value satisfies the condition", async () => {
    tableRows["people"] = [
      {
        id: "p1",
        name: "Anna",
        relationship_type: "Client",
        updated_at: "2026-08-20T00:00:00Z",
      },
      {
        id: "p2",
        name: "Bob",
        relationship_type: "prospect",
        updated_at: "2026-08-21T00:00:00Z",
      },
    ];

    const result = await testRecordConditionAction({
      entity: "person",
      field: "relationshipType",
      op: "eq",
      value: "client",
    });

    expect(result.success).toBe(true);
    expect(result.scanned).toBe(2);
    expect(result.matches).toEqual([
      {
        id: "p1",
        label: "Anna",
        actualValue: "Client",
        updatedAt: "2026-08-20T00:00:00Z",
      },
    ]);
  });

  it("queries the dbColumn spelling on the entity table", async () => {
    tableRows["billing_records"] = [
      {
        id: "b1",
        number: "INV-1",
        amount_cents: 250000,
        updated_at: "2026-08-20T00:00:00Z",
      },
    ];

    const result = await testRecordConditionAction({
      entity: "billing",
      field: "amountCents",
      op: "gt",
      value: "100000",
    });

    expect(result.success).toBe(true);
    expect(result.matches).toHaveLength(1);
    expect(result.matches?.[0]).toEqual(
      expect.objectContaining({ id: "b1", label: "INV-1" })
    );
  });

  it("limits history to the last 30 days", async () => {
    tableRows["people"] = [];

    await testRecordConditionAction({
      entity: "person",
      field: "relationshipType",
      op: "eq",
      value: "client",
    });

    const updatedAtFilter = gteCalls.find((c) => c.column === "updated_at");
    expect(updatedAtFilter).toBeDefined();
    const cutoff = Date.parse(String(updatedAtFilter!.value));
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(Math.abs(Date.now() - cutoff - thirtyDaysMs)).toBeLessThan(60_000);
  });

  it("rejects fields outside the registry", async () => {
    const result = await testRecordConditionAction({
      entity: "person",
      field: "bogus_field",
      op: "eq",
      value: "x",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("bogus_field");
  });
});
