import { describe, expect, it } from "vitest";
import { buildBlogNewsletterSubscriberRow } from "./blog-newsletter-lead";

describe("buildBlogNewsletterSubscriberRow", () => {
  it("normalizes email and defaults country", () => {
    const row = buildBlogNewsletterSubscriberRow({
      email: "  Reader@Example.COM ",
      marketingConsent: true,
      articleSlug: "what-is-proactive-ai",
      source: "blog-sidebar",
    });

    expect(row.email).toBe("Reader@Example.COM");
    expect(row.normalized_email).toBe("reader@example.com");
    expect(row.country_code).toBe("US");
    expect(row.article_slug).toBe("what-is-proactive-ai");
    expect(row.source).toBe("blog-sidebar");
    expect(row.marketing_consent).toBe(true);
  });

  it("sanitizes unknown country to US", () => {
    const row = buildBlogNewsletterSubscriberRow({
      email: "a@b.co",
      countryCode: "ZZ",
      marketingConsent: true,
    });

    expect(row.country_code).toBe("US");
  });
});
