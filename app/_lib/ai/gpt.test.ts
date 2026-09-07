import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recordLlmCallMock = vi.fn();
const canSpendMock = vi.fn();

vi.mock("@/app/_lib/usage/record-llm-usage", () => ({
  recordLlmCall: (...args: unknown[]) => recordLlmCallMock(...args),
}));

vi.mock("@/app/_lib/usage/can-spend", () => ({
  canSpend: (...args: unknown[]) => canSpendMock(...args),
  isBlocked: (d: { outcome: string }) =>
    d.outcome === "deny" || d.outcome === "queue",
  shouldDegrade: (d: { outcome: string }) => d.outcome === "degrade",
}));

import {
  backgroundSpend,
  committedSpend,
  platformSpend,
  sendLlm,
  sendLlmToolTurn,
  workspaceSpend,
} from "./gpt";

/**
 * Metering lives inside `sendLlm` rather than at its callers, so these tests
 * are the guarantee that adding a feature cannot silently add unmetered spend.
 */

function okResponse(body: {
  usage?: { prompt_tokens: number; completion_tokens: number };
  content?: string;
}) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content: body.content ?? "answer" } }],
      usage: body.usage,
    }),
  } as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  recordLlmCallMock.mockReset();
  recordLlmCallMock.mockResolvedValue(undefined);

  canSpendMock.mockReset();
  canSpendMock.mockResolvedValue({ outcome: "allow", reason: "ok" });

  vi.stubEnv("OPENAI_API_KEY", "test-key");

  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendLlm spend attribution", () => {
  it("meters a workspace-attributed call with the tokens the provider reported", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ usage: { prompt_tokens: 1200, completion_tokens: 300 } }),
    );

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1", "user-1"), {
      routingKey: "insights",
    });

    expect(recordLlmCallMock).toHaveBeenCalledTimes(1);
    expect(recordLlmCallMock.mock.calls[0][0]).toMatchObject({
      workspaceId: "ws-1",
      usage: { inputTokens: 1200, outputTokens: 300 },
      routingKey: "insights",
    });
  });

  it("does not meter platform-global spend against any workspace", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ usage: { prompt_tokens: 500, completion_tokens: 100 } }),
    );

    await sendLlm(
      [{ role: "user", content: "hi" }],
      platformSpend("catalog-sync-cron", "shared tool catalog"),
    );

    // Charging one tenant for shared infrastructure would be worse than not
    // charging at all.
    expect(recordLlmCallMock).not.toHaveBeenCalled();
  });

  it("sends the workspace id as the provider user when no acting user exists", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1"));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.user).toBe("ws-1");
  });

  it("sends the synthetic actor as the provider user for platform spend", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm(
      [{ role: "user", content: "hi" }],
      platformSpend("catalog-sync-cron", "shared tool catalog"),
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.user).toBe("catalog-sync-cron");
  });

  it("meters the fallback attempt separately, because it is a second real charge", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => "boom" } as Response)
      .mockResolvedValueOnce(
        okResponse({ usage: { prompt_tokens: 10, completion_tokens: 5 } }),
      );

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1", "user-1"), {
      model: "gpt-4o",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Only the successful attempt: a non-2xx response carries no usage block,
    // so metering the failure would mean inventing a number.
    expect(recordLlmCallMock).toHaveBeenCalledTimes(1);
  });

  it("does not meter a call that never reached the provider", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await sendLlm(
      [{ role: "user", content: "hi" }],
      workspaceSpend("ws-1", "user-1"),
    );

    expect(result).toBeNull();
    expect(recordLlmCallMock).not.toHaveBeenCalled();
  });

  it("still returns the answer when metering fails", async () => {
    // The ledger observes the request; it must never be able to break it.
    // Without a dedicated catch, the metering throw lands in sendLlm's outer
    // handler and a working call returns null instead of its answer.
    recordLlmCallMock.mockRejectedValue(new Error("ledger unavailable"));
    fetchMock.mockResolvedValue(okResponse({ content: "the answer" }));

    const result = await sendLlm(
      [{ role: "user", content: "hi" }],
      workspaceSpend("ws-1", "user-1"),
    );

    expect(result).toBe("the answer");
  });
});

