import { describe, expect, it } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import {
  assertComposioToolAllowed,
  listAgentExposableToolSlugs,
  parseComposioToolInput,
} from "./tool-policy";

describe("composio tool policy", () => {
  it("rejects unknown tool slugs", () => {
    expect(() => assertComposioToolAllowed("EVIL_TOOL")).toThrow(/not allowlisted/);
  });

  it("rejects destructive tools even with no other restrictions", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT),
    ).toThrow(/destructive and can never be executed/);
  });

  it("rejects mutating tools in unattended contexts", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, {
        unattended: true,
      }),
    ).toThrow(/cannot run in an unattended context/);
  });

  it("allows read tools in unattended contexts", () => {
    const policy = assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES, {
      unattended: true,
    });
    expect(policy.risk).toBe("read");
  });

  it("never exposes destructive tools to the agent", () => {
    expect(listAgentExposableToolSlugs()).not.toContain(
      COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT,
    );
    expect(listAgentExposableToolSlugs()).toContain(
      COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
    );
  });

  it("rejects disabled workspace tools", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, {
        disabledTools: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
      }),
    ).toThrow(/disabled for this workspace/);
  });

  it("allows tools not present in disabledTools", () => {
    const policy = assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES, {
      disabledTools: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
    });
    expect(policy.risk).toBe("read");
  });

  it("validates gmail get message input", () => {
    const parsed = parseComposioToolInput(COMPOSIO_TOOL_SLUGS.GMAIL_GET_MESSAGE, {
      message_id: "abc123",
    });
    expect(parsed.message_id).toBe("abc123");
  });

  it("rejects invalid gmail send input", () => {
    expect(() =>
      parseComposioToolInput(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, {
        recipient_email: "",
        subject: "hi",
        body: "hello",
      }),
    ).toThrow(/Invalid Composio tool input/);
  });

  it("accepts the real gmail draft input shape", () => {
    const parsed = parseComposioToolInput(COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT, {
      recipient_email: "client@example.com",
      subject: "Follow-up",
      body: "Hi there",
      bcc: ["copy@example.com"],
    });
    expect(parsed.recipient_email).toBe("client@example.com");
  });

  it("draft creation is mutating but does not require approval", () => {
    const policy = assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_CREATE_DRAFT);
    expect(policy.risk).toBe("mutating");
    expect(policy.requiresHumanConfirmation).toBe(false);
  });
});
