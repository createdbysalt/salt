import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallOptions } from "ai";
import { loadAskSaltPlaybook, resolveAskSaltPlaybooks } from "./playbook-index";
import { createPlayRunFromTemplate } from "@/app/_features/plays/services/create-play-run";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { buildPlaybookTools } from "./playbook-tools";

vi.mock("./playbook-index", () => ({
  loadAskSaltPlaybook: vi.fn(),
  resolveAskSaltPlaybooks: vi.fn(async () => []),
}));

vi.mock("@/app/_features/plays/services/create-play-run", () => ({
  createPlayRunFromTemplate: vi.fn(),
}));

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: vi.fn(async () => undefined),
}));

const mockSupabaseFrom = vi.fn();
vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockSupabaseFrom,
  })),
}));

function setupMockSupabase(overrides: {
  people?: { id: string; display_name: string; email: string } | null;
  organizations?: { id: string; name: string } | null;
  work?: { id: string; name: string } | null;
} = {}) {
  mockSupabaseFrom.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        is: () => ({
          ilike: () => ({
            limit: () => ({
              maybeSingle: async () => {
                if (table === "people") return { data: overrides.people ?? null, error: null };
                if (table === "organizations") return { data: overrides.organizations ?? null, error: null };
                if (table === "work") return { data: overrides.work ?? null, error: null };
                return { data: null, error: null };
              },
            }),
          }),
        }),
      }),
    }),
  }));
}

const callOptions = { toolCallId: "c1", messages: [] } as ToolCallOptions;
const OPTS = { workspaceId: "ws-1", userId: "user-1" };

const detail = {
  templateId: "tpl-1",
  slug: "reengage",
  name: "Re-engage quiet clients",
  description: null,
  whenToUse: "client quiet 30 days",
  requiredActions: ["GMAIL_CREATE_EMAIL_DRAFT"],
  playerSlug: "concierge",
  procedureMd: "1. Draft a friendly check-in.",
  approvalRequired: true,
  hasActingSteps: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  setupMockSupabase();
});

async function runTool(tool: ReturnType<typeof buildPlaybookTools>[string], input: unknown) {
  if (typeof tool.execute !== "function") throw new Error("tool has no execute");
  return tool.execute(input, callOptions);
}

describe("load_playbook", () => {
  it("returns the procedure and approval boundary for an adopted playbook", async () => {
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(detail);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.load_playbook, { slug: "reengage" })) as {
      found: boolean;
      procedure: string;
      approvalRequired: boolean;
    };

    expect(result.found).toBe(true);
    expect(result.procedure).toContain("friendly check-in");
    expect(result.approvalRequired).toBe(true);
  });

  it("reports available slugs when the playbook is not adopted", async () => {
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(null);
    vi.mocked(resolveAskSaltPlaybooks).mockResolvedValue([
      { ...detail, slug: "other" } as never,
    ]);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.load_playbook, { slug: "missing" })) as {
      found: boolean;
      availableSlugs: string[];
    };

    expect(result.found).toBe(false);
    expect(result.availableSlugs).toEqual(["other"]);
  });
});

describe("propose_play", () => {
  it("queues a play_run via the typed engine and never executes directly", async () => {
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(detail);
    vi.mocked(createPlayRunFromTemplate).mockResolvedValue({
      ok: true,
      value: { runId: "run-9", title: "Check in with Dana", state: "queued" },
    });
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.propose_play, {
      slug: "reengage",
      title: "Check in with Dana",
      summary: "Draft a friendly note",
    })) as { queued: boolean; runId: string };

    expect(result.queued).toBe(true);
    expect(result.runId).toBe("run-9");
    expect(createPlayRunFromTemplate).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      templateId: "tpl-1",
      title: "Check in with Dana",
      preview: "Draft a friendly note",
    });
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", source: "ask_salt" }),
    );
  });

  it("does not queue when the playbook is not adopted", async () => {
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(null);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.propose_play, {
      slug: "missing",
      title: "x",
    })) as { queued: boolean };

    expect(result.queued).toBe(false);
    expect(createPlayRunFromTemplate).not.toHaveBeenCalled();
  });

  it("surfaces a queue failure as queued:false", async () => {
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(detail);
    vi.mocked(createPlayRunFromTemplate).mockResolvedValue({
      ok: false,
      error: "This playbook is turned off in this workspace.",
    });
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.propose_play, {
      slug: "reengage",
      title: "x",
    })) as { queued: boolean; message: string; errorId: string };

    expect(result.queued).toBe(false);
    expect(result.message).toMatch(/Something went wrong while queueing that play/i);
    expect(result.message).not.toMatch(/turned off/i);
    expect(result.errorId).toMatch(/^SALT-[A-F0-9]{8}$/);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("resolves entity names to IDs and passes contextInputs", async () => {
    setupMockSupabase({
      people: { id: "person-123", display_name: "Dana Chen", email: "dana@example.com" },
      organizations: { id: "org-456", name: "Acme Corp" },
    });
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(detail);
    vi.mocked(createPlayRunFromTemplate).mockResolvedValue({
      ok: true,
      value: { runId: "run-10", title: "Invoice Acme", state: "queued" },
    });
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.propose_play, {
      slug: "reengage",
      title: "Invoice Acme",
      personName: "Dana",
      orgName: "Acme",
    })) as { queued: boolean; runId: string };

    expect(result.queued).toBe(true);
    expect(createPlayRunFromTemplate).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      templateId: "tpl-1",
      title: "Invoice Acme",
      preview: undefined,
      contextInputs: {
        person_id: "person-123",
        person_name: "Dana Chen",
        person_email: "dana@example.com",
        org_id: "org-456",
        org_name: "Acme Corp",
      },
    });
  });

  it("omits contextInputs when no entities are resolved", async () => {
    setupMockSupabase({ people: null, organizations: null });
    vi.mocked(loadAskSaltPlaybook).mockResolvedValue(detail);
    vi.mocked(createPlayRunFromTemplate).mockResolvedValue({
      ok: true,
      value: { runId: "run-11", title: "Generic", state: "queued" },
    });
    const tools = buildPlaybookTools(OPTS);

    await runTool(tools.propose_play, {
      slug: "reengage",
      title: "Generic",
      personName: "Unknown Person",
    });

    expect(createPlayRunFromTemplate).toHaveBeenCalledWith({
      workspaceId: "ws-1",
      templateId: "tpl-1",
      title: "Generic",
      preview: undefined,
      contextInputs: undefined,
    });
  });
});

