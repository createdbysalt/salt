import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("./capture-fetch", () => ({
  isCaptureFetchCategory: (category: string) => category === "capture",
  fetchCaptureSource: vi.fn(),
}));

vi.mock("./memory-fetch", () => ({
  isMemoryFetchCategory: (category: string) => category === "memory",
  fetchMemorySource: vi.fn(),
}));

vi.mock("@/app/_features/plays/services/execute-connector-tool", () => {
  class ConnectorUnavailableError extends Error {
    readonly provider: string;
    constructor(message: string, provider: string) {
      super(message);
      this.name = "ConnectorUnavailableError";
      this.provider = provider;
    }
  }
  return {
    executeConnectorTool: vi.fn().mockResolvedValue({ ok: true }),
    ConnectorUnavailableError,
  };
});

vi.mock("@/app/_features/plays/services/earned-autonomy", () => ({
  hasEarnedAutonomy: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/app/_lib/composio/category-fetcher", () => ({
  checkCategoryRequirements: vi.fn().mockResolvedValue({ satisfied: true, missing: [], available: ["billing"], optional: [] }),
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

const insertedRuns: Array<Record<string, unknown>> = [];

vi.mock("@/app/_lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          // Workspace trust dial: tests exercise "trust" mode so declared-auto
          // steps execute and declared-ask steps pause.
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: { trust_level: "trust" }, error: null }),
        }),
      }),
      insert: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
        insertedRuns.push(payload);
        return {
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: "test-run-id" }, error: null }),
          }),
        };
      }),
    }),
  }),
}));

vi.mock("@/app/_lib/composio/tool-policy", () => ({
  getComposioToolPolicy: vi.fn().mockReturnValue(undefined),
}));

const sendLlmMock = vi.fn().mockResolvedValue("draft text");
const sendLlmToolTurnMock = vi.fn();
vi.mock("@/app/_lib/ai/gpt", () => ({
  sendLlm: (...args: unknown[]) => sendLlmMock(...args),
  sendLlmToolTurn: (...args: unknown[]) => sendLlmToolTurnMock(...args),
  committedSpend: vi.fn().mockReturnValue({ kind: "workspace", origin: "committed" }),
}));

const guidanceMock = vi.fn().mockResolvedValue(null);
vi.mock("@/app/_features/plays/customize/prompt-block", () => ({
  buildPlaybookGuidancePromptBlock: (...args: unknown[]) =>
    guidanceMock(...args),
}));

