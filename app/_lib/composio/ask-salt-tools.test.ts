import { describe, expect, it, vi } from "vitest";
import type { Tool, ToolCallOptions, ToolSet } from "ai";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import {
  ASK_SALT_PRELOAD_TOOL_SLUGS,
  wrapComposioToolsForAskSalt,
} from "./ask-salt-tools";

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
      tool?.execute?.({ to: "", subject: "hi", body: "hello" }, callOptions),
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

describe("ASK_SALT_PRELOAD_TOOL_SLUGS", () => {
  it("only contains Gmail and Calendar slugs", () => {
    expect(ASK_SALT_PRELOAD_TOOL_SLUGS.length).toBeGreaterThan(0);
    for (const slug of ASK_SALT_PRELOAD_TOOL_SLUGS) {
      expect(slug).toMatch(/^(GMAIL_|GOOGLECALENDAR_)/);
    }
  });

  it("never preloads destructive tools", () => {
    expect(ASK_SALT_PRELOAD_TOOL_SLUGS).not.toContain(
      COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    );
  });
});
