import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/app/_lib/composio/category-fetcher", () => ({
  checkCategoryRequirements: vi.fn().mockResolvedValue({ satisfied: true, missing: [] }),
  fetchMultipleByCategory: vi.fn().mockResolvedValue({
    success: true,
    results: {
      test_fetch: {
        id: "test_fetch",
        category: "billing",
        capability: "read_invoices",
        success: true,
        data: [{ id: 1, name: "Test" }],
      },
    },
    errors: [],
  }),
  getConnectedCategories: vi.fn().mockResolvedValue([{ category: "billing" }]),
  getCategoryCapabilities: vi.fn().mockResolvedValue(["read_invoices"]),
}));

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "test-run-id" }, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock("../../execution-router", () => ({
  determineExecutionPath: vi.fn().mockResolvedValue({
    path: "auto_execute",
    confidence: 90,
    reason: "High confidence",
  }),
}));

describe("executor utility functions", () => {
  describe("condition evaluation", () => {
    it("evaluates simple conditions", async () => {
      const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");

      const playbook = {
        name: "Test",
        slug: "test",
        version: "1.0.0",
        description: "Test playbook",
        section: "billing" as const,
        layer: "act" as const,
        voice: "billing",
        trigger: { type: "manual" as const },
        steps: [
          {
            step: "fetch" as const,
            id: "invoices",
            from: "billing.read_invoices",
          },
          {
            step: "classify" as const,
            id: "classified",
            forEach: "invoices",
            rules: [
              { if: "true", then: "always_match" },
            ],
            else: "default",
          },
        ],
        output: { type: "email_draft" as const, approval: "per_entity" as const },
      };

      const context = await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" }
      );

      const result = await executePlaybookV2(playbook, context);

      expect(result.status).toBe("success");
      expect(result.stepResults).toHaveLength(2);
    });
  });

  describe("classify step", () => {
    it("classifies entities based on rules", async () => {
      const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");

      vi.mocked((await import("@/app/_lib/composio/category-fetcher")).fetchMultipleByCategory)
        .mockResolvedValueOnce({
          success: true,
          results: {
            invoices: {
              id: "invoices",
              category: "billing",
              capability: "read_invoices",
              success: true,
              data: [
                { id: 1, amount: 100 },
                { id: 2, amount: 500 },
                { id: 3, amount: 1000 },
              ],
            },
          },
          errors: [],
        });

      const playbook = {
        name: "Test Classify",
        slug: "test-classify",
        version: "1.0.0",
        description: "Test classification",
        section: "billing" as const,
        layer: "act" as const,
        voice: "billing",
        trigger: { type: "manual" as const },
        steps: [
          {
            step: "fetch" as const,
            id: "invoices",
            from: "billing.read_invoices",
          },
          {
            step: "classify" as const,
            id: "classified",
            forEach: "invoices",
            rules: [
              { if: "amount >= 500", then: "high_value" },
              { if: "amount >= 100", then: "medium_value" },
            ],
            else: "low_value",
          },
        ],
        output: { type: "email_draft" as const },
      };

      const context = await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" }
      );

      const result = await executePlaybookV2(playbook, context);

      expect(result.status).toBe("success");
      const classifyResult = result.stepResults.find((s) => s.stepId === "classified");
      expect(classifyResult?.status).toBe("success");

      const classified = classifyResult?.data as Array<{ entity: { amount: number }; tag: string }>;
      expect(classified).toHaveLength(3);
      expect(classified[0].tag).toBe("medium_value");
      expect(classified[1].tag).toBe("high_value");
      expect(classified[2].tag).toBe("high_value");
    });
  });
});

describe("SALT_PROVIDED_VOICES", () => {
  it("has billing, follow-up, and brief voices", async () => {
    const { SALT_PROVIDED_VOICES } = await import("./types");

    expect(SALT_PROVIDED_VOICES).toHaveLength(3);
    expect(SALT_PROVIDED_VOICES.map((v) => v.slug)).toContain("billing");
    expect(SALT_PROVIDED_VOICES.map((v) => v.slug)).toContain("follow-up");
    expect(SALT_PROVIDED_VOICES.map((v) => v.slug)).toContain("brief");
  });

  it("billing voice has professional tone", async () => {
    const { SALT_PROVIDED_VOICES } = await import("./types");

    const billing = SALT_PROVIDED_VOICES.find((v) => v.slug === "billing");
    expect(billing?.tone).toContain("professional");
    expect(billing?.type).toBe("salt");
    expect(billing?.workspace_id).toBeNull();
  });
});
