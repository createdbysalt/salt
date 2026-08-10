import { describe, it, expect } from "vitest";
import { buildPlayHeadline, summarizeEvidence, reversibilityNote } from "./play-headline";

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
    ).toBe("Your brief is ready for Meridian Studio kickoff, today 2:00 PM");
  });

  it("uses the draft template for email drafts", () => {
    expect(
      buildPlayHeadline({
        subject: "Follow-up drafted",
        targetLabel: "Dana Whitfield",
        outputType: "email_draft",
      })
    ).toBe("Your draft is ready for Dana Whitfield");
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
