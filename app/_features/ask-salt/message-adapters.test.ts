import { describe, expect, it } from "vitest";
import {
  askSaltRowToUIMessage,
  createTextUIMessage,
  isIncompleteToolPart,
  rowsToUIMessages,
  stripIncompleteToolParts,
  uiMessageText,
  uiMessageToPersistPayload,
} from "./message-adapters";
import type { AskSaltMessageRow } from "./types";

function makeRow(overrides: Partial<AskSaltMessageRow>): AskSaltMessageRow {
  return {
    id: "row-1",
    conversation_id: "conv-1",
    role: "assistant",
    content: "Hello there",
    metadata: null,
    created_at: "2026-06-11T00:00:00Z",
    ...overrides,
  };
}

describe("askSaltRowToUIMessage", () => {
  it("synthesizes a text part for legacy rows without parts", () => {
    const message = askSaltRowToUIMessage(makeRow({ content: "Legacy reply" }));
    expect(message.id).toBe("row-1");
    expect(message.role).toBe("assistant");
    expect(message.parts).toEqual([{ type: "text", text: "Legacy reply" }]);
    expect(message.metadata).toBeUndefined();
  });

  it("uses saved parts when metadata.parts exists", () => {
    const parts = [
      { type: "text", text: "Result" },
      { type: "tool-GMAIL_SEND_EMAIL", state: "output-available" },
    ];
    const message = askSaltRowToUIMessage(
      makeRow({ metadata: { parts, kind: "chat" } }),
    );
    expect(message.parts).toEqual(parts);
    expect(message.metadata).toEqual({ kind: "chat" });
  });

  it("keeps connector metadata for inline-connect restoration", () => {
    const message = askSaltRowToUIMessage(
      makeRow({
        content: "Connect Google to get started.",
        metadata: {
          kind: "connector",
          inlineAction: { connectorId: "gmail", name: "Google" },
          showBrowseConnectors: false,
          suggestions: ["What's connected?"],
        },
      }),
    );
    expect(message.parts).toEqual([
      { type: "text", text: "Connect Google to get started." },
    ]);
    expect(message.metadata).toMatchObject({
      kind: "connector",
      inlineAction: { connectorId: "gmail" },
      suggestions: ["What's connected?"],
    });
  });
});

describe("rowsToUIMessages", () => {
  it("merges legacy and parts rows in row order", () => {
    const rows = [
      makeRow({ id: "a", role: "user", content: "Create a new Play" }),
      makeRow({ id: "b", role: "assistant", content: "What should it do?" }),
      makeRow({
        id: "c",
        role: "assistant",
        content: "Tool result",
        metadata: { parts: [{ type: "text", text: "Tool result" }], kind: "chat" },
      }),
    ];
    const messages = rowsToUIMessages(rows);
    expect(messages.map((m) => m.id)).toEqual(["a", "b", "c"]);
    expect(messages.map((m) => m.role)).toEqual(["user", "assistant", "assistant"]);
  });
});

describe("uiMessageToPersistPayload", () => {
  it("preserves file parts in metadata", () => {
    const message = {
      id: "m1",
      role: "user" as const,
      parts: [
        { type: "text" as const, text: "Review this" },
        {
          type: "file" as const,
          filename: "proposal.pdf",
          mediaType: "application/pdf",
          url: "data:application/pdf;base64,abc",
        },
      ],
    };

    const payload = uiMessageToPersistPayload(message);
    expect(payload.content).toBe("Review this");
    expect(payload.metadata.parts).toEqual(message.parts);
  });

  it("round-trips text and parts with metadata preserved", () => {
    const message = createTextUIMessage("assistant", "Saved reply", {
      kind: "starter",
    });
    const payload = uiMessageToPersistPayload(message);
    expect(payload.content).toBe("Saved reply");
    expect(payload.metadata.kind).toBe("starter");
    expect(payload.metadata.parts).toEqual([{ type: "text", text: "Saved reply" }]);
  });
});

describe("createTextUIMessage / uiMessageText", () => {
  it("creates a text message with a unique id and extracts its text", () => {
    const a = createTextUIMessage("user", "Hi");
    const b = createTextUIMessage("user", "Hi");
    expect(a.id).not.toBe(b.id);
    expect(uiMessageText(a)).toBe("Hi");
  });

  it("joins multiple text parts and ignores tool parts", () => {
    const text = uiMessageText({
      id: "m",
      role: "assistant",
      parts: [
        { type: "text", text: "One" },
        { type: "step-start" } as never,
        { type: "text", text: "Two" },
      ],
    });
    expect(text).toBe("One\nTwo");
  });
});

describe("stripIncompleteToolParts", () => {
  it("detects stuck tool parts", () => {
    expect(
      isIncompleteToolPart({
        type: "tool-memory_create_person",
        state: "approval-requested",
        toolCallId: "call-1",
      } as never),
    ).toBe(true);
    expect(
      isIncompleteToolPart({
        type: "tool-memory_create_person",
        state: "output-available",
        toolCallId: "call-1",
      } as never),
    ).toBe(false);
  });

  it("removes approval-requested tools from assistant history", () => {
    const messages = stripIncompleteToolParts([
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "yes please" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "text", text: "Creating Liam…" },
          {
            type: "tool-memory_create_person",
            state: "approval-requested",
            toolCallId: "tool_memory_create_person_533YMC2cOaVXKZWvTZzb",
          } as never,
        ],
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[1]?.parts).toEqual([{ type: "text", text: "Creating Liam…" }]);
  });

  it("sanitizes poisoned rows when restoring from the database", () => {
    const message = askSaltRowToUIMessage(
      makeRow({
        metadata: {
          kind: "chat",
          parts: [
            { type: "text", text: "Tool result" },
            {
              type: "tool-memory_create_person",
              state: "approval-requested",
              toolCallId: "call-stale",
            },
          ],
        },
      }),
    );

    expect(message.parts).toEqual([{ type: "text", text: "Tool result" }]);
  });

  it("does not persist incomplete tool parts", () => {
    const payload = uiMessageToPersistPayload({
      id: "a1",
      role: "assistant",
      parts: [
        { type: "text", text: "Working…" },
        {
          type: "tool-memory_create_person",
          state: "input-available",
          toolCallId: "call-2",
        } as never,
      ],
    });

    expect(payload.metadata.parts).toEqual([{ type: "text", text: "Working…" }]);
  });
});
