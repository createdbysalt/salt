import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMemoryGetFacts = vi.fn();
const mockRunCareForSignal = vi.fn();
const mockExecuteSystemPlay = vi.fn();

let tagRows: Array<{ id: string; slug: string; label: string; scope: string }> = [];
let assignmentRows: Array<{ tag_id: string }> = [];

const mockFrom = vi.fn((table: string) => {
  const filters: Array<[string, unknown]> = [];
  const builder = {
    select: () => builder,
    eq: (f: string, v: unknown) => {
      filters.push([f, v]);
      return builder;
    },
    or: () => builder,
    then: (resolve: (value: { data: unknown }) => void) =>
      resolve({
        data: table === "workspace_tags" ? tagRows : assignmentRows,
      }),
  };
  return builder;
});

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));
vi.mock("@/app/_lib/memory-tools", () => ({
  memoryGetFacts: (...args: unknown[]) => mockMemoryGetFacts(...args),
}));
vi.mock("@/app/_features/memory/care/scheduler", () => ({
  runCareForSignal: (...args: unknown[]) => mockRunCareForSignal(...args),
}));
vi.mock("@/app/_features/capture/services/system-plays/executor", () => ({
  executeSystemPlay: (...args: unknown[]) => mockExecuteSystemPlay(...args),
}));

import { produceRecordTagFits } from "./record-tag-fit-producer";

const WS = "ws-1";

describe("produceRecordTagFits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tagRows = [];
    assignmentRows = [];
    mockRunCareForSignal.mockResolvedValue([]);
    mockExecuteSystemPlay.mockResolvedValue({ success: true });
    mockMemoryGetFacts.mockResolvedValue({ facts: {}, signals: {} });
  });

  it("assigns vip to an org with payments and known contacts", async () => {
    tagRows = [{ id: "tag-1", slug: "vip", label: "VIP", scope: "org" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { org_has_payment_received: true, org_has_people: true },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "org",
      entityId: "org-1",
      source: "crm",
    });

    expect(result.assigned).toEqual(["VIP"]);
    expect(mockMemoryGetFacts).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "organization", entityId: "org-1" }),
    );
    expect(mockExecuteSystemPlay).toHaveBeenCalledWith(WS, "system:assign-tag", {
      entity_type: "org",
      entity_id: "org-1",
      tag_label: "VIP",
      because: "Paying client with known contacts",
    });
    expect(mockRunCareForSignal).toHaveBeenCalledWith(
      expect.objectContaining({
        signalKey: "org_tag_fit_detected",
        entityType: "org",
        entityId: "org-1",
      }),
    );
  });

  it("marks an overdue billing record", async () => {
    tagRows = [{ id: "tag-2", slug: "overdue", label: "Overdue", scope: "billing" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: { status: { value: "due" } },
      signals: { billing_due_date_passed: true },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "billing",
      entityId: "br-1",
      source: "quickbooks",
    });

    expect(result.assigned).toEqual(["Overdue"]);
  });

  it("tags a contract resource from its category fact", async () => {
    tagRows = [{ id: "tag-3", slug: "contract", label: "Contract", scope: "resource" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: { category: { value: "contract" } },
      signals: {},
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "resource",
      entityId: "res-1",
      source: "documents",
    });

    expect(result.assigned).toEqual(["Contract"]);
  });

  it("never coins a tag the workspace does not have", async () => {
    tagRows = [];
    mockMemoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { org_has_payment_received: true, org_has_people: true },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "org",
      entityId: "org-1",
      source: "crm",
    });

    expect(result.assigned).toEqual([]);
    expect(mockExecuteSystemPlay).not.toHaveBeenCalled();
  });

  it("skips tags already assigned to the entity", async () => {
    tagRows = [{ id: "tag-1", slug: "vip", label: "VIP", scope: "all" }];
    assignmentRows = [{ tag_id: "tag-1" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { org_has_payment_received: true, org_has_people: true },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "org",
      entityId: "org-1",
      source: "crm",
    });

    expect(result.assigned).toEqual([]);
    expect(mockExecuteSystemPlay).not.toHaveBeenCalled();
  });

  it("respects scope: billing and resource ignore all-scoped tags", async () => {
    tagRows = [{ id: "tag-2", slug: "overdue", label: "Overdue", scope: "all" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { billing_due_date_passed: true },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "billing",
      entityId: "br-1",
      source: "quickbooks",
    });

    expect(result.assigned).toEqual([]);
  });

  it("does not fire when the fit bar is not met", async () => {
    tagRows = [{ id: "tag-1", slug: "vip", label: "VIP", scope: "org" }];
    mockMemoryGetFacts.mockResolvedValue({
      facts: {},
      signals: { org_has_payment_received: true, org_has_people: false },
    });

    const result = await produceRecordTagFits({
      workspaceId: WS,
      entityType: "org",
      entityId: "org-1",
      source: "crm",
    });

    expect(result.assigned).toEqual([]);
  });
});
