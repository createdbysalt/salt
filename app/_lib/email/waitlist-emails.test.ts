import { afterEach, describe, expect, it } from "vitest";
import {
  WAITLIST_CONFIRMATION_HERO_SUBTITLE,
  WAITLIST_CONFIRMATION_PREVIEW,
  WAITLIST_CONFIRMATION_SUBJECT,
  buildWaitlistAdminNotificationEmail,
  buildWaitlistConfirmationEmail,
  getWaitlistNotifyRecipients,
} from "./waitlist-emails";

describe("buildWaitlistConfirmationEmail", () => {
  it("uses the approved subject and preview text", () => {
    const email = buildWaitlistConfirmationEmail({
      siteUrl: "http://localhost:3000",
    });

    expect(email.subject).toBe(WAITLIST_CONFIRMATION_SUBJECT);
    expect(email.previewText).toBe(WAITLIST_CONFIRMATION_PREVIEW);
    expect(email.html).toContain(WAITLIST_CONFIRMATION_PREVIEW);
    expect(email.html).toContain(WAITLIST_CONFIRMATION_HERO_SUBTITLE);
  });

  it("includes timeline milestones and confirmation signpost without a CTA button", () => {
    const { html, text } = buildWaitlistConfirmationEmail({
      siteUrl: "http://localhost:3000",
    });

    expect(html).toContain("Your spot is confirmed");
    expect(html).toContain("What happens next");
    expect(html).toContain("Worth knowing now");
    expect(html).not.toContain("border-radius: 14px");
    expect(html).toContain("July 1");
    expect(html).not.toContain("See you on July 1st.");
    expect(html).not.toContain("That Tuesday is coming.");
    expect(html).not.toMatch(/<a[^>]*>\s*Your spot is confirmed/i);

    expect(text).toContain("Right now");
    expect(text).toContain("August");
    expect(text).toContain("Matt & Gabi");
    expect(text).toContain("The Salt Team");
  });

  it("uses the landing2 wordmark on a light aurora layout", () => {
    const { html } = buildWaitlistConfirmationEmail({
      siteUrl: "https://usesalt.io",
    });

    expect(html).toContain("https://usesalt.io/salt-logo-email-white.png");
    expect(html).not.toContain("salt-logo.svg");
    expect(html).not.toContain("brightness(0) invert(1)");
    expect(html).toContain("background-color: #ffffff");
    expect(html).not.toContain("background-color: #f6f3ec");
    expect(html).toContain("linear-gradient(135deg, #2d6b5c");
    expect(html).not.toContain('width="50%"');
  });

  it("supports CID inline logo for production sends", () => {
    const { html } = buildWaitlistConfirmationEmail({ logoCid: "salt-wordmark" });

    expect(html).toContain('src="cid:salt-wordmark"');
    expect(html).not.toContain("https://usesalt.io/salt-logo-email-white.png");
  });
});

describe("buildWaitlistAdminNotificationEmail", () => {
  it("includes signup email, source, and human-readable qualification", () => {
    const email = buildWaitlistAdminNotificationEmail({
      email: "founder@example.com",
      source: "homepage-hero",
      completedAt: "2026-06-06T12:00:00.000Z",
      qualification: {
        primaryBusiness: "consulting",
        annualRevenue: "100k-200k",
        operationalBottleneck: "follow-ups-slip",
        tools: "stripe,calendar",
        hearAbout: "word-of-mouth",
      },
    });

    expect(email.subject).toBe("New waitlist signup: founder@example.com");
    expect(email.text).toContain("Email: founder@example.com");
    expect(email.text).toContain("Source: homepage-hero");
    expect(email.text).toContain("What's your primary business?: Consulting");
    expect(email.text).toContain("Annual revenue range?: $100K–$200K");
    expect(email.text).toContain(
      "Which tools do you use regularly?: Stripe / payments, Google / Outlook Calendar"
    );
  });
});

describe("getWaitlistNotifyRecipients", () => {
  const original = process.env.WAITLIST_NOTIFY_EMAIL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.WAITLIST_NOTIFY_EMAIL;
    } else {
      process.env.WAITLIST_NOTIFY_EMAIL = original;
    }
  });

  it("parses comma-separated env recipients", () => {
    process.env.WAITLIST_NOTIFY_EMAIL = "you@icloud.com, team@usesalt.io";
    expect(getWaitlistNotifyRecipients("support@usesalt.io")).toEqual([
      "you@icloud.com",
      "team@usesalt.io",
    ]);
  });

  it("falls back to support email when env is unset", () => {
    delete process.env.WAITLIST_NOTIFY_EMAIL;
    expect(getWaitlistNotifyRecipients("support@usesalt.io")).toEqual([
      "support@usesalt.io",
    ]);
  });
});
