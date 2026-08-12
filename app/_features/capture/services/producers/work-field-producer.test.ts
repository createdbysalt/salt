import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRunCareForSignal = vi.fn();

type Filter = [string, string, unknown];
type Query = { table: string; filters: Filter[] };
type Resolver = (query: Query) => { data: unknown };

let resolver: Resolver;
const mockFrom = vi.fn((table: string) => {
  const filters: Filter[] = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push(["eq", f, v]);
      return builder;
    },
    is: (f: string, v: unknown) => {
      filters.push(["is", f, v]);
      return builder;
    },
    ilike: (f: string, v: unknown) => {
      filters.push(["ilike", f, v]);
      return builder;
    },
    order: () => builder,
    limit: () => builder,
    maybeSingle: async () => resolver({ table, filters }),
    then: (resolve: (value: { data: unknown }) => void) =>
      resolve(resolver({ table, filters })),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));

import { produceWorkFieldSignals } from "./work-field-producer";

const WS = "ws-1";
const WORK = {
  id: "work-1",
  name: "Website Redesign",
  organization_id: "org-1",
  work_type: "project",
};

function singleWorkResolver(work: unknown = WORK): Resolver {
  return ({ table }) => {
    if (table === "work") return { data: [work] };
    if (table === "organizations") return { data: [] };
    return { data: null };
  };
}

describe("produceWorkFieldSignals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolver = singleWorkResolver();
    mockRunCareForSignal.mockResolvedValue([]);
  });

  it("dispatches work_stage_inferred against the matched work record", async () => {
    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "website redesign",
      fields: {
        signalValues: { work_stage_inferred: "active" },
        title: "Website Redesign",
        orgName: "Northwind Traders",
      },
      source: "crm",
    });

    expect(result.workId).toBe("work-1");
    expect(result.dispatched).toEqual(["work_stage_inferred"]);
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WS,
        entityType: "work",
        entityId: "work-1",
        signalKey: "work_stage_inferred",
        evidence: expect.objectContaining({
          source: "crm",
          signalValues: { work_stage_inferred: "active" },
        }),
      }),
    );
  });

  it("returns null when no work record matches the deal title", async () => {
    resolver = () => ({ data: [] });

    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "unknown deal",
      fields: { signalValues: { work_stage_inferred: "active" }, title: "Unknown Deal" },
      source: "crm",
    });

    expect(result.workId).toBeNull();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("disambiguates duplicate titles via the org name", async () => {
    const other = { ...WORK, id: "work-2", organization_id: "org-2" };
    resolver = ({ table }) => {
      if (table === "work") return { data: [WORK, other] };
      if (table === "organizations") return { data: [{ id: "org-2", name: "Contoso" }] };
      return { data: null };
    };

    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "website redesign",
      fields: {
        signalValues: { work_stage_inferred: "active" },
        title: "Website Redesign",
        orgName: "Contoso",
      },
      source: "crm",
    });

    expect(result.workId).toBe("work-2");
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: "work-2" }),
    );
  });

  it("refuses to guess when duplicates remain after org disambiguation", async () => {
    const other = { ...WORK, id: "work-2" };
    resolver = ({ table }) => {
      if (table === "work") return { data: [WORK, other] };
      if (table === "organizations") return { data: [] };
      return { data: null };
    };

    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "website redesign",
      fields: {
        signalValues: { work_stage_inferred: "active" },
        title: "Website Redesign",
        orgName: "Missing Org",
      },
      source: "crm",
    });

    expect(result.workId).toBeNull();
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("skips the write when the stage does not fit the work type", async () => {
    resolver = singleWorkResolver({ ...WORK, work_type: "quick" });

    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "website redesign",
      fields: {
        signalValues: { work_stage_inferred: "negotiating" },
        title: "Website Redesign",
      },
      source: "crm",
    });

    expect(result.workId).toBe("work-1");
    expect(result.dispatched).toEqual([]);
    expect(mockRunCareForSignal).not.toHaveBeenCalled();
  });

  it("no-ops without a stage value", async () => {
    const result = await produceWorkFieldSignals({
      workspaceId: WS,
      dealKey: "website redesign",
      fields: { signalValues: {}, title: "Website Redesign" },
      source: "crm",
    });

    expect(result.workId).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