// Multi-app fan-out (Phase 4): capability resolution + per-play exclusions.
const {
  resolveCapabilityToolsMock,
  listCapabilityKeysMock,
  loadSelectionsMock,
} = vi.hoisted(() => ({
  resolveCapabilityToolsMock: vi.fn(),
  listCapabilityKeysMock: vi.fn(),
  loadSelectionsMock: vi.fn(),
}));
vi.mock("@/app/_lib/composio/capability-resolver", () => ({
  resolveCapabilityTool: vi.fn().mockResolvedValue(null),
  resolveCapabilityTools: (...args: unknown[]) =>
    resolveCapabilityToolsMock(...args),
  listCapabilityKeysForToolSlugs: (...args: unknown[]) =>
    listCapabilityKeysMock(...args),
}));
vi.mock("@/app/_features/plays/services/app-selections", () => ({
  loadPlaybookAppSelections: (...args: unknown[]) =>
    loadSelectionsMock(...args),
  exclusionsFromSelections: (
    connected: Iterable<string>,
    selections: ReadonlySet<string>
  ) => {
    const excluded = new Set<string>();
    for (const provider of connected) {
      if (!selections.has(provider)) excluded.add(provider);
    }
    return excluded;
  },
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
        output: { type: "email_draft" as const, approval: "ask" as const },
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

  describe("memory monopoly (runtime guard)", () => {
    it("errors the action step instead of executing a memory-mutating tool", async () => {
      const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
      const { executeConnectorTool } = await import(
        "@/app/_features/plays/services/execute-connector-tool"
      );

      const playbook = {
        name: "Test",
        slug: "test",
        version: "1.0.0",
        description: "Test playbook",
        section: "relationships" as const,
        layer: "act" as const,
        voice: "professional",
        trigger: { type: "manual" as const },
        tools: ["memory_create_person"],
        steps: [
          {
            step: "action" as const,
            id: "bad",
            tool: "memory_create_person",
            args: {},
            approval: "auto" as const,
          },
        ],
        output: { type: "notification" as const, approval: "auto" as const },
      };

      const context = await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" }
      );

      const result = await executePlaybookV2(playbook, context);

      const badStep = result.stepResults.find((s) => s.stepId === "bad");
      expect(badStep?.status).toBe("error");
      expect(badStep?.error).toMatch(/Memory-mutating tool/);
      // The tool must never be invoked, not even once.
      expect(vi.mocked(executeConnectorTool)).not.toHaveBeenCalled();
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

  describe("settings", () => {
    it("resolvePlaybookSettings prefers the workspace value over the default", async () => {
      const { resolvePlaybookSettings } = await import("./executor");

      expect(
        resolvePlaybookSettings({
          grace_days: { type: "number", label: "Grace", default: 0, value: 3 },
          tone: { type: "text", label: "Tone", default: "warm" },
        })
      ).toEqual({ grace_days: 3, tone: "warm" });
      expect(resolvePlaybookSettings(undefined)).toEqual({});
    });

    it("interpolates {{settings.key}} in draft prompts", async () => {
      const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");

      const playbook = {
        name: "Test Settings",
        slug: "test-settings",
        version: "1.0.0",
        description: "Test settings interpolation",
        section: "billing" as const,
        layer: "act" as const,
        voice: "billing",
        trigger: { type: "manual" as const },
        settings: {
          grace_days: {
            type: "number" as const,
            label: "Wait {value} days",
            default: 0,
            value: 5,
          },
        },
        steps: [
          {
            step: "draft" as const,
            id: "note",
            prompt: "Wait {{settings.grace_days}} days before nudging.",
          },
        ],
        output: { type: "email_draft" as const, approval: "ask" as const },
      };

      const context = await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" }
      );

      sendLlmMock.mockClear();
      const result = await executePlaybookV2(playbook, context);

      expect(result.status).toBe("success");
      const prompt = sendLlmMock.mock.calls[0][0][1].content as string;
      expect(prompt).toContain("Wait 5 days before nudging.");
    });

    it("appends workspace guidance to draft prompts", async () => {
      const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");

      guidanceMock.mockResolvedValueOnce(
        "## Workspace guidance for this play\n- Never remind clients with an active retainer"
      );

      const playbook = {
        name: "Test Guidance",
        slug: "test-guidance",
        version: "1.0.0",
        description: "Test guidance injection",
        section: "billing" as const,
        layer: "act" as const,
        voice: "billing",
        trigger: { type: "manual" as const },
        steps: [
          {
            step: "draft" as const,
            id: "note",
            prompt: "Write the reminder.",
          },
        ],
        output: { type: "email_draft" as const, approval: "ask" as const },
      };

      const context = await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" }
      );

      sendLlmMock.mockClear();
      const result = await executePlaybookV2(playbook, context);

      expect(guidanceMock).toHaveBeenCalledWith("test-workspace", "test-guidance");
      expect(result.status).toBe("success");
      const prompt = sendLlmMock.mock.calls[0][0][1].content as string;
      expect(prompt).toContain("Write the reminder.");
      expect(prompt).toContain("## Workspace guidance for this play");
      expect(prompt).toContain("Never remind clients with an active retainer");
    });

    it("interpolates {{settings.key}} in classify rules using the default when no override", async () => {
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
                { id: 1, days_overdue: 10 },
                { id: 2, days_overdue: 3 },
              ],
            },
          },
          errors: [],
        });

      const playbook = {
        name: "Test Settings Classify",
        slug: "test-settings-classify",
        version: "1.0.0",
        description: "Test settings in classify rules",
        section: "billing" as const,
        layer: "act" as const,
        voice: "billing",
        trigger: { type: "manual" as const },
        settings: {
          firm_after_days: {
            type: "number" as const,
            label: "Firm after {value} days",
            default: 7,
          },
        },
        steps: [
          {
            step: "fetch" as const,
            id: "invoices",
            from: "billing.read_invoices",
          },
          {
            step: "classify" as const,
            id: "tier",
            forEach: "invoices",
            rules: [
              { if: "days_overdue >= {{settings.firm_after_days}}", then: "firm" },
            ],
            else: "gentle",
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
      const classifyResult = result.stepResults.find((s) => s.stepId === "tier");
      const classified = classifyResult?.data as Array<{ entity: { id: number }; tag: string }>;
      expect(classified[0].tag).toBe("firm");
      expect(classified[1].tag).toBe("gentle");
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
      output: { type: "finding" as const, approval: "auto" as const },
    };
  }

  async function triageContext() {
    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
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
      output: { type: "briefing" as const, approval: "auto" as const },
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

  it("draft forEach drafts once per item with {{item.*}} interpolation", async () => {
    const { fetchCaptureSource } = await import("./capture-fetch");
    vi.mocked(fetchCaptureSource).mockResolvedValue([
      { subject: "Pricing question", sender_email: "alex@acme.com" },
      { subject: "Kickoff scheduling", sender_email: "priya@studio.io" },
    ]);
    sendLlmMock.mockResolvedValue("draft text");

    const playbook = {
      name: "Getting Started",
      slug: "getting-started",
      version: "1.0.0",
      description: "Onboarding reply pack",
      section: "me" as const,
      layer: "act" as const,
      trigger: { type: "signal" as const, signal: "connector_connected" },
      steps: [
        {
          step: "fetch" as const,
          id: "candidates",
          from: "capture.reply_candidates",
        },
        {
          step: "draft" as const,
          id: "replies",
          forEach: "candidates",
          prompt: "Reply to {{item.sender_email}} about {{item.subject}}",
        },
      ],
      output: { type: "notification" as const, approval: "auto" as const },
      instructions: {},
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "signal",
      signalKey: "connector_connected",
      entityId: "test-workspace",
      entitySurface: "workspace",
    });

    const result = await executePlaybookV2(playbook, context);

    expect(result.status).toBe("success");
    // 2 forEach drafts + 1 run-summary call (generateOutputV2).
    expect(sendLlmMock).toHaveBeenCalledTimes(3);
    const prompts = sendLlmMock.mock.calls.map(
      (call) => call[0][1].content as string
    );
    expect(prompts[0]).toContain("alex@acme.com");
    expect(prompts[0]).toContain("Pricing question");
    expect(prompts[1]).toContain("priya@studio.io");

    const draftResult = result.stepResults.find((s) => s.stepId === "replies");
    expect(draftResult?.status).toBe("success");
    const drafts = draftResult?.data as Array<{ item: unknown; draft: string }>;
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      item: { subject: "Pricing question" },
      draft: "draft text",
    });
  });

  it("draft forEach errors when the source is missing", async () => {
    const playbook = {
      name: "Getting Started",
      slug: "getting-started",
      version: "1.0.0",
      description: "Onboarding reply pack",
      section: "me" as const,
      layer: "act" as const,
      trigger: { type: "signal" as const, signal: "connector_connected" },
      steps: [
        {
          step: "draft" as const,
          id: "replies",
          forEach: "missing_source",
          prompt: "Reply to {{item.sender_email}}",
        },
      ],
      output: { type: "notification" as const, approval: "auto" as const },
      instructions: {},
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "signal",
      signalKey: "connector_connected",
      entityId: "test-workspace",
      entitySurface: "workspace",
    });

    const result = await executePlaybookV2(playbook, context);

    expect(result.status).toBe("error");
    const draftResult = result.stepResults.find((s) => s.stepId === "replies");
    expect(draftResult?.error).toContain("missing_source");
  });
});

