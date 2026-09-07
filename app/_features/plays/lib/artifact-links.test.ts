import { describe, it, expect } from "vitest";
import {
  applyGmailAuthUser,
  collapseInboxArtifacts,
  upsertInboxDraftArtifact,
  extractArtifactUrl,
  inboxComposeUrl,
  pickDashboardUrl,
  resolveDraftInboxLink,
} from "./artifact-links";

describe("extractArtifactUrl", () => {
  it("links a Stripe charge to the dashboard payment page", () => {
    const response = { data: [{ id: "ch_3Pabc123", amount: 400000 }] };
    expect(extractArtifactUrl("STRIPE_LIST_CHARGES", response)).toBe(
      "https://dashboard.stripe.com/payments/ch_3Pabc123"
    );
  });

  it("prefers hosted_invoice_url for Stripe invoices", () => {
    const response = {
      data: [{ id: "in_123", hosted_invoice_url: "https://invoice.stripe.com/i/acct/in_123" }],
    };
    expect(extractArtifactUrl("STRIPE_LIST_INVOICES", response)).toBe(
      "https://invoice.stripe.com/i/acct/in_123"
    );
  });

  it("falls back to the dashboard invoice URL when hosted_invoice_url is absent", () => {
    const response = { data: [{ id: "in_123" }] };
    expect(extractArtifactUrl("STRIPE_CREATE_INVOICE", response)).toBe(
      "https://dashboard.stripe.com/invoices/in_123"
    );
  });

  it("opens a Gmail draft in compose, not the #drafts hash", () => {
    const response = { data: { id: "r-904512345", message: { id: "18abc" } } };
    expect(extractArtifactUrl("GMAIL_CREATE_EMAIL_DRAFT", response)).toBe(
      "https://mail.google.com/mail/#inbox?compose=18abc"
    );
  });

  it("links a sent Gmail message to its thread", () => {
    const response = { data: { id: "m1", threadId: "t-777" } };
    expect(extractArtifactUrl("GMAIL_SEND_EMAIL", response)).toBe(
      "https://mail.google.com/mail/#all/t-777"
    );
  });

  it("uses the event htmlLink for Google Calendar events", () => {
    const response = {
      data: { id: "evt1", htmlLink: "https://calendar.google.com/calendar/event?eid=evt1" },
    };
    expect(extractArtifactUrl("GOOGLECALENDAR_CREATE_EVENT", response)).toBe(
      "https://calendar.google.com/calendar/event?eid=evt1"
    );
  });

  it("builds a Slack permalink from channel + ts", () => {
    const response = { data: { channel: "C0123ABC", ts: "1724861234.567890" } };
    expect(extractArtifactUrl("SLACK_CHAT_POST_MESSAGE", response)).toBe(
      "https://slack.com/archives/C0123ABC/p1724861234567890"
    );
  });

  it("links a QuickBooks invoice to QBO", () => {
    const response = { data: { Id: "1042" } };
    expect(extractArtifactUrl("QUICKBOOKS_CREATE_INVOICE", response)).toBe(
      "https://app.qbo.intuit.com/app/invoice?txnId=1042"
    );
  });

  it("unwraps unwrapped single-object responses", () => {
    expect(extractArtifactUrl("STRIPE_LIST_CHARGES", { id: "ch_solo" })).toBe(
      "https://dashboard.stripe.com/payments/ch_solo"
    );
  });

  it("returns null for tools without an extractor (generic fallback handles them)", () => {
    expect(extractArtifactUrl("NOTION_CREATE_PAGE", { data: { id: "x" } })).toBeNull();
  });

  it("returns null instead of throwing on malformed responses", () => {
    expect(extractArtifactUrl("STRIPE_LIST_CHARGES", null)).toBeNull();
    expect(extractArtifactUrl("STRIPE_LIST_CHARGES", "garbage")).toBeNull();
    expect(extractArtifactUrl("GMAIL_SEND_EMAIL", { data: {} })).toBeNull();
    expect(extractArtifactUrl("SLACK_CHAT_POST_MESSAGE", { data: { channel: "C1" } })).toBeNull();
  });
});

describe("inboxComposeUrl", () => {
  it("builds a query-string Gmail compose URL that survives the first load", () => {
    const url = inboxComposeUrl({
      appId: "google",
      subject: "Payment reminder",
      body: "Hi Frank,\nJust a reminder.",
    });
    expect(url.startsWith("https://mail.google.com/mail/?view=cm&fs=1&tf=1&")).toBe(
      true
    );
    expect(url).toContain("su=Payment+reminder");
    expect(url).toContain("body=Hi+Frank");
    expect(url).not.toContain("#");
  });

  it("builds an Outlook compose deeplink", () => {
    expect(
      inboxComposeUrl({
        appId: "outlook",
        to: "frank@example.com",
        subject: "Payment reminder",
      })
    ).toBe(
      "https://outlook.office.com/mail/deeplink/compose?to=frank%40example.com&subject=Payment+reminder"
    );
  });
});

