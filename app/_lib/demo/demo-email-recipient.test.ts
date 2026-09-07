import { describe, expect, it } from "vitest";

import {
  applyDemoEmailRecipient,
  demoRecipientForWorkspace,
} from "./demo-email-recipient";

const DEMO_WORKSPACE = "11111111-1111-1111-1111-111111111111";
const ENV = {
  SALT_DEMO_WORKSPACE_IDS: ` ${DEMO_WORKSPACE} , other-workspace-id `,
  SALT_DEMO_RECIPIENT_EMAIL: "demo@usesalt.io",
};

describe("demoRecipientForWorkspace", () => {
  it("returns the recipient for a flagged workspace", () => {
    expect(demoRecipientForWorkspace(DEMO_WORKSPACE, ENV)).toBe("demo@usesalt.io");
  });

  it("returns null for an unflagged workspace", () => {
    expect(demoRecipientForWorkspace("someone-else", ENV)).toBeNull();
  });

  it("returns null when either env var is missing", () => {
    expect(demoRecipientForWorkspace(DEMO_WORKSPACE, { SALT_DEMO_WORKSPACE_IDS: DEMO_WORKSPACE })).toBeNull();
    expect(demoRecipientForWorkspace(DEMO_WORKSPACE, { SALT_DEMO_RECIPIENT_EMAIL: "demo@usesalt.io" })).toBeNull();
  });
});

describe("applyDemoEmailRecipient", () => {
  it("is a no-op when the env flags are not set", () => {
    const params = {
      recipient_email: "nina@artisancoffee.co",
      subject: "Invoice INV-2026-048",
      body: "Hi Nina",
      cc: ["billing@artisancoffee.co"],
    };
    const result = applyDemoEmailRecipient("GMAIL_SEND_EMAIL", params, DEMO_WORKSPACE);
    expect(result).toEqual(params);
  });

  it("rewrites the Gmail recipient when the workspace is flagged", () => {
    process.env.SALT_DEMO_WORKSPACE_IDS = DEMO_WORKSPACE;
    process.env.SALT_DEMO_RECIPIENT_EMAIL = "demo@usesalt.io";
    try {
      const result = applyDemoEmailRecipient(
        "GMAIL_SEND_EMAIL",
        {
          recipient_email: "nina@artisancoffee.co",
          subject: "Invoice INV-2026-048",
          body: "Hi Nina",
          cc: ["billing@artisancoffee.co"],
          bcc: ["books@example.com"],
        },
        DEMO_WORKSPACE
      );
      expect(result).toEqual({
        recipient_email: "demo@usesalt.io",
        subject: "Invoice INV-2026-048",
        body: "Hi Nina",
      });
    } finally {
      delete process.env.SALT_DEMO_WORKSPACE_IDS;
      delete process.env.SALT_DEMO_RECIPIENT_EMAIL;
    }
  });

  it("rewrites Outlook recipients as a list", () => {
    process.env.SALT_DEMO_WORKSPACE_IDS = DEMO_WORKSPACE;
    process.env.SALT_DEMO_RECIPIENT_EMAIL = "demo@usesalt.io";
    try {
      const result = applyDemoEmailRecipient(
        "OUTLOOK_CREATE_DRAFT",
        { to_recipients: ["nina@artisancoffee.co"], subject: "Hi", cc_recipients: ["x@y.z"] },
        DEMO_WORKSPACE
      );
      expect(result).toEqual({
        to_recipients: ["demo@usesalt.io"],
        subject: "Hi",
      });
    } finally {
      delete process.env.SALT_DEMO_WORKSPACE_IDS;
      delete process.env.SALT_DEMO_RECIPIENT_EMAIL;
    }
  });

  it("leaves non-email tools untouched even in a demo workspace", () => {
    process.env.SALT_DEMO_WORKSPACE_IDS = DEMO_WORKSPACE;
    process.env.SALT_DEMO_RECIPIENT_EMAIL = "demo@usesalt.io";
    try {
      const params = { customer: "cus_123", amount: 100 };
      expect(applyDemoEmailRecipient("STRIPE_CREATE_INVOICE", params, DEMO_WORKSPACE)).toEqual(params);
    } finally {
      delete process.env.SALT_DEMO_WORKSPACE_IDS;
      delete process.env.SALT_DEMO_RECIPIENT_EMAIL;
    }
  });

  it("passes through non-object params", () => {
    process.env.SALT_DEMO_WORKSPACE_IDS = DEMO_WORKSPACE;
    process.env.SALT_DEMO_RECIPIENT_EMAIL = "demo@usesalt.io";
    try {
      expect(applyDemoEmailRecipient("GMAIL_SEND_EMAIL", null, DEMO_WORKSPACE)).toBeNull();
    } finally {
      delete process.env.SALT_DEMO_WORKSPACE_IDS;
      delete process.env.SALT_DEMO_RECIPIENT_EMAIL;
    }
  });
});
