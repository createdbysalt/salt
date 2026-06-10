import { describe, expect, it } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import {
  assertComposioToolAllowed,
  parseComposioToolInput,
} from "./tool-policy";

describe("composio tool policy", () => {
  it("rejects unknown tool slugs", () => {
    expect(() => assertComposioToolAllowed("EVIL_TOOL")).toThrow(/not allowlisted/);
  });

  it("validates gmail get message input", () => {
    const parsed = parseComposioToolInput(COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE, {
      id: "abc123",
    });
    expect(parsed.id).toBe("abc123");
  });

  it("rejects invalid gmail send input", () => {
    expect(() =>
      parseComposioToolInput(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, {
        to: "",
        subject: "hi",
        body: "hello",
      }),
    ).toThrow(/Invalid Composio tool input/);
  });
});
