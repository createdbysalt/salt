import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from }),
}));

import { getToolDocs, buildToolDocsPromptSection } from "./tool-docs";

function mockQuery(rows: unknown[], error: { message: string } | null = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockResolvedValue({ data: rows, error }),
  };
  mocks.from.mockReturnValue(chain);
  return chain;
}

describe("getToolDocs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns docs keyed by slug for non-expired rows", async () => {
    mockQuery([
      { tool_slug: "STRIPE_LIST_CHARGES", doc_markdown: "# Stripe docs" },
      { tool_slug: "SLACK_SEND_MESSAGE", doc_markdown: "# Slack docs" },
    ]);

    const docs = await getToolDocs(["STRIPE_LIST_CHARGES", "SLACK_SEND_MESSAGE", "MISSING"]);
    expect(docs.get("STRIPE_LIST_CHARGES")).toBe("# Stripe docs");
    expect(docs.get("SLACK_SEND_MESSAGE")).toBe("# Slack docs");
    expect(docs.has("MISSING")).toBe(false);
  });

  it("filters by slug and expiry in the query", async () => {
    const chain = mockQuery([]);
    await getToolDocs(["A", "B"]);
    expect(mocks.from).toHaveBeenCalledWith("tool_docs");
    expect(chain.in).toHaveBeenCalledWith("tool_slug", ["A", "B"]);
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("returns empty map on read failure (never blocks a run)", async () => {
    mockQuery([], { message: "boom" });
    const docs = await getToolDocs(["A"]);
    expect(docs.size).toBe(0);
  });

  it("returns empty map for empty input", async () => {
    const docs = await getToolDocs([]);
    expect(docs.size).toBe(0);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("buildToolDocsPromptSection", () => {
  it("renders a prompt section keyed by tool slug", () => {
    const docs = new Map([
      ["STRIPE_LIST_CHARGES", "# Stripe docs\n- limit: 1-100"],
    ]);
    const section = buildToolDocsPromptSection(docs);
    expect(section).toContain("STRIPE_LIST_CHARGES");
    expect(section).toContain("# Stripe docs");
    expect(section).toMatch(/reference notes/i);
  });

  it("returns null when no docs exist", () => {
    expect(buildToolDocsPromptSection(new Map())).toBeNull();
  });

  it("respects the character budget across tools", () => {
    const docs = new Map([
      ["TOOL_A", "x".repeat(1500)],
      ["TOOL_B", "y".repeat(1500)],
    ]);
    const section = buildToolDocsPromptSection(docs, 2000);
    expect(section).not.toBeNull();
    expect(section!.length).toBeLessThanOrEqual(2100);
  });
});
