import { describe, expect, it, vi } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "@/app/_lib/composio/tool-slugs";
import { dryRunPlaybook, type DryRunDeps } from "./dry-run-play";

const FETCH_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE;
const SEND_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL;
const DRAFT_TOOL = COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT;

describe("dryRunPlaybook", () => {
  const WORKSPACE_ID = "ws-1";

  it("validates the definition before running", async () => {
    const result = await dryRunPlaybook(
      { version: 1, steps: [] },
      {},
      WORKSPACE_ID,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("at least 1");
    }
  });

  it("executes render steps and binds values", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "render", template: "Hello {{run.recipient_label}}", bind: "greeting" },
        ],
      },
      { recipientLabel: "Maya" },
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.status).toBe("completed");
      expect(result.steps[0]?.boundValue).toBe("Hello Maya");
      expect(result.context.greeting).toBe("Hello Maya");
    }
  });

  it("marks act steps as would_act without executing", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "render", template: "Body text", bind: "body" },
          { kind: "act", tool: SEND_TOOL, params: { body: "{{body}}" } },
        ],
      },
      {},
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.steps).toHaveLength(2);
      expect(result.steps[1]?.kind).toBe("act");
      expect(result.steps[1]?.status).toBe("would_act");
      expect(result.steps[1]?.boundValue).toEqual({ body: "Body text" });
      expect(result.actStepsWouldRun).toBe(1);
    }
  });

  it("stops at guard failure", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "guard", path: "run.confidence", op: "gte", value: 90 },
          { kind: "render", template: "After guard", bind: "output" },
        ],
      },
      {},
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.status).toBe("skipped");
      expect(result.guardsPassed).toBe(false);
      expect(result.context.output).toBeUndefined();
    }
  });

  it("passes guard when condition met", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "guard", path: "run.channel", op: "exists" },
          { kind: "render", template: "Passed guard", bind: "output" },
        ],
      },
      { channel: "Gmail" },
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.guardsPassed).toBe(true);
      expect(result.context.output).toBe("Passed guard");
    }
  });

  it("uses mock data for fetch steps when no deps provided", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "fetch", tool: FETCH_TOOL, params: {}, bind: "message" },
          { kind: "render", template: "Fetched", bind: "output" },
        ],
      },
      {},
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.steps[0]?.status).toBe("completed");
      expect(result.context.message).toMatchObject({ _preview: true });
    }
  });

  it("calls executeFetchTool when provided", async () => {
    const deps: DryRunDeps = {
      executeFetchTool: vi.fn(async () => ({ subject: "Re: Invoice" })),
    };

    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "fetch", tool: FETCH_TOOL, params: { id: "123" }, bind: "email" },
        ],
      },
      {},
      WORKSPACE_ID,
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.executeFetchTool).toHaveBeenCalledWith(
      FETCH_TOOL,
      { id: "123" },
      WORKSPACE_ID,
    );
    if (result.ok) {
      expect(result.context.email).toEqual({ subject: "Re: Invoice" });
    }
  });

  it("uses placeholder for LLM steps when no deps provided", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          {
            kind: "llm",
            purpose: "personalize greeting",
            modelSlot: "playPersonalize",
            instructions: "Make it friendly",
            inputs: [],
            maxTokens: 100,
            bind: "greeting",
          },
        ],
      },
      {},
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context.greeting).toContain("personalize greeting");
    }
  });

  it("calls runLlmStep when provided", async () => {
    const deps: DryRunDeps = {
      runLlmStep: vi.fn(async () => "Hey there, friend!"),
    };

    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          {
            kind: "llm",
            purpose: "personalize",
            modelSlot: "playPersonalize",
            instructions: "Be friendly",
            inputs: ["run.recipient_label"],
            maxTokens: 100,
            bind: "greeting",
          },
        ],
      },
      { recipientLabel: "Dana" },
      WORKSPACE_ID,
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.runLlmStep).toHaveBeenCalled();
    if (result.ok) {
      expect(result.context.greeting).toBe("Hey there, friend!");
    }
  });

  it("counts multiple act steps", async () => {
    const result = await dryRunPlaybook(
      {
        version: 1,
        steps: [
          { kind: "act", tool: SEND_TOOL, params: {} },
          { kind: "act", tool: DRAFT_TOOL, params: {} },
        ],
      },
      {},
      WORKSPACE_ID,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.actStepsWouldRun).toBe(2);
    }
  });
});
