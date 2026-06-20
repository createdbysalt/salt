import { describe, expect, it } from "vitest";
import { buildBlogNewsletterWelcomeEmail } from "./blog-newsletter-welcome-email";

describe("buildBlogNewsletterWelcomeEmail", () => {
  it("includes founder intro, quiz CTA, and curated reads", () => {
    const email = buildBlogNewsletterWelcomeEmail({
      siteUrl: "https://usesalt.io",
    });

    expect(email.subject).toContain("Welcome");
    expect(email.html).toContain("Matt & Gabi");
    expect(email.html).toContain("You're subscribed");
    expect(email.html).toContain("/money-on-the-table?source=blog-newsletter-welcome");
    expect(email.html).toContain("/blog/what-is-proactive-ai");
    expect(email.html).toContain("/blog/how-to-price-your-projects");
    expect(email.html).toContain("shows you the size");
    expect(email.text).not.toMatch(/\bfinds you\b/i);
  });
});
