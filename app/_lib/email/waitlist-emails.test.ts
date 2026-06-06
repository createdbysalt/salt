import { describe, expect, it } from "vitest";
import {
  WAITLIST_CONFIRMATION_PREVIEW,
  WAITLIST_CONFIRMATION_SUBJECT,
  buildWaitlistConfirmationEmail,
} from "./waitlist-emails";

describe("buildWaitlistConfirmationEmail", () => {
  it("uses the approved subject and preview text", () => {
    const email = buildWaitlistConfirmationEmail({
      siteUrl: "http://localhost:3000",
    });

    expect(email.subject).toBe(WAITLIST_CONFIRMATION_SUBJECT);
    expect(email.previewText).toBe(WAITLIST_CONFIRMATION_PREVIEW);
    expect(email.html).toContain(WAITLIST_CONFIRMATION_PREVIEW);
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
    expect(html).toContain("See you on July 1st.");
    expect(html).not.toContain("That Tuesday is coming.");
    expect(html).not.toMatch(/<a[^>]*>\s*Your spot is confirmed/i);

    expect(text).toContain("Right now");
    expect(text).toContain("August");
    expect(text).toContain("— The Salt team");
  });

  it("uses the landing2 wordmark on a light aurora layout", () => {
    const { html } = buildWaitlistConfirmationEmail({
      siteUrl: "https://usesalt.io",
    });

    expect(html).toContain("https://usesalt.io/salt-logo-email-white.png");
    expect(html).not.toContain("salt-logo.svg");
    expect(html).not.toContain("brightness(0) invert(1)");
    expect(html).toContain("background-color: #f6f3ec");
    expect(html).toContain("linear-gradient(135deg, #2d6b5c");
    expect(html).not.toContain('width="50%"');
  });
});