describe("draft_playbook", () => {
  it("returns a valid draft for a simple playbook", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "Weekly Status Email",
      description: "Sends a weekly status update to clients",
      whenToUse: "When user asks to send a weekly update",
      procedureMd: "1. Gather project updates\n2. Draft email\n3. Send to client",
      definition: {
        version: 1,
        steps: [
          {
            kind: "render",
            template: "Weekly update for {{run.clientName}}",
            bind: "emailBody",
          },
          {
            kind: "act",
            tool: "GMAIL_SEND_EMAIL",
            params: { to: "{{run.clientEmail}}", body: "{{emailBody}}" },
          },
        ],
      },
    })) as { drafted: boolean; draft: { slug: string; isValid: boolean } };

    expect(result.drafted).toBe(true);
    expect(result.draft.slug).toBe("weekly-status-email");
    expect(result.draft.isValid).toBe(true);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", risk: "read" }),
    );
  });

  it("rejects playbooks with memory-mutating actions", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "Auto Create Person",
      description: "Automatically creates a person record",
      whenToUse: "When finding new contacts",
      procedureMd: "1. Create person",
      definition: {
        version: 1,
        steps: [
          {
            kind: "act",
            tool: "memory_create_person",
            params: { name: "Test" },
          },
        ],
      },
    })) as { drafted: boolean; errors: string[] };

    expect(result.drafted).toBe(false);
    expect(result.errors.some((e) => e.includes("Memory"))).toBe(true);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });

  it("rejects empty definition steps", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "Empty Playbook",
      description: "Has no steps",
      whenToUse: "Never",
      procedureMd: "Nothing",
      definition: {
        version: 1,
        steps: [],
      },
    })) as { drafted: boolean; errors: string[] };

    expect(result.drafted).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("defaults trigger to chat type for user playbooks", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "Simple Playbook",
      description: "A test playbook",
      whenToUse: "When testing",
      procedureMd: "1. Test",
      definition: {
        version: 1,
        steps: [{ kind: "render", template: "Test", bind: "output" }],
      },
    })) as { drafted: boolean; draft: { trigger: { type: string } } };

    expect(result.drafted).toBe(true);
    expect(result.draft.trigger.type).toBe("chat");
  });

  it("validates required fields", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "",
      description: "",
      whenToUse: "",
      procedureMd: "",
      definition: {
        version: 1,
        steps: [{ kind: "render", template: "x", bind: "y" }],
      },
    })) as { drafted: boolean; errors: string[] };

    expect(result.drafted).toBe(false);
    expect(result.errors.some((e) => e.includes("Name"))).toBe(true);
  });

  it("includes requiredActions for acting steps", async () => {
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.draft_playbook, {
      name: "Email Playbook",
      description: "Sends an email",
      whenToUse: "When emailing",
      procedureMd: "1. Send email",
      definition: {
        version: 1,
        steps: [
          { kind: "act", tool: "GMAIL_SEND_EMAIL", params: {} },
        ],
      },
    })) as { drafted: boolean; draft: { requiredActions: string[] } };

    expect(result.drafted).toBe(true);
    expect(result.draft.requiredActions).toContain("GMAIL_SEND_EMAIL");
  });
});
