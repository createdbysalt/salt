import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./capture-fetch", () => ({
  isCaptureFetchCategory: (category: string) => category === "capture",
  fetchCaptureSource: vi.fn(),
}));

vi.mock("@/app/_features/plays/services/execute-connector-tool", () => ({
  executeConnectorTool: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/app/_features/plays/services/earned-autonomy", () => ({
  hasEarnedAutonomy: vi.fn().mockResolvedValue(false),
}));

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

const sendLlmMock = vi.fn().mockResolvedValue("draft text");
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  committedSpend: vi.fn().mockReturnValue({ kind: "workspace", origin: "committed" }),
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

describe("email-triage revival (capture fetch, $capture, branch, action execution)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function triagePlaybook() {
    return {
      name: "Email Triage",
      slug: "email-triage",
      version: "2.0.0",
      description: "Triage",
      section: "communication" as const,
      layer: "act" as const,
      voice: "brief",
      trigger: { type: "signal" as const },
      steps: [
        {
          step: "fetch" as const,
          id: "classification",
          from: "capture.get_classification",
          where: { capture_id: "$capture.id" },
        },
        {
          step: "action" as const,
          id: "apply_label",
          tool: "GMAIL_MODIFY_MESSAGE_LABELS",
          args: {
            message_id: "$capture.gmail_message_id",
            add_labels: ["Salt/{{classification.category}}"],
          },
          needsApproval: false,
        },
        {
          step: "branch" as const,
          id: "handle_archive",
          if: "classification.triage_action == 'silent_archive'",
          steps: [
            {
              step: "action" as const,
              id: "archive_noise",
              tool: "GMAIL_MODIFY_MESSAGE_LABELS",
              args: {
                message_id: "$capture.gmail_message_id",
                remove_labels: ["INBOX"],
                add_labels: ["Salt/Archived"],
              },
              needsApproval: true,
            },
          ],
        },
      ],
      output: { type: "finding" as const, approval: "none" as const },
    };
  }

  async function triageContext() {
    const { buildExecutionContextV2 } = await import("./executor");
    return buildExecutionContextV2(
      "test-workspace",
      "test-user",
      { type: "signal", signalKey: "email_classified_noise" },
      undefined,
      {
        id: "capture-123",
        source_type: "gmail",
        gmail_message_id: "gm-msg-456",
        thread_id: "thread-1",
        sender_email: "anna@example.com",
        subject: "Hello",
      }
    );
  }

  it("routes capture.* fetch to the capture source with interpolated where", async () => {
    const { fetchCaptureSource } = await import("./capture-fetch");
    vi.mocked(fetchCaptureSource).mockResolvedValue({
      category: "updates",
      triage_action: "batch_digest",
    });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(triagePlaybook(), await triageContext());

    expect(fetchCaptureSource).toHaveBeenCalledWith(
      "test-workspace",
      "get_classification",
      { capture_id: "capture-123" }
    );
    expect(result.status).toBe("success");
  });

  it("executes non-approval actions for real with $capture and {{step}} interpolation", async () => {
    const { fetchCaptureSource } = await import("./capture-fetch");
    vi.mocked(fetchCaptureSource).mockResolvedValue({
      category: "updates",
      triage_action: "batch_digest",
    });
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(triagePlaybook(), await triageContext());

    expect(result.status).toBe("success");
    expect(executeConnectorTool).toHaveBeenCalledTimes(1);
    expect(executeConnectorTool).toHaveBeenCalledWith(
      "GMAIL_MODIFY_MESSAGE_LABELS",
      { message_id: "gm-msg-456", add_labels: ["Salt/updates"] },
      {
        workspaceId: "test-workspace",
        actorUserId: "test-user",
        approvedActions: ["GMAIL_MODIFY_MESSAGE_LABELS"],
      }
    );

    const branchResult = result.stepResults.find((s) => s.stepId === "handle_archive");
    expect(branchResult?.status).toBe("success");
    expect((branchResult?.data as { executed: boolean }).executed).toBe(false);
  });

  it("branch executes nested steps when the condition matches and pauses for approval", async () => {
    const { fetchCaptureSource } = await import("./capture-fetch");
    vi.mocked(fetchCaptureSource).mockResolvedValue({
      category: "noise",
      triage_action: "silent_archive",
    });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(triagePlaybook(), await triageContext());

    // apply_label executed, archive_noise paused (needsApproval, no earned autonomy)
    expect(result.status).toBe("paused");
    expect(result.pausedAt?.toolSlug).toBe("GMAIL_MODIFY_MESSAGE_LABELS");
    expect(result.pausedAt?.args).toEqual({
      message_id: "gm-msg-456",
      remove_labels: ["INBOX"],
      add_labels: ["Salt/Archived"],
    });
    expect(result.pausedAt?.playRunId).toBe("test-run-id");
  });

  it("stringifies arrays/objects as JSON in draft prompts", async () => {
    const { fetchCaptureSource } = await import("./capture-fetch");
    vi.mocked(fetchCaptureSource).mockResolvedValue([
      { subject: "Invoice", sender_email: "billing@acme.com" },
    ]);
    sendLlmMock.mockResolvedValueOnce("digest text");

    const playbook = {
      name: "Email Digest",
      slug: "email-digest",
      version: "1.0.0",
      description: "Digest",
      section: "communication" as const,
      layer: "act" as const,
      voice: "brief",
      trigger: { type: "schedule" as const, cron: "0 18 * * *" },
      steps: [
        {
          step: "fetch" as const,
          id: "pending_digests",
          from: "capture.batch_digest_emails",
          where: { hours: 24, limit: 50 },
        },
        {
          step: "draft" as const,
          id: "digest_content",
          prompt: "Count: {{pending_digests.length}}\n{{pending_digests}}",
          max_tokens: 500,
        },
      ],
      output: { type: "briefing" as const, approval: "none" as const },
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "schedule",
    });

    const result = await executePlaybookV2(playbook, context);

    expect(result.status).toBe("success");
    const prompt = sendLlmMock.mock.calls[0][0][1].content as string;
    expect(prompt).toContain("Count: 1");
    expect(prompt).toContain('"subject": "Invoice"');
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
