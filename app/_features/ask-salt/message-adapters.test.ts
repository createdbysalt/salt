import { describe, expect, it } from "vitest";
import {
  askSaltRowToUIMessage,
  createTextUIMessage,
  rowsToUIMessages,
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
