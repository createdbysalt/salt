import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Tool, ToolCallOptions, ToolSet } from "ai";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import { executeComposioAction } from "./actions";
import { createPlayRecord } from "@/app/_features/plays/lib/play-record";
import {
  composioToolNameAliases,
  resolveComposioToolName,
  wrapComposioToolsForAskSalt,
} from "./ask-salt-tools";

vi.mock("./actions", () => ({
  executeComposioAction: vi.fn(async () => "gate-result"),
}));

vi.mock("@/app/_features/plays/lib/play-record", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/app/_features/plays/lib/play-record")>()),
  createPlayRecord: vi.fn(async () => ({
    playId: "run-1",
    queue: "auto_handled" as const,
    state: "ran",
  })),
}));

beforeEach(() => {
  vi.mocked(executeComposioAction).mockClear();
  vi.mocked(createPlayRecord).mockClear();
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

    expect(Object.keys(wrapped)).toEqual(
      expect.arrayContaining([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]),
    );
    expect(Object.keys(wrapped)).toHaveLength(2);
  });

  it("never registers destructive tools", () => {
    const wrapped = wrapComposioToolsForAskSalt({
      [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT]: makeTool(),
    });

    expect(wrapped).toEqual({});
  });

  it("requires approval for mutating tools but not read tools (act_with_approval mode)", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      {
        [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool(),
      },
      {
        trustByProvider: { gmail: "act_with_approval" },
        emailModeByProvider: { gmail: "send" },
      },
    );

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

  // Pricing §1: a standalone external action counts as one billable play, and
  // billability is derived from the slugs on the record. Drop this and the send
  // still happens — it just stops being charged for.
  it("passes the executed slug to the play record so the play meters as billable", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool() },
      GATE_CONTEXT,
    );

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.execute?.(
      { recipient_email: "a@b.com", subject: "hi", body: "hello" },
      callOptions,
    );

    expect(createPlayRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "ran",
        executedToolSlugs: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
      }),
    );
  });

  it("does not create a play record for read tools", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]: makeTool() },
      GATE_CONTEXT,
    );

    await wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]?.execute?.({}, callOptions);

    expect(createPlayRecord).not.toHaveBeenCalled();
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
        emailModeByProvider: { gmail: "send" },
      },
    );

    expect(Object.keys(wrapped)).toEqual(
      expect.arrayContaining([COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES]),
    );
    expect(Object.keys(wrapped)).toHaveLength(2);
  });

  it("missing provider trust is treated as read-only", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT]: makeTool() },
      { trustByProvider: { gmail: "act_with_approval" }, emailModeByProvider: { gmail: "send" } },
    );

    expect(wrapped).toEqual({});
  });

  it("draft mode never registers send, but registers draft without approval", () => {
    const wrapped = wrapComposioToolsForAskSalt(
      {
        [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]: makeTool(),
        [COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT]: makeTool(),
      },
      { trustByProvider: ACT, emailModeByProvider: { gmail: "draft" } },
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
      { trustByProvider: ACT, emailModeByProvider: { gmail: "send" } },
    );

    expect(wrapped[COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL]?.needsApproval).toBe(true);
  });
});

describe("composio tool name aliases", () => {
  it("generates lowercase aliases for uppercase Composio slugs", () => {
    expect(composioToolNameAliases("GOOGLEDOCS_GET_DOCUMENT_BY_ID")).toEqual([
      "googledocs_get_document_by_id",
    ]);
  });

  it("registers lowercase aliases that execute through the canonical slug", async () => {
    const wrapped = wrapComposioToolsForAskSalt(
      { [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT]: makeTool() },
      {
        workspaceId: "ws-1",
        userId: "user-1",
        connectionIdByToolkit: { googledocs: "conn-docs" },
      },
    );

    expect(wrapped[COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT]).toBeDefined();
    expect(wrapped.googledocs_get_document_by_id).toBeDefined();

    await wrapped.googledocs_get_document_by_id?.execute?.(
      { id: "doc-1" },
      callOptions,
    );

    expect(executeComposioAction).toHaveBeenCalledWith(
      COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT,
      { id: "doc-1" },
      "conn-docs",
      "ws-1",
      expect.objectContaining({ source: "ask_salt" }),
    );
  });

  it("resolves case-insensitive tool names against the active tool set", () => {
    const tools = {
      [COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT]: makeTool(),
      googledocs_get_document_by_id: makeTool(),
    };

    expect(
      resolveComposioToolName("googledocs_get_document_by_id", tools),
    ).toBe("googledocs_get_document_by_id");
    expect(
      resolveComposioToolName("GOOGLEDOCS_GET_DOCUMENT_BY_ID", tools),
    ).toBe(COMPOSIO_TOOL_SLUGS.GOOGLEDOCS_GET_DOCUMENT);
  });
});