describe("park-and-resume on connector failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRuns.length = 0;
  });

  it("parks the run as blocked with the pending call when the connector is unavailable", async () => {
    const { executeConnectorTool, ConnectorUnavailableError } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockRejectedValueOnce(
      new ConnectorUnavailableError(
        "Connector gmail is not connected — connect it in Settings before this play can run",
        "gmail"
      )
    );

    const playbook = {
      name: "Sender",
      slug: "sender",
      version: "1.0.0",
      description: "Sends",
      section: "communication" as const,
      layer: "act" as const,
      voice: "brief",
      trigger: { type: "manual" as const },
      steps: [
        {
          step: "action" as const,
          id: "send",
          tool: "GMAIL_SEND_EMAIL",
          args: { to: "a@b.c" },
          approval: "auto" as const,
        },
      ],
      output: { type: "notification" as const, approval: "auto" as const },
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "manual",
    });

    const result = await executePlaybookV2(playbook, context);

    expect(result.status).toBe("paused");
    expect(result.pausedAt?.blocked?.provider).toBe("gmail");
    expect(result.pausedAt?.toolSlug).toBe("GMAIL_SEND_EMAIL");

    const parked = insertedRuns.find((r) => r.state === "blocked");
    expect(parked).toBeTruthy();
    expect(parked?.paused_for_approval).toBe(true);
    expect((parked?.approval_context as { tool_slug: string }).tool_slug).toBe(
      "GMAIL_SEND_EMAIL"
    );

    // Immediate notification: parked activity entry written alongside the run.
    const parkedNotice = insertedRuns.find((r) => r.action === "parked");
    expect(parkedNotice).toBeTruthy();
  });

  it("still errors (no park) for non-connector tool failures", async () => {
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockRejectedValueOnce(
      new Error("Invalid recipient address")
    );

    const playbook = {
      name: "Sender",
      slug: "sender",
      version: "1.0.0",
      description: "Sends",
      section: "communication" as const,
      layer: "act" as const,
      voice: "brief",
      trigger: { type: "manual" as const },
      steps: [
        {
          step: "action" as const,
          id: "send",
          tool: "GMAIL_SEND_EMAIL",
          args: { to: "a@b.c" },
          approval: "auto" as const,
        },
      ],
      output: { type: "notification" as const, approval: "auto" as const },
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "manual",
    });

    const result = await executePlaybookV2(playbook, context);

    expect(result.status).toBe("error");
    expect(insertedRuns.find((r) => r.state === "blocked")).toBeUndefined();
  });
});

