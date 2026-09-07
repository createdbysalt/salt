import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMaybeSingle, mockFrom } = vi.hoisted(() => {
  const mockMaybeSingle = vi.fn();
  const mockFrom = vi.fn();
  return { mockMaybeSingle, mockFrom };
});

vi.mock("server-only", () => ({}));
vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom.mockReturnValue({
      select: () => ({ eq: () => ({ maybeSingle: mockMaybeSingle }) }),
    }),
  }),
}));

import {
  getApprovedToolClassification,
  invalidateClassificationCache,
} from "./classification-store";

function stubRow(
  row: {
    tool_slug: string;
    risk: string;
    requires_human_confirmation: boolean;
    status: string;
  } | null,
) {
  mockMaybeSingle.mockResolvedValue({ data: row, error: null });
}

describe("getApprovedToolClassification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateClassificationCache();
  });

  it("returns the DB policy for approved rows", async () => {
    stubRow({
      tool_slug: "STRIPE_LIST_INVOICES",
      risk: "read",
      requires_human_confirmation: false,
      status: "approved",
    });
    const policy = await getApprovedToolClassification("STRIPE_LIST_INVOICES");
    expect(policy).toEqual({
      slug: "STRIPE_LIST_INVOICES",
      risk: "read",
      requiresHumanConfirmation: false,
    });
  });

  it("hard-denies disabled rows (drift-disabled = unusable until re-review)", async () => {
    // STRIPE_CREATE_INVOICE heuristically classifies as mutating — without a
    // hard deny, the heuristic fallback would let a drift-disabled tool run.
    stubRow({
      tool_slug: "STRIPE_CREATE_INVOICE",
      risk: "mutating",
      requires_human_confirmation: true,
      status: "disabled",
    });
    const policy = await getApprovedToolClassification("STRIPE_CREATE_INVOICE");
    expect(policy).toBeNull();
  });

  it("hard-denies rejected rows", async () => {
    stubRow({
      tool_slug: "GMAIL_SEND_EMAIL",
      risk: "mutating",
      requires_human_confirmation: true,
      status: "rejected",
    });
    const policy = await getApprovedToolClassification("GMAIL_SEND_EMAIL");
    expect(policy).toBeNull();
  });

  it("falls back to heuristics when no row exists", async () => {
    stubRow(null);
    const policy = await getApprovedToolClassification("STRIPE_LIST_INVOICES");
    expect(policy).not.toBeNull();
    expect(policy?.risk).toBe("read");
  });

  it("falls back to heuristics for unclassified rows", async () => {
    stubRow({
      tool_slug: "STRIPE_LIST_INVOICES",
      risk: "read",
      requires_human_confirmation: false,
      status: "unclassified",
    });
    const policy = await getApprovedToolClassification("STRIPE_LIST_INVOICES");
    expect(policy?.risk).toBe("read");
  });

  it("falls back to heuristics on DB error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "connection reset" },
    });
    const policy = await getApprovedToolClassification("STRIPE_LIST_INVOICES");
    expect(policy?.risk).toBe("read");
  });

  it("caches the disabled deny briefly (negative TTL path)", async () => {
    stubRow({
      tool_slug: "GMAIL_SEND_EMAIL",
      risk: "mutating",
      requires_human_confirmation: true,
      status: "disabled",
    });
    await getApprovedToolClassification("GMAIL_SEND_EMAIL");
    await getApprovedToolClassification("GMAIL_SEND_EMAIL");
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
