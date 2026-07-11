import { describe, expect, it } from "vitest";
import {
  ASK_SALT_KEEP_RECENT_MESSAGES,
  ASK_SALT_MESSAGES_BUDGET_CHARS,
  ASK_SALT_ROLLING_WINDOW_TRIGGER,
  buildEarlierConversationRecap,
  compactAskSaltMessagesForModel,
  compactToolResultForAskSalt,
} from "./context-budget";
import type { UIMessage } from "ai";

describe("compactToolResultForAskSalt", () => {
  it("truncates long strings but keeps structure", () => {
    const result = compactToolResultForAskSalt({
      messages: [{ subject: "Hi", body: "x".repeat(20_000) }],
    });
    const body = (result as { messages: Array<{ body: string }> }).messages[0]?.body;
    expect(body).toContain("chars total");
    expect(body.length).toBeLessThan(10_000);
  });

  it("replaces oversized entire results with a retry hint", () => {
    const huge = { items: Array.from({ length: 500 }, (_, i) => ({ id: i, body: "z".repeat(500) })) };
    const result = compactToolResultForAskSalt(huge) as { truncated?: boolean; message?: string };
    expect(result.truncated).toBe(true);
    expect(result.message).toContain("narrower query");
  });
});

describe("compactAskSaltMessagesForModel", () => {
  function assistantWithTool(text: string, output: unknown): UIMessage {
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      parts: [
        { type: "text", text },
        {
          type: "tool-GMAIL_FETCH_EMAILS",
          state: "output-available",
          toolCallId: crypto.randomUUID(),
          output,
        } as never,
      ],
    };
  }

  it("omits tool parts from older assistant turns", () => {
    const messages: UIMessage[] = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "find simon email" }] },
      assistantWithTool("searching", { body: "a".repeat(30_000) }),
      { id: "u2", role: "user", parts: [{ type: "text", text: "not that one" }] },
      assistantWithTool("trying again", { body: "b".repeat(30_000) }),
      { id: "u3", role: "user", parts: [{ type: "text", text: "still wrong" }] },
      assistantWithTool("third try", { body: "d".repeat(30_000) }),
      { id: "u4", role: "user", parts: [{ type: "text", text: "one more" }] },
      assistantWithTool("latest", { body: "c".repeat(30_000) }),
      { id: "u5", role: "user", parts: [{ type: "text", text: "did you find it?" }] },
    ];

    const { messages: compacted, omittedOlderToolParts, messagesChars } =
      compactAskSaltMessagesForModel(messages);

    expect(omittedOlderToolParts).toBe(true);
    expect(messagesChars).toBeLessThan(ASK_SALT_MESSAGES_BUDGET_CHARS);

    const firstAssistant = compacted[1];
    expect(firstAssistant?.parts.some((p) => p.type === "text" && p.text.includes("shortened"))).toBe(
      true,
    );
    expect(firstAssistant?.parts.some((p) => String(p.type).startsWith("tool-"))).toBe(false);

    const lastAssistant = compacted.at(-2);
    expect(lastAssistant?.parts.some((p) => String(p.type).startsWith("tool-"))).toBe(true);
  });

  it("strips data-url file attachments from model context", () => {
    const messages: UIMessage[] = [
      {
        id: "u1",
        role: "user",
        parts: [
          { type: "text", text: "review this" },
          {
            type: "file",
            filename: "big.pdf",
            mediaType: "application/pdf",
            url: `data:application/pdf;base64,${"A".repeat(50_000)}`,
          },
        ],
      },
    ];

    const { messages: compacted } = compactAskSaltMessagesForModel(messages);
    const filePart = compacted[0]?.parts.find((p) => p.type === "file") as { url?: string };
    expect(filePart?.url).toContain("omitted");
  });

  it("rolls older turns into a text recap and keeps a recent window", () => {
    const messages: UIMessage[] = Array.from({ length: ASK_SALT_ROLLING_WINDOW_TRIGGER + 2 }, (_, i) => ({
      id: `m-${i}`,
      role: i % 2 === 0 ? "user" : "assistant",
      parts: [{ type: "text", text: `Turn ${i} about Simon's email` }],
    })) as UIMessage[];

    const { messages: compacted, earlierRecap, rolledOlderMessages } =
      compactAskSaltMessagesForModel(messages);

    expect(rolledOlderMessages).toBe(true);
    expect(compacted.length).toBe(ASK_SALT_KEEP_RECENT_MESSAGES);
    expect(earlierRecap).toContain("Turn 0 about Simon");
    expect(earlierRecap).toContain("User:");
  });

  it("builds a text-only recap without tool payloads", () => {
    const recap = buildEarlierConversationRecap([
      { id: "u1", role: "user", parts: [{ type: "text", text: "find simon" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Searching Gmail" },
          { type: "tool-GMAIL_FETCH_EMAILS", state: "output-available", output: { huge: "x".repeat(10_000) } } as never,
        ],
      },
    ]);

    expect(recap).toContain("find simon");
    expect(recap).toContain("Searching Gmail");
    expect(recap).not.toContain("x".repeat(100));
  });
});