describe("agent step (bounded tool-calling loop)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRuns.length = 0;
    sendLlmToolTurnMock.mockReset();
  });

  function agentPlaybook(maxCalls = 3) {
    return {
      name: "Collections Research",
      slug: "collections-research",
      version: "1.2.0",
      description: "Research",
      section: "billing" as const,
      layer: "act" as const,
      voice: "billing",
      trigger: { type: "manual" as const },
      tools: ["STRIPE_LIST_CHARGES"],
      steps: [
        {
          step: "agent" as const,
          id: "research",
          prompt: "Look up recent charges.",
          tools: ["STRIPE_LIST_CHARGES"],
          max_calls: maxCalls,
        },
      ],
      output: { type: "finding" as const, approval: "auto" as const },
    };
  }

  async function agentContext() {
    const { buildExecutionContextV2 } = await import("./executor");
    return buildExecutionContextV2("test-workspace", "test-user", {
      type: "manual",
    });
  }

  function toolCallTurn(name: string, args: Record<string, unknown>) {
    return {
      text: null,
      toolCalls: [{ id: "call_1", name, args }],
      assistantMessage: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    };
  }

  function finalTurn(text: string) {
    return {
      text,
      toolCalls: [],
      assistantMessage: { role: "assistant", content: text },
    };
  }

  it("runs the loop: tool call through the gate, result fed back, final text as step data", async () => {
    sendLlmToolTurnMock
      .mockResolvedValueOnce(toolCallTurn("STRIPE_LIST_CHARGES", { limit: 5 }))
      .mockResolvedValueOnce(finalTurn("All recent charges are paid."));
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockResolvedValue({ charges: [{ id: "ch_1" }] });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(agentPlaybook(), await agentContext());

    expect(result.status).toBe("success");
    expect(executeConnectorTool).toHaveBeenCalledTimes(1);
    // Consent scope is exactly the step allowlist — every call through the gate.
    expect(executeConnectorTool).toHaveBeenCalledWith(
      "STRIPE_LIST_CHARGES",
      { limit: 5 },
      {
        workspaceId: "test-workspace",
        actorUserId: "test-user",
        approvedActions: ["STRIPE_LIST_CHARGES"],
      }
    );

    const step = result.stepResults.find((s) => s.stepId === "research");
    expect(step?.status).toBe("success");
    const data = step?.data as {
      text: string;
      toolCalls: Array<{ tool: string; ok: boolean }>;
    };
    expect(data.text).toBe("All recent charges are paid.");
    expect(data.toolCalls).toEqual([
      { tool: "STRIPE_LIST_CHARGES", args: { limit: 5 }, ok: true },
    ]);
    // Provenance carries the audit trail for the evidence timeline.
    expect(step?.provenance?.kind).toBe("agent");
    expect(step?.provenance?.toolSlugs).toEqual(["STRIPE_LIST_CHARGES"]);

    // The tool result was fed back to the model before its final answer.
    const secondTurnMessages = sendLlmToolTurnMock.mock.calls[1][0] as Array<
      Record<string, unknown>
    >;
    const toolMessage = secondTurnMessages.find((m) => m.role === "tool");
    expect(toolMessage?.content).toContain("ch_1");
  });

  it("refuses tools outside the step allowlist and tells the model", async () => {
    sendLlmToolTurnMock
      .mockResolvedValueOnce(toolCallTurn("GMAIL_SEND_EMAIL", { to: "a@b.c" }))
      .mockResolvedValueOnce(finalTurn("Could not send — answered with reads only."));
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(agentPlaybook(), await agentContext());

    expect(result.status).toBe("success");
    expect(executeConnectorTool).not.toHaveBeenCalled();

    const step = result.stepResults.find((s) => s.stepId === "research");
    const data = step?.data as {
      toolCalls: Array<{ tool: string; ok: boolean; error?: string }>;
    };
    expect(data.toolCalls[0]).toMatchObject({
      tool: "GMAIL_SEND_EMAIL",
      ok: false,
      error: "not in step allowlist",
    });

    const secondTurnMessages = sendLlmToolTurnMock.mock.calls[1][0] as Array<
      Record<string, unknown>
    >;
    const toolMessage = secondTurnMessages.find((m) => m.role === "tool");
    expect(toolMessage?.content).toContain("not available in this step");
  });

  it("caps tool invocations at max_calls no matter how often the model asks", async () => {
    sendLlmToolTurnMock.mockResolvedValue(
      toolCallTurn("STRIPE_LIST_CHARGES", { limit: 1 })
    );
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockResolvedValue({ charges: [] });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(agentPlaybook(2), await agentContext());

    expect(executeConnectorTool).toHaveBeenCalledTimes(2);
    const step = result.stepResults.find((s) => s.stepId === "research");
    // Budget exhausted without a closing answer → partial success, flagged.
    expect(step?.status).toBe("success");
    expect((step?.data as { truncated: boolean }).truncated).toBe(true);
  });

  it("feeds gate denials back to the model as tool errors instead of pausing", async () => {
    sendLlmToolTurnMock
      .mockResolvedValueOnce(toolCallTurn("STRIPE_LIST_CHARGES", {}))
      .mockResolvedValueOnce(finalTurn("Stripe is disconnected, noted."));
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockRejectedValueOnce(
      new Error("Connector stripe is not connected")
    );

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(agentPlaybook(), await agentContext());

    expect(result.status).toBe("success");
    const step = result.stepResults.find((s) => s.stepId === "research");
    const data = step?.data as {
      text: string;
      toolCalls: Array<{ ok: boolean; error?: string }>;
    };
    expect(data.text).toBe("Stripe is disconnected, noted.");
    expect(data.toolCalls[0]).toMatchObject({
      ok: false,
      error: "Connector stripe is not connected",
    });
  });

  it("errors a memory-mutating allowlist before any model call", async () => {
    const playbook = {
      ...agentPlaybook(),
      tools: ["memory_create_person"],
      steps: [
        {
          step: "agent" as const,
          id: "research",
          prompt: "Look things up.",
          tools: ["memory_create_person"],
        },
      ],
    };

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(playbook, await agentContext());

    expect(result.status).toBe("error");
    expect(result.reason).toContain("Memory-mutating tool");
    expect(sendLlmToolTurnMock).not.toHaveBeenCalled();
  });

  it("errors the step when the model call itself fails", async () => {
    sendLlmToolTurnMock.mockResolvedValueOnce(null);

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(agentPlaybook(), await agentContext());

    expect(result.status).toBe("error");
    expect(result.reason).toContain("Agent step LLM call failed");
  });

  it("pins the playbook version into the run's metadata", async () => {
    sendLlmToolTurnMock.mockResolvedValueOnce(finalTurn("Nothing overdue."));
    const playbook = {
      ...agentPlaybook(),
      steps: [
        ...agentPlaybook().steps,
        {
          step: "draft" as const,
          id: "note",
          prompt: "Summarize: {{research}}",
        },
      ],
    };

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(playbook, await agentContext());

    expect(result.status).toBe("success");
    const run = insertedRuns.find((r) => r.state !== undefined);
    expect(run).toBeTruthy();
    expect((run?.metadata as { playbook_version: string }).playbook_version).toBe(
      "1.2.0"
    );
  });
});

