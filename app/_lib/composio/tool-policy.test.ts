import { describe, expect, it } from "vitest";
import { COMPOSIO_TOOL_SLUGS } from "./tool-slugs";
import {
  assertComposioToolAllowed,
  isPlayApprovedAction,
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

describe("play pre-approval contract", () => {
  const play = {
    approvedActions: [
      COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
      COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_CREATE_EVENT,
    ],
  };

  it("allows a mutating tool the play's consent covers", () => {
    const policy = assertComposioToolAllowed(
      COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL,
      { play },
    );
    expect(policy.risk).toBe("mutating");
    expect(isPlayApprovedAction(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, play)).toBe(
      true,
    );
  });

  it("rejects a mutating tool outside the play's approved actions", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GOOGLEDRIVE_MOVE_FILE, {
        play,
      }),
    ).toThrow(/not in this play's approved actions/);
  });

  it("rejects destructive tools even when a play lists them", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT, {
        play: {
          approvedActions: [COMPOSIO_TOOL_SLUGS.GOOGLECALENDAR_DELETE_EVENT],
        },
      }),
    ).toThrow(/destructive/);
  });

  it("rejects workspace-disabled tools even when play-approved", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL, {
        play,
        disabledTools: [COMPOSIO_TOOL_SLUGS.GMAIL_SEND_EMAIL],
      }),
    ).toThrow(/disabled for this workspace/);
  });

  it("leaves read tools unaffected by play context", () => {
    const policy = assertComposioToolAllowed(
      COMPOSIO_TOOL_SLUGS.GMAIL_LIST_MESSAGES,
      { play: { approvedActions: [] } },
    );
    expect(policy.risk).toBe("read");
  });
});

describe("stripe tool policy", () => {
  it("allows stripe reads in unattended contexts", () => {
    const policy = assertComposioToolAllowed(
      COMPOSIO_TOOL_SLUGS.STRIPE_LIST_INVOICES,
      { unattended: true },
    );
    expect(policy.risk).toBe("read");
  });

  it("requires approval for every stripe write", () => {
    for (const slug of [
      COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_CUSTOMER,
      COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE,
      COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION,
      COMPOSIO_TOOL_SLUGS.STRIPE_CANCEL_SUBSCRIPTION,
      COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_REFUND,
    ]) {
      const policy = assertComposioToolAllowed(slug);
      expect(policy.risk).toBe("mutating");
      expect(policy.requiresHumanConfirmation).toBe(true);
    }
  });

  it("never lets the agent delete a customer", () => {
    expect(() =>
      assertComposioToolAllowed(COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER),
    ).toThrow(/destructive and can never be executed/);
    expect(listAgentExposableToolSlugs()).not.toContain(
      COMPOSIO_TOOL_SLUGS.STRIPE_DELETE_CUSTOMER,
    );
  });

  it("pins invoice creation to draft mode (auto_advance false)", () => {
    const parsed = parseComposioToolInput(COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE, {
      customer: "cus_123",
      description: "June retainer",
    });
    expect(parsed.customer).toBe("cus_123");

    expect(() =>
      parseComposioToolInput(COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_INVOICE, {
        customer: "cus_123",
        auto_advance: true,
      }),
    ).toThrow(/Invalid Composio tool input/);
  });

  it("requires a customer for invoice and subscription creation", () => {
    expect(() =>
      parseComposioToolInput(COMPOSIO_TOOL_SLUGS.STRIPE_CREATE_SUBSCRIPTION, {
        items: [{ price: "price_123" }],
      }),
    ).toThrow(/Invalid Composio tool input/);
  });
});
