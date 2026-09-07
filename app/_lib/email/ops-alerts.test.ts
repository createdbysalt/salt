import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  buildOpsAlertEmail,
  getOpsAlertRecipients,
  sendOpsAlertEmail,
} from "./ops-alerts";

const mockSendEmail = vi.fn().mockResolvedValue({ id: "email-1" });

vi.mock("@/app/_lib/email/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

describe("getOpsAlertRecipients", () => {
  it("prefers OPS_ALERT_EMAIL over the platform admin allowlist", () => {
    expect(
      getOpsAlertRecipients({
        OPS_ALERT_EMAIL: "ops@usesalt.io",
        PLATFORM_ADMIN_EMAILS: "founder@usesalt.io",
      }),
    ).toEqual(["ops@usesalt.io"]);
  });

  it("falls back to PLATFORM_ADMIN_EMAILS", () => {
    expect(
      getOpsAlertRecipients({ PLATFORM_ADMIN_EMAILS: "founder@usesalt.io" }),
    ).toEqual(["founder@usesalt.io"]);
  });

  it("parses comma-separated lists and drops blanks", () => {
    expect(
      getOpsAlertRecipients({
        OPS_ALERT_EMAIL: " a@usesalt.io , , b@usesalt.io ",
      }),
    ).toEqual(["a@usesalt.io", "b@usesalt.io"]);
  });

  it("fails closed when nothing is configured", () => {
    expect(getOpsAlertRecipients({})).toEqual([]);
  });
});

describe("buildOpsAlertEmail", () => {
  it("includes every line in text and html, escaping html", () => {
    const email = buildOpsAlertEmail({
      subject: "Composio canary: 1 slug failing",
      lines: ["slug: OUTLOOK_GET_MESSAGE", "error: <Tool_ToolNotFound>"],
    });
    expect(email.subject).toBe("Composio canary: 1 slug failing");
    expect(email.text).toContain("slug: OUTLOOK_GET_MESSAGE");
    expect(email.text).toContain("error: <Tool_ToolNotFound>");
    expect(email.html).toContain("error: &lt;Tool_ToolNotFound&gt;");
    expect(email.html).not.toContain("<Tool_ToolNotFound>");
  });
});

describe("sendOpsAlertEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  it("sends to the configured recipients", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@usesalt.io";
    const result = await sendOpsAlertEmail({
      subject: "Canary failure",
      lines: ["slug: X"],
    });
    expect(result).toEqual({ sent: true, recipients: ["ops@usesalt.io"] });
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["ops@usesalt.io"],
        subject: "Canary failure",
      }),
    );
  });

  it("no-ops without throwing when no recipients are configured", async () => {
    const result = await sendOpsAlertEmail({
      subject: "Canary failure",
      lines: ["slug: X"],
    });
    expect(result).toEqual({ sent: false, recipients: [] });
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
