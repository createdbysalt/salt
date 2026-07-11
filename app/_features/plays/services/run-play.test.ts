import { describe, expect, it, vi } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import type { OpportunityGapRow, PlayRunRow, PlayTemplateRow } from "../types";
import {
  executePlayRun,
  type RunPlayDeps,
  type RunPlayStepJournalEntry,
} from "./run-play";

const MUTATING_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT;

const WORKSPACE_ID = "studio-1";
const RUN_ID = "run-1";
const TEMPLATE_ID = "template-1";
const APPROVER = "user-approver";

function makeRun(overrides: Partial<PlayRunRow> = {}): PlayRunRow {
  return {
    id: RUN_ID,
    workspace_id: WORKSPACE_ID,
    player_id: null,
    prepared_by_player_id: null,
    template_id: TEMPLATE_ID,
    opportunity_gap_id: null,
    owner_member_id: null,
    owner_team_id: null,
    space_id: null,
    target_type: null,
    target_id: null,
    target_label: null,
    state: "executing",
    title: "Follow up with Maya",
    preview: null,
    recipient_label: "Maya",
    channel: "Gmail",
    channels: [],
    draft_body: "Hi Maya — checking in.",
    confidence: 90,
    eta_label: null,
    scheduled_for: null,
    approved_at: null,
    ran_at: null,
    dismissed_at: null,
    last_error: null,
    metadata: {},
    value_kind: null,
    value_amount: null,
    value_currency: null,
    value_basis: null,
    value_attributed_at: null,
    created_at: "2026-06-12T00:00:00.000Z",
    updated_at: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeTemplate(overrides: Partial<PlayTemplateRow> = {}): PlayTemplateRow {
  return {
    id: TEMPLATE_ID,
    workspace_id: WORKSPACE_ID,
    player_id: null,
    slug: "follow-up",
    name: "Follow-up",
    description: null,
    default_channel: "Gmail",
    is_active: true,
    required_actions: [MUTATING_TOOL],
    approved_actions: [MUTATING_TOOL],
    actions_approved_by: APPROVER,
    actions_approved_at: "2026-06-12T00:00:00.000Z",
    definition: {
      version: 1,
      steps: [
        { kind: "render", template: "Hi {{run.recipient_label}}", bind: "body" },
        { kind: "act", tool: MUTATING_TOOL, params: { body: "{{body}}" } },
      ],
    },
    procedure_md: "# Follow-up",
    blueprint_slug: null,
    blueprint_version: null,
    created_at: "2026-06-12T00:00:00.000Z",
    updated_at: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeGap(overrides: Partial<OpportunityGapRow> = {}): OpportunityGapRow {
  return {
    id: "gap-1",
    workspace_id: WORKSPACE_ID,
    claim: "Unbilled work",
    summary: null,
    amount_min: 450,
    amount_max: 900,
    currency: "USD",
    confidence: 80,
    category: "billing",
    is_primary: true,
    sources: [],
    dismissed_at: null,
    created_at: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

function makeDeps(options: {
  run?: PlayRunRow | null;
  template?: PlayTemplateRow | null;
  gap?: OpportunityGapRow | null;
  trust?: "read_only" | "act_with_approval";
  auditOk?: boolean;
  /** Slug a capability step resolves to (null = nothing connected → skip). */
  capabilityTool?: string | null;
}): RunPlayDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    claimRun: vi.fn(async () => {
      calls.push("claimRun");
      return options.run === undefined ? makeRun() : options.run;
    }),
    loadTemplate: vi.fn(async () => {
      calls.push("loadTemplate");
      return options.template === undefined ? makeTemplate() : options.template;
    }),
    loadGap: vi.fn(async () => {
      calls.push("loadGap");
      return options.gap ?? null;
    }),
    getWorkspaceTrustLevel: vi.fn(async () => {
      calls.push("getTrust");
      return options.trust ?? "act_with_approval";
    }),
    checkToolkitStatus: vi.fn(async () => {
      calls.push("checkToolkitStatus");
      return [];
    }),
    recordActivity: vi.fn(async () => {
      calls.push("recordActivity");
      return options.auditOk ?? true;
    }),
    executeTool: vi.fn(async (tool: string) => {
      calls.push(`executeTool:${tool}`);
      return { id: "ext-123" };
    }),
    resolveCapability: vi.fn(async (capability: string) => {
      calls.push(`resolveCapability:${capability}`);
      return options.capabilityTool ?? null;
    }),
    runLlmStep: vi.fn(async (_step, _inputs, context) => {
      calls.push(`runLlmStep:${context.playerSlug ?? "null"}`);
      return "personalized";
    }),
    journalSteps: vi.fn(async () => {
      calls.push("journalSteps");
    }),
    finalizeRun: vi.fn(async (_runId, _workspaceId, patch) => {
      calls.push(`finalizeRun:${String(patch.state)}`);
      return makeRun({ state: patch.state as PlayRunRow["state"] });
    }),
    now: () => "2026-06-12T12:00:00.000Z",
  };
}

describe("executePlayRun", () => {
  it("fails with CLAIM_FAILED when the atomic claim returns nothing", async () => {
    const deps = makeDeps({ run: null });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "CLAIM_FAILED" });
    expect(deps.executeTool).not.toHaveBeenCalled();
    expect(deps.finalizeRun).not.toHaveBeenCalled();
  });

  it("runs render → act and finalizes to ran with the interpolated body", async () => {
    const deps = makeDeps({});
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: true, outcome: "ran" });
    expect(deps.executeTool).toHaveBeenCalledWith(
      MUTATING_TOOL,
      { body: "Hi Maya" },
      { workspaceId: WORKSPACE_ID, actorUserId: APPROVER, approvedActions: [MUTATING_TOOL] },
    );
    // Audit intent must land BEFORE the external call.
    const auditIndex = deps.calls.indexOf("recordActivity");
    const actIndex = deps.calls.indexOf(`executeTool:${MUTATING_TOOL}`);
    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(auditIndex).toBeLessThan(actIndex);
  });

  it("skips without acting when a guard fails, dismissing the run", async () => {
    const template = makeTemplate({
      definition: {
        version: 1,
        steps: [
          { kind: "guard", path: "run.confidence", op: "gte", value: 95 },
          { kind: "act", tool: MUTATING_TOOL, params: {} },
        ],
      },
    });
    const deps = makeDeps({ template });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: true, outcome: "skipped" });
    expect(deps.executeTool).not.toHaveBeenCalled();
    expect(deps.calls).toContain("finalizeRun:dismissed");
  });

  it("fails closed when consent does not cover the act slug", async () => {
    const template = makeTemplate({ approved_actions: [] });
    const deps = makeDeps({ template });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "CONSENT_MISSING" });
    expect(deps.executeTool).not.toHaveBeenCalled();
    expect(deps.calls).toContain("finalizeRun:failed");
  });

  it("fails closed when consent has no recorded approver", async () => {
    const template = makeTemplate({ actions_approved_by: null });
    const deps = makeDeps({ template });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "CONSENT_MISSING" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  // A capability-based act step is an acting step: it must go through the same
  // trust + consent gates as a tool-slug act step (authorization_bypass regression).
  const capabilityActTemplate = (overrides: Partial<PlayTemplateRow> = {}) =>
    makeTemplate({
      required_actions: ["capability:send_message"],
      approved_actions: ["capability:send_message"],
      definition: {
        version: 1,
        steps: [
          { kind: "render", template: "Hi", bind: "body" },
          { kind: "act", capability: "send_message", params: { body: "{{body}}" } },
        ],
      },
      ...overrides,
    });

  it("blocks a capability act step at read_only trust", async () => {
    const deps = makeDeps({
      trust: "read_only",
      template: capabilityActTemplate(),
      capabilityTool: "GMAIL_SEND_EMAIL",
    });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "TRUST_READ_ONLY" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("blocks a capability act step when consent doesn't cover it", async () => {
    const deps = makeDeps({
      template: capabilityActTemplate({ approved_actions: [] }),
      capabilityTool: "GMAIL_SEND_EMAIL",
    });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "CONSENT_MISSING" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("runs an approved capability act step with the resolved slug approved", async () => {
    const deps = makeDeps({
      template: capabilityActTemplate(),
      capabilityTool: "GMAIL_SEND_EMAIL",
    });
    await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(deps.executeTool).toHaveBeenCalledWith(
      "GMAIL_SEND_EMAIL",
      expect.anything(),
      expect.objectContaining({ approvedActions: expect.arrayContaining(["GMAIL_SEND_EMAIL"]) }),
    );
  });

  it("fails closed at read_only trust", async () => {
    const deps = makeDeps({ trust: "read_only" });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "TRUST_READ_ONLY" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("fails closed when the template is paused (kill switch)", async () => {
    const template = makeTemplate({ is_active: false });
    const deps = makeDeps({ template });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "TEMPLATE_INACTIVE" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("aborts without acting when the audit intent write fails", async () => {
    const deps = makeDeps({ auditOk: false });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "AUDIT_WRITE_FAILED" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("does not re-execute act steps already in the journal (idempotent resume)", async () => {
    const priorJournal: RunPlayStepJournalEntry[] = [
      {
        index: 0,
        kind: "render",
        status: "completed",
        boundValue: "Hi Maya",
        completedAt: "2026-06-12T11:00:00.000Z",
      },
      {
        index: 1,
        kind: "act",
        status: "completed",
        externalId: "ext-prev",
        completedAt: "2026-06-12T11:00:01.000Z",
      },
    ];
    const deps = makeDeps({ run: makeRun({ metadata: { steps: priorJournal } }) });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: true, outcome: "ran" });
    expect(deps.executeTool).not.toHaveBeenCalled();
  });

  it("finalizes to failed with last_error when a tool throws", async () => {
    const deps = makeDeps({});
    (deps.executeTool as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Composio exploded"),
    );
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: false, code: "EXECUTION_FAILED" });
    expect(deps.finalizeRun).toHaveBeenCalledWith(
      RUN_ID,
      WORKSPACE_ID,
      expect.objectContaining({ state: "failed", last_error: "Composio exploded" }),
    );
  });

  it("writes conservative estimated value from the linked gap", async () => {
    const template = makeTemplate({
      definition: {
        version: 1,
        steps: [
          { kind: "render", template: "Hi {{run.recipient_label}}", bind: "body" },
          { kind: "act", tool: MUTATING_TOOL, params: { body: "{{body}}" } },
        ],
        value: { kind: "gap_closed", fromGap: true },
      },
    });
    const deps = makeDeps({
      run: makeRun({ opportunity_gap_id: "gap-1" }),
      template,
      gap: makeGap(),
    });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result.ok).toBe(true);
    expect(deps.finalizeRun).toHaveBeenCalledWith(
      RUN_ID,
      WORKSPACE_ID,
      expect.objectContaining({
        state: "ran",
        value_kind: "gap_closed",
        value_amount: 450, // amount_min — never overclaim
        value_basis: "estimated",
        value_currency: "USD",
      }),
    );
  });

  it("runs llm steps through the injected model seam and binds the output", async () => {
    const template = makeTemplate({
      definition: {
        version: 1,
        steps: [
          {
            kind: "llm",
            purpose: "personalize",
            modelSlot: "playPersonalize",
            instructions: "Personalize the opener.",
            inputs: ["run.recipient_label"],
            maxTokens: 200,
            bind: "opener",
          },
          { kind: "render", template: "{{opener}} — Salt", bind: "body" },
          { kind: "act", tool: MUTATING_TOOL, params: { body: "{{body}}" } },
        ],
      },
    });
    const deps = makeDeps({ template });
    const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);
    expect(result).toMatchObject({ ok: true, outcome: "ran" });
    expect(deps.runLlmStep).toHaveBeenCalledOnce();
    expect(deps.executeTool).toHaveBeenCalledWith(
      MUTATING_TOOL,
      { body: "personalized — Salt" },
      expect.anything(),
    );
  });

  describe("pacing guard for General player", () => {
    it("blocks when recipient was contacted within 24h by another play", async () => {
      const run = makeRun({
        player_slug: "general",
        target_type: "person",
        target_id: "person-123",
      });
      const deps = makeDeps({ run });
      deps.checkRecipientPacing = vi.fn(async () => ({
        runId: "blocking-run",
        ranAt: "2026-06-12T10:00:00.000Z",
        title: "Previous outreach",
      }));
      deps.logPacingGuardHit = vi.fn(async () => undefined);

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: false, code: "PACING_BLOCKED" });
      expect(deps.checkRecipientPacing).toHaveBeenCalledWith(
        "person-123",
        "person",
        WORKSPACE_ID,
        RUN_ID,
      );
      expect(deps.logPacingGuardHit).toHaveBeenCalledWith({
        blockedRunId: RUN_ID,
        blockingRunId: "blocking-run",
        recipientId: "person-123",
        recipientType: "person",
        workspaceId: WORKSPACE_ID,
      });
      expect(deps.executeTool).not.toHaveBeenCalled();
    });

    it("proceeds when no recent contact with recipient", async () => {
      const run = makeRun({
        player_slug: "general",
        target_type: "person",
        target_id: "person-123",
      });
      const deps = makeDeps({ run });
      deps.checkRecipientPacing = vi.fn(async () => null);

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: true, outcome: "ran" });
      expect(deps.executeTool).toHaveBeenCalled();
    });

    it("skips pacing check for non-general players", async () => {
      const run = makeRun({
        player_slug: "billing",
        target_type: "person",
        target_id: "person-123",
      });
      const deps = makeDeps({ run });
      deps.checkRecipientPacing = vi.fn();

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: true, outcome: "ran" });
      expect(deps.checkRecipientPacing).not.toHaveBeenCalled();
    });

    it("skips pacing check when no recipient info", async () => {
      const run = makeRun({
        player_slug: "general",
        target_type: null,
        target_id: null,
      });
      const deps = makeDeps({ run });
      deps.checkRecipientPacing = vi.fn();

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: true, outcome: "ran" });
      expect(deps.checkRecipientPacing).not.toHaveBeenCalled();
    });
  });

  /**
   * Security invariant: User-created playbooks (General player) cannot bypass
   * the consent gate via PlayApprovalContext. The context is derived from
   * template.approved_actions, which is always [] for user playbooks until
   * explicit consent is granted through the UI.
   */
  describe("General player consent gate (security)", () => {
    const userPlaybookTemplate = (
      overrides: Partial<PlayTemplateRow> = {},
    ): PlayTemplateRow =>
      makeTemplate({
        // User playbooks are created with empty consent
        approved_actions: [],
        actions_approved_by: null,
        // But they have required actions from their definition
        required_actions: [MUTATING_TOOL],
        ...overrides,
      });

    it("blocks user playbook when approved_actions is empty (save-time default)", async () => {
      const run = makeRun({ player_slug: "general" });
      const template = userPlaybookTemplate();
      const deps = makeDeps({ run, template });

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: false, code: "CONSENT_MISSING" });
      expect(deps.executeTool).not.toHaveBeenCalled();
    });

    it("blocks user playbook when actions_approved_by is null (save-time default)", async () => {
      const run = makeRun({ player_slug: "general" });
      // Even if approved_actions somehow got populated, null approver blocks
      const template = userPlaybookTemplate({
        approved_actions: [MUTATING_TOOL],
        actions_approved_by: null,
      });
      const deps = makeDeps({ run, template });

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: false, code: "CONSENT_MISSING" });
      expect(deps.executeTool).not.toHaveBeenCalled();
    });

    it("allows user playbook only with explicit consent (both fields populated)", async () => {
      const run = makeRun({ player_slug: "general" });
      // Consent granted through UI would populate both fields
      const template = userPlaybookTemplate({
        approved_actions: [MUTATING_TOOL],
        actions_approved_by: APPROVER,
      });
      const deps = makeDeps({ run, template });

      const result = await executePlayRun(RUN_ID, WORKSPACE_ID, deps);

      expect(result).toMatchObject({ ok: true, outcome: "ran" });
      expect(deps.executeTool).toHaveBeenCalled();
    });
  });
});
