import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallOptions } from "ai";
import {
  loadAskSaltPlaybook,
  resolveAskSaltBlueprints,
  resolveAskSaltPlaybooks,
} from "./playbook-index";
import { togglePlaybookEnabled } from "@/app/_features/plays/actions/playbook-settings";
import { getPlaybookBySlug } from "@/app/_features/plays/playbooks/schema/v2/discovery";
import { logToolExecution } from "@/app/_lib/composio/execution-log";
import { buildPlaybookTools } from "./playbook-tools";

vi.mock("./playbook-index", () => ({
  loadAskSaltPlaybook: vi.fn(),
  resolveAskSaltPlaybooks: vi.fn(async () => []),
  resolveAskSaltBlueprints: vi.fn(async () => []),
}));

vi.mock("@/app/_features/plays/actions/playbook-settings", () => ({
  togglePlaybookEnabled: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/app/_features/plays/playbooks/schema/v2/discovery", () => ({
  getPlaybookBySlug: vi.fn(),
}));

vi.mock("@/app/_lib/composio/execution-log", () => ({
  logToolExecution: vi.fn(async () => undefined),
}));

vi.mock("@/app/_lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: vi.fn() })),
}));

const callOptions = { toolCallId: "c1", messages: [] } as ToolCallOptions;
const OPTS = { workspaceId: "ws-1", userId: "user-1" };

const detail = {
  slug: "reengage",
  name: "Re-engage quiet clients",
  description: null,
  whenToUse: "client quiet 30 days",
  requiredActions: ["GMAIL_CREATE_EMAIL_DRAFT"],
  voice: "concierge",
  procedureMd: "1. Draft a friendly check-in.",
  approvalRequired: true,
  hasActingSteps: true,
  chatContract: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function runTool(tool: ReturnType<typeof buildPlaybookTools>[string], input: unknown) {
  if (typeof tool.execute !== "function") throw new Error("tool has no execute");
  return tool.execute(input, callOptions);
}

describe("load_playbook", () => {
  it("returns the procedure and approval boundary for an enabled playbook", async () => {
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

  it("reports available slugs when the playbook is not enabled", async () => {
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

describe("enable_playbook", () => {
  it("enables a disabled act-layer playbook via the settings toggle", async () => {
    vi.mocked(getPlaybookBySlug).mockReturnValue({
      definition: {
        slug: "reengage",
        name: "Re-engage quiet clients",
        layer: "act",
        steps: [{ step: "action", tool: "GMAIL_CREATE_EMAIL_DRAFT" }],
      },
    } as never);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.enable_playbook, { slug: "reengage" })) as {
      enabled: boolean;
      name: string;
    };

    expect(result.enabled).toBe(true);
    expect(result.name).toBe("Re-engage quiet clients");
    expect(togglePlaybookEnabled).toHaveBeenCalledWith("reengage", true);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "success",
        source: "ask_salt",
        toolSlug: "enable_playbook:reengage",
      }),
    );
  });

  it("reports available slugs when the playbook does not exist", async () => {
    vi.mocked(getPlaybookBySlug).mockReturnValue(null);
    vi.mocked(resolveAskSaltBlueprints).mockResolvedValue([
      { ...detail, slug: "other" } as never,
    ]);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.enable_playbook, { slug: "missing" })) as {
      enabled: boolean;
      availableSlugs: string[];
    };

    expect(result.enabled).toBe(false);
    expect(result.availableSlugs).toEqual(["other"]);
    expect(togglePlaybookEnabled).not.toHaveBeenCalled();
  });

  it("refuses to enable learn-layer (Memory Care) packages", async () => {
    vi.mocked(getPlaybookBySlug).mockReturnValue({
      definition: { slug: "memory-notes", name: "Notes", layer: "learn" },
    } as never);
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.enable_playbook, { slug: "memory-notes" })) as {
      enabled: boolean;
    };

    expect(result.enabled).toBe(false);
    expect(togglePlaybookEnabled).not.toHaveBeenCalled();
  });

  it("surfaces a toggle failure as enabled:false without leaking internals", async () => {
    vi.mocked(getPlaybookBySlug).mockReturnValue({
      definition: {
        slug: "reengage",
        name: "Re-engage quiet clients",
        layer: "act",
        steps: [{ step: "action", tool: "GMAIL_CREATE_EMAIL_DRAFT" }],
      },
    } as never);
    vi.mocked(togglePlaybookEnabled).mockResolvedValue({
      success: false,
      error: "row level security violated",
    });
    const tools = buildPlaybookTools(OPTS);

    const result = (await runTool(tools.enable_playbook, { slug: "reengage" })) as {
      enabled: boolean;
      message: string;
      errorId: string;
    };

    expect(result.enabled).toBe(false);
    expect(result.message).not.toMatch(/row level security/i);
    expect(result.errorId).toMatch(/^SALT-[A-F0-9]{8}$/);
    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error" }),
    );
  });
});

describe("tool surface", () => {
  it("no longer exposes the retired queue handoff or v1 adoption tools", () => {
    const tools = buildPlaybookTools(OPTS);

    expect(Object.keys(tools).sort()).toEqual([
      "draft_playbook",
      "enable_playbook",
      "get_play_run_status",
      "load_playbook",
    ]);
    expect("propose_play" in tools).toBe(false);
    expect("adopt_playbook" in tools).toBe(false);
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
