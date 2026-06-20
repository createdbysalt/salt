import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tool, ToolCallOptions, ToolSet } from "ai";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { logToolExecution } from "./execution-log";
import {
  ASK_SALT_PRELOAD_TOOL_SLUGS,
  wrapComposioToolsForAskSalt,
} from "./ask-salt-tools";

vi.mock("./execution-log", () => ({
  logToolExecution: vi.fn(async () => undefined),
}));

beforeEach(() => {
  vi.mocked(logToolExecution).mockClear();
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

  it("rejects invalid tool arguments before reaching Composio", async () => {
    const execute = vi.fn(async () => "sent");
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(execute),
    });

    const tool = wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL];
    await expect(
      tool?.execute?.(
        { recipient_email: "", subject: "hi", body: "hello" },
        callOptions,
      ),
    ).rejects.toThrow(/Invalid Composio tool input/);
    expect(execute).not.toHaveBeenCalled();
  });

  it("passes validated arguments through to the original execute", async () => {
    const execute = vi.fn(async () => ["msg"]);
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(execute),
    });

    const tool = wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES];
    await tool?.execute?.({ query: "from:client", maxResults: 10 }, callOptions);

    expect(execute).toHaveBeenCalledWith(
      { query: "from:client", maxResults: 10 },
      callOptions,
    );
  });
});

describe("audit logging in the Ask Salt path", () => {
  it("logs successful executions with workspace, actor, and summarized args", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool() },
      { workspaceId: "ws-1", userId: "user-1" },
    );

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.(
      { query: "from:client" },
      callOptions,
    );

    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
        userId: "user-1",
        toolSlug: COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
        risk: "read",
        source: "ask_salt",
        status: "success",
        approvedBy: null,
      }),
    );
  });

  it("records the approver on mutating executions", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool() },
      { workspaceId: "ws-1", userId: "user-1" },
    );

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.execute?.(
      { recipient_email: "a@b.com", subject: "hi", body: "hello" },
      callOptions,
    );

    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", approvedBy: "user-1" }),
    );
  });

  it("logs blocked executions when input validation fails", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool() },
      { workspaceId: "ws-1", userId: "user-1" },
    );

    await expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.execute?.(
        { to: "", subject: "hi", body: "hello" },
        callOptions,
      ),
    ).rejects.toThrow();

    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "blocked" }),
    );
  });

  it("logs failed executions with the error message", async () => {
    const failing = vi.fn(async () => {
      throw new Error("Gmail API unavailable");
    });
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(failing) },
      { workspaceId: "ws-1", userId: "user-1" },
    );

    await expect(
      wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.({}, callOptions),
    ).rejects.toThrow("Gmail API unavailable");

    expect(logToolExecution).toHaveBeenCalledWith(
      expect.objectContaining({ status: "error", error: "Gmail API unavailable" }),
    );
  });

  it("skips logging when no workspace context is provided", async () => {
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
    });

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.({}, callOptions);

    expect(logToolExecution).not.toHaveBeenCalled();
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
