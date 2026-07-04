import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tool, ToolCallOptions, ToolSet } from "ai";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { executeComposioAction } from "./actions";
import {
  ASK_SALT_PRELOAD_TOOL_SLUGS,
  wrapComposioToolsForAskSalt,
} from "./ask-salt-tools";

vi.mock("./actions", () => ({
  executeComposioAction: vi.fn(async () => "gate-result"),
}));

beforeEach(() => {
  vi.mocked(executeComposioAction).mockClear();
});

const callOptions = { toolCallId: "call-1", messages: [] } as ToolCallOptions;

function makeTool(execute?: Tool["execute"]): ToolSet[string] {
  return {
    description: "test tool",
    inputSchema: { type: "object" },
    execute: execute ?? vi.fn(async () => "ok"),
  } as unknown as ToolSet[string];
}

describe("wrapComposioToolsForAskSalt", () => {
  it("drops tools without a policy (router meta-tools, unknown toolkit tools)", () => {
    const wrapped = wrapComposioToolsForAskSalt({
      COMPOSIO_MULTI_EXECUTE_TOOL: makeTool(),
      COMPOSIO_SEARCH_TOOLS: makeTool(),
      GMAIL_DELETE_MESSAGE: makeTool(),
      [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
    });

    expect(Object.keys(wrapped)).toEqual([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]);
  });

  it("never registers destructive tools", () => {
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: makeTool(),
    });

    expect(wrapped).toEqual({});
  });

  it("never registers workspace-disabled tools", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      {
        [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
      },
      { disabledTools: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL] },
    );

    expect(Object.keys(wrapped)).toEqual([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]);
  });

  it("requires approval for mutating tools but not read tools", () => {
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
      [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
    });

    expect(wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.needsApproval).toBe(true);
    expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.needsApproval,
    ).toBeUndefined();
  });

});

describe("single-gate execution (5.5.1)", () => {
  const GATE_CONTEXT = {
    workspaceId: "ws-1",
    userId: "user-1",
    connectionIdByToolkit: { gmail: "conn-1" },
  };

  it("routes read tools through executeComposioAction with connection + actor", async () => {
    const sessionExecute = vi.fn(async () => "session-result");
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(sessionExecute) },
      GATE_CONTEXT,
    );

    const result = await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.(
      { query: "from:client" },
      callOptions,
    );

    // The Composio session's own execute is never used — schemas only.
    expect(sessionExecute).not.toHaveBeenCalled();
    expect(result).toBe("gate-result");
    expect(executeComposioAction).toHaveBeenCalledWith(
      COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
      { query: "from:client" },
      "conn-1",
      "ws-1",
      {
        workspaceId: "ws-1",
        actorUserId: "user-1",
        source: "ask_salt",
        humanApproved: undefined,
      },
    );
  });

  it("marks in-thread-approved mutating executions as humanApproved", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool() },
      GATE_CONTEXT,
    );

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.execute?.(
      { recipient_email: "a@b.com", subject: "hi", body: "hello" },
      callOptions,
    );

    expect(executeComposioAction).toHaveBeenCalledWith(
      COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
      expect.anything(),
      "conn-1",
      "ws-1",
      expect.objectContaining({ humanApproved: true }),
    );
  });

  it("refuses to execute without workspace context", async () => {
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
    });

    await expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.({}, callOptions),
    ).rejects.toThrow(/workspace context/);
    expect(executeComposioAction).not.toHaveBeenCalled();
  });

  it("refuses to execute when the toolkit has no active connection", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool() },
      { workspaceId: "ws-1", userId: "user-1", connectionIdByToolkit: {} },
    );

    await expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.({}, callOptions),
    ).rejects.toThrow(/No active connection/);
    expect(executeComposioAction).not.toHaveBeenCalled();
  });
});

describe("trust ladder and email mode", () => {
  const ACT: Record<string, "read_only" | "act_with_approval"> = {
    gmail: "act_with_approval",
    googlecalendar: "act_with_approval",
  };

  it("read-only trust registers zero mutating tools", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      {
        [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
      },
      {
        trustByProvider: { gmail: "read_only" },
        emailMode: "send",
      },
    );

    expect(Object.keys(wrapped)).toEqual([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]);
  });

  it("missing provider trust is treated as read-only", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: makeTool() },
      { trustByProvider: { gmail: "act_with_approval" }, emailMode: "send" },
    );

    expect(wrapped).toEqual({});
  });

  it("draft mode never registers send, but registers draft without approval", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      {
        [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]: makeTool(),
      },
      { trustByProvider: ACT, emailMode: "draft" },
    );

    expect(wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]).toBeUndefined();
    expect(wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]).toBeDefined();
    expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]?.needsApproval,
    ).toBeUndefined();
  });

  it("send mode registers send behind approval", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool() },
      { trustByProvider: ACT, emailMode: "send" },
    );

    expect(wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.needsApproval).toBe(true);
  });
});

describe("ASK_SALT_PRELOAD_TOOL_SLUGS", () => {
  it("only contains slugs for allowlisted per-app toolkits", () => {
    expect(ASK_SALT_PRELOAD_TOOL_SLUGS.length).toBeGreaterThan(0);
    for (const slug of ASK_SALT_PRELOAD_TOOL_SLUGS) {
      expect(slug).toMatch(
        /^(GMAIL_|GOOGLECALENDAR_|GOOGLEDRIVE_|GOOGLEDOCS_|GOOGLESHEETS_|GOOGLESLIDES_|STRIPE_)/,
      );
    }
  });

  it("never preloads destructive tools", () => {
    expect(ASK_SALT_PRELOAD_TOOL_SLUGS).not.toContain(
      COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    );
  });
});