describe("sendLlm spend admission", () => {
  it("buys no tokens at all when the workspace is blocked", async () => {
    canSpendMock.mockResolvedValue({ outcome: "deny", reason: "over budget" });

    const result = await sendLlm(
      [{ role: "user", content: "hi" }],
      workspaceSpend("ws-1", "user-1"),
    );

    expect(result).toBeNull();
    // The point of admission is that the request never happens. Checking
    // afterwards would record the spend it was meant to prevent.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(recordLlmCallMock).not.toHaveBeenCalled();
  });

  it("blocks queued background work the same way", async () => {
    canSpendMock.mockResolvedValue({ outcome: "queue", reason: "deferred" });

    const result = await sendLlm(
      [{ role: "user", content: "hi" }],
      backgroundSpend("ws-1"),
    );

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swaps to the cheap model class when degrading", async () => {
    canSpendMock.mockResolvedValue({ outcome: "degrade", reason: "thin margin" });
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1"), {
      routingKey: "opportunityScan", // normally claude-sonnet-4
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe("openai/gpt-4o-mini");
  });

  it("keeps the requested model when there is room in the margin", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1"), {
      routingKey: "opportunityScan",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe("anthropic/claude-sonnet-4");
  });

  it("never gates platform-global spend", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm(
      [{ role: "user", content: "hi" }],
      platformSpend("catalog-sync-cron", "shared tool catalog"),
    );

    // There is no tenant budget to measure shared infrastructure against.
    expect(canSpendMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("defaults to user origin, and passes committed through unchanged", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlm([{ role: "user", content: "hi" }], workspaceSpend("ws-1"));
    expect(canSpendMock.mock.calls[0][0]).toMatchObject({ origin: "user" });

    await sendLlm([{ role: "user", content: "hi" }], committedSpend("ws-1"));
    expect(canSpendMock.mock.calls[1][0]).toMatchObject({ origin: "committed" });
  });

  it("still runs approved play work when the workspace is over budget", async () => {
    // canSpend resolves committed work to degrade, never deny — this asserts
    // sendLlm honours that rather than blocking anyway. Abandoning a play
    // mid-run leaves side effects applied and nothing to show for them.
    canSpendMock.mockResolvedValue({ outcome: "degrade", reason: "over budget" });
    fetchMock.mockResolvedValue(okResponse({ content: "drafted" }));

    const result = await sendLlm(
      [{ role: "user", content: "hi" }],
      committedSpend("ws-1", "user-1"),
      { routingKey: "playDraft" },
    );

    expect(result).toBe("drafted");
  });
});

describe("sendLlmToolTurn", () => {
  const tools = [
    {
      name: "STRIPE_LIST_CHARGES",
      description: "List Stripe charges",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  ];

  function toolCallResponse(toolCalls: Array<{
    id: string;
    name: string;
    arguments: string;
  }>) {
    return {
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: null,
              tool_calls: toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: { name: call.name, arguments: call.arguments },
              })),
            },
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 40 },
      }),
    } as Response;
  }

  it("sends tool definitions in OpenAI function format", async () => {
    fetchMock.mockResolvedValue(okResponse({}));

    await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
      { routingKey: "playAgent" },
    );

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "STRIPE_LIST_CHARGES",
          description: "List Stripe charges",
          parameters: tools[0].parameters,
        },
      },
    ]);
    expect(body.tool_choice).toBe("auto");
  });

  it("parses tool calls with JSON arguments", async () => {
    fetchMock.mockResolvedValue(
      toolCallResponse([
        { id: "call_1", name: "STRIPE_LIST_CHARGES", arguments: '{"limit":5}' },
      ]),
    );

    const turn = await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
    );

    expect(turn?.toolCalls).toEqual([
      { id: "call_1", name: "STRIPE_LIST_CHARGES", args: { limit: 5 } },
    ]);
    expect(turn?.text).toBeNull();
    // The assistant message is replayable into the next turn's history.
    expect(turn?.assistantMessage).toMatchObject({
      role: "assistant",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "STRIPE_LIST_CHARGES", arguments: '{"limit":5}' },
        },
      ],
    });
  });

  it("returns text and no tool calls when the model finishes", async () => {
    fetchMock.mockResolvedValue(okResponse({ content: "All charges look fine." }));

    const turn = await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
    );

    expect(turn?.toolCalls).toEqual([]);
    expect(turn?.text).toBe("All charges look fine.");
  });

  it("falls back to empty args on malformed tool-call JSON", async () => {
    fetchMock.mockResolvedValue(
      toolCallResponse([
        { id: "call_1", name: "STRIPE_LIST_CHARGES", arguments: "{not json" },
      ]),
    );

    const turn = await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
    );

    expect(turn?.toolCalls).toEqual([
      { id: "call_1", name: "STRIPE_LIST_CHARGES", args: {} },
    ]);
  });

  it("meters every turn through the same primitive as sendLlm", async () => {
    fetchMock.mockResolvedValue(
      toolCallResponse([
        { id: "call_1", name: "STRIPE_LIST_CHARGES", arguments: "{}" },
      ]),
    );

    await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
      { routingKey: "playAgent" },
    );

    expect(recordLlmCallMock).toHaveBeenCalledTimes(1);
    expect(recordLlmCallMock.mock.calls[0][0]).toMatchObject({
      workspaceId: "ws-1",
      usage: { inputTokens: 500, outputTokens: 40 },
      routingKey: "playAgent",
    });
  });

  it("honours admission refusal exactly like sendLlm", async () => {
    canSpendMock.mockResolvedValue({ outcome: "deny", reason: "over budget" });

    const turn = await sendLlmToolTurn(
      [{ role: "user", content: "check charges" }],
      tools,
      workspaceSpend("ws-1"),
    );

    expect(turn).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