describe("applyGmailAuthUser", () => {
  it("pins a draft URL to the connected Gmail account", () => {
    expect(
      applyGmailAuthUser(
        "https://mail.google.com/mail/u/0/#inbox?compose=18abc",
        "gabriella@studio.com"
      )
    ).toBe(
      "https://mail.google.com/mail/?authuser=gabriella%40studio.com#inbox?compose=18abc"
    );
  });

  it("leaves non-Gmail URLs alone", () => {
    expect(
      applyGmailAuthUser("https://outlook.office.com/mail/deeplink/compose", "a@b.com")
    ).toBe("https://outlook.office.com/mail/deeplink/compose");
  });

  it("strips /mail/u/0/ even when the connected email is unknown", () => {
    expect(
      applyGmailAuthUser("https://mail.google.com/mail/u/0/#inbox?compose=18abc")
    ).toBe("https://mail.google.com/mail/#inbox?compose=18abc");
  });
});

describe("collapseInboxArtifacts", () => {
  it("keeps one Gmail row and the latest draft URL", () => {
    expect(
      collapseInboxArtifacts([
        { appId: "google", label: "Draft in Gmail", url: "https://mail.google.com/mail/#inbox?compose=old" },
        { appId: "stripe", label: "Invoice", url: "https://dashboard.stripe.com/invoices/1" },
        { appId: "google", label: "Draft in Gmail", url: "https://mail.google.com/mail/#inbox?compose=new" },
      ])
    ).toEqual([
      { appId: "stripe", label: "Invoice", url: "https://dashboard.stripe.com/invoices/1" },
      { appId: "google", label: "Draft in Gmail", url: "https://mail.google.com/mail/#inbox?compose=new" },
    ]);
  });
});

describe("upsertInboxDraftArtifact", () => {
  it("replaces an existing Gmail draft instead of adding a second one", () => {
    expect(
      upsertInboxDraftArtifact(
        [{ appId: "google", label: "Draft in Gmail", url: "https://old" }],
        { appId: "google", label: "Draft in Gmail", url: "https://new" }
      )
    ).toEqual([{ appId: "google", label: "Draft in Gmail", url: "https://new" }]);
  });
});

describe("resolveDraftInboxLink", () => {
  it("prefers a deep link from an executed Gmail draft artifact", () => {
    expect(
      resolveDraftInboxLink({
        artifacts: [
          { appId: "google", url: "https://mail.google.com/mail/#drafts/r-1" },
        ],
        channel: "Gmail",
      })
    ).toEqual({
      appId: "google",
      label: "Gmail",
      url: "https://mail.google.com/mail/#drafts/r-1",
      kind: "prepared",
    });
  });

  it("opens Gmail compose when the draft is still only in Salt", () => {
    expect(resolveDraftInboxLink({ artifacts: [], channel: "Gmail" })).toEqual({
      appId: "google",
      label: "Gmail",
      url: "https://mail.google.com/mail/?view=cm&fs=1&tf=1",
      kind: "compose",
    });
  });

  it("prefills Gmail compose from the Salt draft", () => {
    const link = resolveDraftInboxLink({
      channel: "Gmail",
      compose: {
        subject: "Payment reminder - invoice INV-2026-1589",
        body: "Hi Frank,\n\nJust a reminder.",
      },
    });
    expect(link?.url).toBe(
      inboxComposeUrl({
        appId: "google",
        subject: "Payment reminder - invoice INV-2026-1589",
        body: "Hi Frank,\n\nJust a reminder.",
      })
    );
    expect(link?.url).toContain("view=cm");
    expect(link?.url).toContain("su=");
    expect(link?.url).toContain("body=");
    expect(link?.url).not.toContain("#drafts");
  });

  it("resolves Outlook from the channel name", () => {
    expect(resolveDraftInboxLink({ channel: "Outlook" })?.url).toBe(
      "https://outlook.office.com/mail/deeplink/compose"
    );
  });

  it("returns null when the play has no inbox", () => {
    expect(resolveDraftInboxLink({ artifacts: [], channel: "Stripe" })).toBeNull();
  });

  it("uses connector logos when channel is missing", () => {
    expect(
      resolveDraftInboxLink({ connectorIds: ["stripe", "google"] })?.label
    ).toBe("Gmail");
  });
});

describe("pickDashboardUrl", () => {
  it("prefers a dashboard/console link over other links", () => {
    expect(
      pickDashboardUrl([
        { label: "Website", href: "https://stripe.com" },
        { label: "Dashboard", href: "https://dashboard.stripe.com" },
      ])
    ).toBe("https://dashboard.stripe.com");
  });

  it("falls back to the first link when none looks like a dashboard", () => {
    expect(
      pickDashboardUrl([{ label: "Website", href: "https://example.com" }])
    ).toBe("https://example.com");
  });

  it("returns null for an empty link list", () => {
    expect(pickDashboardUrl([])).toBeNull();
  });
});