describe("multi-app fan-out + per-play app exclusions (Phase 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRuns.length = 0;
    sendLlmToolTurnMock.mockReset();
    resolveCapabilityToolsMock.mockResolvedValue([]);
    listCapabilityKeysMock.mockResolvedValue(new Map());
    loadSelectionsMock.mockResolvedValue(
      new Set(["stripe", "quickbooks", "gmail"])
    );
  });

  function tool(provider: string, toolSlug: string) {
    return {
      capabilityKey: "read_invoices",
      toolSlug,
      provider,
      connectionId: `ca_${provider}`,
      risk: "read" as const,
      requiresHumanConfirmation: false,
    };
  }

  function verifyPlaybook() {
    return {
      name: "Invoice Reminder",
      slug: "invoice-reminder",
      version: "1.0.0",
      description: "Verify then draft",
      section: "billing" as const,
      layer: "act" as const,
      voice: "billing",
      trigger: { type: "manual" as const },
      tools: ["STRIPE_LIST_INVOICES"],
      steps: [
        {
          step: "agent" as const,
          id: "verify_unpaid",
          prompt: "Confirm the invoice is still unpaid.",
          tools: ["STRIPE_LIST_INVOICES"],
          max_calls: 3,
        },
      ],
      output: { type: "finding" as const, approval: "auto" as const },
    };
  }

  async function fanoutContext(playbookSlug?: string) {
    const { getConnectedCategories } = await import(
      "@/app/_lib/composio/category-fetcher"
    );
    vi.mocked(getConnectedCategories).mockResolvedValue([
      {
        category: "billing" as never,
        providers: ["stripe", "quickbooks"],
        connectionIds: ["ca_stripe", "ca_quickbooks"],
      },
    ]);
    const { buildExecutionContextV2 } = await import("./executor");
    return buildExecutionContextV2(
      "test-workspace",
      "test-user",
      { type: "manual" },
      undefined,
      undefined,
      playbookSlug
    );
  }

  function toolCallTurn(name: string, args: Record<string, unknown>) {
    return {
      text: null,
      toolCalls: [{ id: "call_1", name, args }],
      assistantMessage: {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name, arguments: JSON.stringify(args) },
          },
        ],
      },
    };
  }

  function finalTurn(text: string) {
    return {
      text,
      toolCalls: [],
      assistantMessage: { role: "assistant", content: text },
    };
  }

  it("expands the agent allowlist to every connected provider's sibling tools", async () => {
    listCapabilityKeysMock.mockResolvedValue(
      new Map([["STRIPE_LIST_INVOICES", ["read_invoices"]]])
    );
    resolveCapabilityToolsMock.mockResolvedValue([
      tool("stripe", "STRIPE_LIST_INVOICES"),
      tool("quickbooks", "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT"),
    ]);
    // The model chooses the QuickBooks sibling — it must be permitted.
    sendLlmToolTurnMock
      .mockResolvedValueOnce(
        toolCallTurn("QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT", {})
      )
      .mockResolvedValueOnce(finalTurn("Still unpaid in QuickBooks."));
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockResolvedValue({ rows: [] });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(
      verifyPlaybook(),
      await fanoutContext()
    );

    expect(result.status).toBe("success");
    expect(executeConnectorTool).toHaveBeenCalledWith(
      "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
      {},
      expect.objectContaining({
        approvedActions: expect.arrayContaining([
          "STRIPE_LIST_INVOICES",
          "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
        ]),
      })
    );
  });

  it("excluded providers stay out of the fan-out", async () => {
    loadSelectionsMock.mockResolvedValue(new Set(["stripe"]));
    listCapabilityKeysMock.mockResolvedValue(
      new Map([["STRIPE_LIST_INVOICES", ["read_invoices"]]])
    );
    // The resolver honours the exclusion — only Stripe comes back.
    resolveCapabilityToolsMock.mockResolvedValue([
      tool("stripe", "STRIPE_LIST_INVOICES"),
    ]);
    sendLlmToolTurnMock
      .mockResolvedValueOnce(
        toolCallTurn("QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT", {})
      )
      .mockResolvedValueOnce(finalTurn("Answered with Stripe only."));
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(
      verifyPlaybook(),
      await fanoutContext("invoice-reminder")
    );

    expect(result.status).toBe("success");
    expect(executeConnectorTool).not.toHaveBeenCalledWith(
      "QUICKBOOKS_GET_AGED_RECEIVABLES_REPORT",
      expect.anything(),
      expect.anything()
    );
    expect(resolveCapabilityToolsMock).toHaveBeenCalledWith(
      "read_invoices",
      "test-workspace",
      expect.objectContaining({
        excludeProviders: expect.objectContaining({ size: 1 }),
      })
    );
  });

  it("drops declared tools whose provider is not connected", async () => {
    listCapabilityKeysMock.mockResolvedValue(new Map());
    sendLlmToolTurnMock.mockResolvedValueOnce(finalTurn("No tools available."));
    const { getConnectedCategories } = await import(
      "@/app/_lib/composio/category-fetcher"
    );
    vi.mocked(getConnectedCategories).mockResolvedValue([
      {
        category: "billing" as never,
        providers: ["quickbooks"],
        connectionIds: ["ca_quickbooks"],
      },
    ]);

    const { executePlaybookV2, buildExecutionContextV2 } = await import(
      "./executor"
    );
    const context = await buildExecutionContextV2("test-workspace", "test-user", {
      type: "manual",
    });
    const result = await executePlaybookV2(verifyPlaybook(), context);

    expect(result.status).toBe("success");
    const toolDefs = sendLlmToolTurnMock.mock.calls[0][1] as Array<{
      name: string;
    }>;
    expect(toolDefs.map((d) => d.name)).not.toContain("STRIPE_LIST_INVOICES");
  });

  it("parks the action step as blocked when its provider is not selected for the play", async () => {
    loadSelectionsMock.mockResolvedValue(new Set(["stripe"]));
    const { getConnectedCategories } = await import(
      "@/app/_lib/composio/category-fetcher"
    );
    vi.mocked(getConnectedCategories).mockResolvedValue([
      {
        category: "billing" as never,
        providers: ["stripe", "quickbooks"],
        connectionIds: ["ca_stripe", "ca_quickbooks"],
      },
      {
        category: "email" as never,
        providers: ["gmail"],
        connectionIds: ["ca_gmail"],
      },
    ]);
    const playbook = {
      name: "Invoice Reminder",
      slug: "invoice-reminder",
      version: "1.0.0",
      description: "Drafts",
      section: "billing" as const,
      layer: "act" as const,
      voice: "billing",
      trigger: { type: "manual" as const },
      tools: ["GMAIL_CREATE_EMAIL_DRAFT"],
      steps: [
        {
          step: "action" as const,
          id: "create_draft",
          tool: "GMAIL_CREATE_EMAIL_DRAFT",
          args: { recipient_email: "dana@acme.com", subject: "s", body: "b" },
          approval: "auto" as const,
        },
      ],
      output: { type: "email_draft" as const, approval: "auto" as const },
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const result = await executePlaybookV2(
      playbook,
      await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" },
        undefined,
        undefined,
        "invoice-reminder"
      )
    );

    expect(result.status).toBe("paused");
    expect(result.pausedAt?.blocked?.provider).toBe("gmail");
    expect(result.pausedAt?.blocked?.reason).toContain("excluded");
  });

  it("drafts in Outlook when Outlook is the selected inbox", async () => {
    loadSelectionsMock.mockResolvedValue(new Set(["stripe", "outlook"]));
    const { getConnectedCategories } = await import(
      "@/app/_lib/composio/category-fetcher"
    );
    vi.mocked(getConnectedCategories).mockResolvedValue([
      {
        category: "billing" as never,
        providers: ["stripe"],
        connectionIds: ["ca_stripe"],
      },
      {
        category: "email" as never,
        providers: ["gmail", "outlook"],
        connectionIds: ["ca_gmail", "ca_outlook"],
      },
    ]);
    const { executeConnectorTool } = await import(
      "@/app/_features/plays/services/execute-connector-tool"
    );
    vi.mocked(executeConnectorTool).mockResolvedValue({ ok: true });

    const playbook = {
      name: "Invoice Reminder",
      slug: "invoice-reminder",
      version: "1.0.0",
      description: "Drafts",
      section: "billing" as const,
      layer: "act" as const,
      voice: "billing",
      trigger: { type: "manual" as const },
      tools: ["GMAIL_CREATE_EMAIL_DRAFT"],
      steps: [
        {
          step: "action" as const,
          id: "create_draft",
          tool: "GMAIL_CREATE_EMAIL_DRAFT",
          args: { recipient_email: "dana@acme.com", subject: "s", body: "b" },
          approval: "auto" as const,
        },
      ],
      output: { type: "email_draft" as const, approval: "auto" as const },
    };

    const { executePlaybookV2, buildExecutionContextV2 } = await import("./executor");
    const result = await executePlaybookV2(
      playbook,
      await buildExecutionContextV2(
        "test-workspace",
        "test-user",
        { type: "manual" },
        undefined,
        undefined,
        "invoice-reminder"
      )
    );

    expect(result.status).toBe("success");
    expect(executeConnectorTool).toHaveBeenCalledWith(
      "OUTLOOK_CREATE_DRAFT",
      {
        subject: "s",
        body: "b",
        to_recipients: ["dana@acme.com"],
      },
      expect.objectContaining({
        approvedActions: ["OUTLOOK_CREATE_DRAFT"],
      })
    );
  });

  it("skips the run when no apps are selected for a required category", async () => {
    loadSelectionsMock.mockResolvedValue(new Set());
    const playbook = {
      ...verifyPlaybook(),
      requirements: {
        categories: { required: ["billing" as const], optional: [] },
      },
    };

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(
      playbook,
      await fanoutContext("invoice-reminder")
    );

    expect(result.status).toBe("skipped");
    expect(result.reason).toContain("No apps added");
    expect(sendLlmToolTurnMock).not.toHaveBeenCalled();
  });
});

