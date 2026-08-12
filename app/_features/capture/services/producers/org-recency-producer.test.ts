import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMemoryUpdateField = vi.fn();

type Filter = [string, string, unknown];
let orgLinks: Array<{ organization_id: string }> = [];
let orgRows: Array<{ id: string; last_contact_at: string | null }> = [];

const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    is: () => builder,
    maybeSingle: async () => {
      if (table === "organizations") {
        const idFilter = filters.find(([op, f]) => op === "eq" && f === "id");
        const row = orgRows.find((r) => r.id === idFilter?.[2]);
        return { data: row ?? null };
      }
      return { data: null };
    },
    then: (resolve: (value: { data: unknown }) => void) =>
      resolve({ data: table === "organization_people" ? orgLinks : null }),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryUpdateField: (...args: unknown[]) => mockMemoryUpdateField(...args),
}));

import { produceOrgRecencyRollup } from "./org-recency-producer";

const WS = "ws-1";

describe("produceOrgRecencyRollup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgLinks = [];
    orgRows = [];
    mockMemoryUpdateField.mockResolvedValue({ action: "applied" });
  });

  it("rolls a newer person touchpoint up to linked orgs", async () => {
    orgLinks = [{ organization_id: "org-1" }, { organization_id: "org-2" }];
    orgRows = [
      { id: "org-1", last_contact_at: "2026-08-01T00:00:00.000Z" },
      { id: "org-2", last_contact_at: null },
    ];

    const result = await produceOrgRecencyRollup({
      workspaceId: WS,
      personId: "person-1",
      contactAt: "2026-08-10T00:00:00.000Z",
      source: "gmail",
    });

    expect(result.updated).toEqual(["org-1", "org-2"]);
    expect(mockMemoryUpdateField).toHaveBeenCalledTimes(2);
    expect(mockMemoryUpdateField).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "organization",
        entityId: "org-1",
        field: "last_contact_at",
        value: "2026-08-10T00:00:00.000Z",
        sourceDetails: expect.objectContaining({
          ruleId: "org-lastContactedAt-org_person_contacted",
        }),
      }),
    );
  });

  it("never regresses the org clock on an older touchpoint", async () => {
    orgLinks = [{ organization_id: "org-1" }];
    orgRows = [{ id: "org-1", last_contact_at: "2026-08-11T00:00:00.000Z" }];

    const result = await produceOrgRecencyRollup({
      workspaceId: WS,
      personId: "person-1",
      contactAt: "2026-08-10T00:00:00.000Z",
      source: "gmail",
    });

    expect(result.updated).toEqual([]);
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
  });

  it("no-ops when the person belongs to no org", async () => {
    const result = await produceOrgRecencyRollup({
      workspaceId: WS,
      personId: "person-1",
      contactAt: "2026-08-10T00:00:00.000Z",
      source: "gmail",
    });

    expect(result.updated).toEqual([]);
    expect(mockMemoryUpdateField).not.toHaveBeenCalled();
  });
});
