import { describe, it, expect } from "vitest";
import {
  buildPlayGlance,
  buildPlayHeadline,
  summarizeEvidence,
  reversibilityNote,
} from "./play-headline";

describe("buildPlayHeadline", () => {
  it("prefers a playbook-authored headline", () => {
    expect(
      buildPlayHeadline({
        headline: "Kickoff with Meridian Studio at 2pm — brief is ready",
        subject: "Brief ready: Kickoff call with Meridian Studio",
        targetLabel: "Meridian Studio kickoff",
        outputType: "briefing",
      })
    ).toBe("Kickoff with Meridian Studio at 2pm — brief is ready");
  });

  it("composes a human, dash-free headline from target label + output type", () => {
    expect(
      buildPlayHeadline({
        subject: "Brief ready: Kickoff call with Meridian Studio",
        targetLabel: "Meridian Studio kickoff — today 2:00 PM",
        outputType: "briefing",
      })
    ).toBe("Brief ready for Meridian Studio kickoff, today 2:00 PM");
  });

  it("names the person, not the artifact, for email drafts", () => {
    expect(
      buildPlayHeadline({
        subject: "Follow-up drafted",
        targetLabel: "Dana Whitfield",
        recipientLabel: "Dana Whitfield",
        playbookSlug: "follow-up",
        outputType: "email_draft",
      })
    ).toBe("Follow up with Dana Whitfield");
  });

  it("rewrites a persisted invoice draft headline into a glanceable moment", () => {
    expect(
      buildPlayHeadline({
        headline: "Your draft is ready for INV-2026-1589",
        subject: "Invoice Reminder",
        targetLabel: "INV-2026-1589",
        recipientLabel: "INV-2026-1589",
        draftText: "Hi Frank,\n\nJust a reminder about INV-2026-1589.",
        playbookSlug: "invoice-reminder",
        playbookName: "Invoice Reminder",
        outputType: "email_draft",
      })
    ).toBe("Frank hasn't paid INV-2026-1589");
  });

  it("falls back to the run title when no moment is available", () => {
    expect(
      buildPlayHeadline({
        subject: "Invoice #1042 is 9 days overdue",
        outputType: "notification",
      })
    ).toBe("Invoice #1042 is 9 days overdue");
  });

  it("never invents a moment from an empty target label", () => {
    expect(
      buildPlayHeadline({ subject: "Weekly review ready", targetLabel: "  ", outputType: "briefing" })
    ).toBe("Weekly review ready");
  });
});

describe("buildPlayGlance", () => {
  it("pitches what Salt knows and what it drafted", () => {
    expect(
      buildPlayGlance({
        headline: "Your draft is ready for INV-2026-1589",
        subject: "Invoice Reminder",
        targetLabel: "INV-2026-1589",
        recipientLabel: "INV-2026-1589",
        draftText: "Hi Frank,\n\nThe invoice is overdue.",
        playbookSlug: "invoice-reminder",
        playbookName: "Invoice Reminder",
        outputType: "email_draft",
        preview: "Waiting for approval: GMAIL_CREATE_EMAIL_DRAFT",
      })
    ).toEqual({
      headline: "Frank hasn't paid INV-2026-1589",
      detail: "Still unpaid. Drafted Frank a reminder.",
    });
  });

  it("uses amount and age from the draft when Salt has them", () => {
    expect(
      buildPlayGlance({
        headline: "Your draft is ready for INV-2026-1589",
        subject: "Invoice Reminder",
        targetLabel: "INV-2026-1589",
        draftText: "Hi Frank,\n\nINV-2026-1589 is $50.00 and 12 days overdue.",
        playbookSlug: "invoice-reminder",
        outputType: "email_draft",
      }).detail
    ).toBe("$50, 12 days overdue. Drafted Frank a reminder.");
  });
});

describe("summarizeEvidence", () => {
  it("is thin with no sources and says to review before approving", () => {
    const ev = summarizeEvidence({});
    expect(ev.thin).toBe(true);
    expect(ev.thinNote).toMatch(/no connected sources/i);
  });

  it("admits a single source honestly", () => {
    const ev = summarizeEvidence({ triggerLabel: "Calendar event" });
    expect(ev.thin).toBe(true);
    expect(ev.thinNote).toMatch(/worth a closer look/i);
  });

  it("is well-sourced with two or more independent items", () => {
    const ev = summarizeEvidence({
      triggerLabel: "Calendar event",
      extra: [{ label: "Last email Tue" }],
      sourceUrl: "https://mail.google.com/mail/u/0/#inbox/abc",
      sourceAppLabel: "Gmail",
    });
    expect(ev.thin).toBe(false);
    expect(ev.thinNote).toBeNull();
    expect(ev.items).toHaveLength(3);
    expect(ev.items[2]).toMatchObject({ appLabel: "Gmail" });
  });

  it("links the source URL when present", () => {
    const ev = summarizeEvidence({
      sourceUrl: "https://dashboard.stripe.com/invoices/in_123",
      sourceAppLabel: "Stripe",
    });
    const link = ev.items.find((i) => i.url);
    expect(link?.url).toContain("stripe.com");
    expect(link?.label).toBe("Source in Stripe");
  });

  it("attaches a Memory invoice link from the run target", () => {
    const ev = summarizeEvidence({
      entries: [{ label: "Read invoice context from Memory", appId: "salt" }],
      sourceLinks: {
        targetType: "billing",
        targetId: "br-1",
        invoiceContext: {
          invoice: { pay_url: "https://invoice.stripe.com/i/acct_test/in_1" },
        },
      },
    });
    expect(ev.items[0]?.url).toBe("/billing/br-1");
    expect(ev.items[0]?.links?.map((link) => link.label)).toEqual([
      "Invoice in Memory",
      "Stripe invoice",
    ]);
  });

  it("prefers executor-written reasoning entries over the trigger fallback", () => {
    const ev = summarizeEvidence({
      triggerLabel: "Daily 8am schedule",
      entries: [
        { appId: "google-calendar", label: "Saw the kickoff call at 2:00 PM", url: "https://calendar.google.com/" },
        { appId: null, label: "Remembered Dana prefers live decisions" },
      ],
    });
    expect(ev.items).toHaveLength(2);
    expect(ev.items[0].label).toMatch(/^Saw the kickoff/);
    expect(ev.thin).toBe(false);
  });
});

describe("reversibilityNote", () => {
  it("warns plainly for irreversible sends", () => {
    expect(reversibilityNote("email_draft")).toMatch(/can't be unsent/i);
  });

  it("reassures for reversible memory updates", () => {
    expect(reversibilityNote("memory_update")).toMatch(/reverse/i);
  });

  it("explains teaching for question cards", () => {
    expect(reversibilityNote(null, "question")).toMatch(/teaches Salt/i);
  });

  it("returns null when there's nothing to clarify", () => {
    expect(reversibilityNote(null, "risk")).toBeNull();
  });
});