describe("agent-gated branch (verify-then-draft pattern)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertedRuns.length = 0;
    sendLlmToolTurnMock.mockReset();
  });

  const invoiceContext = {
    invoice: {
      id: "br-1",
      number: "INV-104",
      status: "overdue",
      amount_remaining_cents: 150000,
      days_overdue: 10,
    },
    client: { id: "p-1", name: "Dana", email: "dana@acme.com", kind: "person" },
    payment_history: { on_time: 3, late: 0 },
    open_invoices: [
      { id: "br-1", number: "INV-104", amount_remaining_cents: 150000, days_overdue: 10 },
    ],
  };

  function reminderPlaybook() {
    return {
      name: "Invoice Reminder",
      slug: "invoice-reminder",
      version: "1.1.0",
      description: "Remind",
      section: "billing" as const,
      layer: "act" as const,
      voice: "billing",
      trigger: { type: "signal" as const, signal: "billing_due_date_passed" },
      tools: ["STRIPE_LIST_INVOICES", "GMAIL_CREATE_EMAIL_DRAFT"],
      steps: [
        {
          step: "fetch" as const,
          id: "invoice_context",
          from: "memory.billing_record_context",
        },
        {
          step: "agent" as const,
          id: "verify_unpaid",
          prompt: "Verify: {{invoice_context}}",
          tools: ["STRIPE_LIST_INVOICES"],
          max_calls: 2,
        },
        {
          step: "branch" as const,
          id: "maybe_remind",
          if: "verify_unpaid.text ~= 'VERDICT: PROCEED'",
          steps: [
            {
              step: "classify" as const,
              id: "tier",
              input: "invoice_context",
              rules: [{ if: "invoice.days_overdue >= 21", then: "final" }],
              else: "gentle",
            },
            {
              step: "draft" as const,
              id: "reminder_email",
              prompt: "Draft for {{invoice_context.client.name}}",
            },
            {
              step: "action" as const,
              id: "create_gmail_draft",
              tool: "GMAIL_CREATE_EMAIL_DRAFT",
              args: {
                recipient_email: "{{invoice_context.client.email}}",
                body: "{{reminder_email}}",
              },
              approval: "ask" as const,
            },
          ],
        },
      ],
      output: { type: "email_draft" as const, approval: "ask" as const },
    };
  }

  async function reminderContext() {
    const { buildExecutionContextV2 } = await import("./executor");
    return buildExecutionContextV2("test-workspace", "test-user", {
      type: "signal",
      signalKey: "billing_due_date_passed",
      entityId: "br-1",
      entitySurface: "billing",
      entityLabel: "INV-104",
    });
  }

  it("skips quietly when the agent verdict is SKIP — no draft, no queue card", async () => {
    const { fetchMemorySource } = await import("./memory-fetch");
    vi.mocked(fetchMemorySource).mockResolvedValue(invoiceContext);
    sendLlmToolTurnMock.mockResolvedValueOnce({
      text: "The invoice was paid yesterday. VERDICT: SKIP — already paid",
      toolCalls: [],
      assistantMessage: { role: "assistant", content: "paid" },
    });

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(reminderPlaybook(), await reminderContext());

    expect(result.status).toBe("success");
    expect(result.outputCount).toBe(0);
    // The branch saw the verdict and did not execute.
    const branch = result.stepResults.find((s) => s.stepId === "maybe_remind");
    expect((branch?.data as { executed: boolean }).executed).toBe(false);
    // Nothing drafted, nothing queued for a human.
    expect(result.stepResults.find((s) => s.stepId === "reminder_email")).toBeUndefined();
    expect(insertedRuns.find((r) => r.draft_body)).toBeUndefined();
  });

  it("drafts and pauses for approval when the verdict is PROCEED, draft visible on the card", async () => {
    const { fetchMemorySource } = await import("./memory-fetch");
    vi.mocked(fetchMemorySource).mockResolvedValue(invoiceContext);
    sendLlmToolTurnMock.mockResolvedValueOnce({
      text: "Invoice still open, no prior reminder. VERDICT: PROCEED — $1,500, 10 days overdue",
      toolCalls: [],
      assistantMessage: { role: "assistant", content: "open" },
    });
    sendLlmMock.mockResolvedValue("reminder text");

    const { executePlaybookV2 } = await import("./executor");
    const result = await executePlaybookV2(reminderPlaybook(), await reminderContext());

    expect(result.status).toBe("paused");
    expect(result.pausedAt?.toolSlug).toBe("GMAIL_CREATE_EMAIL_DRAFT");
    expect(result.pausedAt?.args).toMatchObject({
      recipient_email: "dana@acme.com",
      body: "reminder text",
    });

    // Nested steps are visible in the run's step list despite living in a branch.
    expect(result.stepResults.map((s) => s.stepId)).toEqual(
      expect.arrayContaining(["invoice_context", "verify_unpaid", "tier", "reminder_email"])
    );

    // The queued approval card carries the draft the human is approving.
    const queued = insertedRuns.find((r) => r.state === "queued");
    expect(queued).toBeTruthy();
    expect(queued?.draft_body).toBe("reminder text");
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
