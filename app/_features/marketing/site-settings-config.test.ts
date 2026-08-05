import { describe, expect, it } from "vitest";
import { resolveSiteSettings } from "./site-settings-config";
import {
  FOOTER_EXPLORE_LINKS_FALLBACK,
  FOOTER_LEGAL_LINKS_FALLBACK,
  NAV_CTA_FALLBACK,
} from "./site-settings-fallback";

describe("resolveSiteSettings", () => {
  it("uses fallbacks when Sanity settings are missing", () => {
    const resolved = resolveSiteSettings(null);

    expect(resolved.ctaButton).toEqual(NAV_CTA_FALLBACK);
    expect(resolved.footerExploreLinks).toEqual(FOOTER_EXPLORE_LINKS_FALLBACK);
    expect(resolved.footerLegalLinks).toEqual(FOOTER_LEGAL_LINKS_FALLBACK);
    expect(resolved.supportEmail).toBe("support@usesalt.io");
    expect(resolved.socialLinks.length).toBeGreaterThan(0);
  });

  it("merges Sanity nav and footer fields", () => {
    const resolved = resolveSiteSettings({
      _type: "siteSettings",
      _id: "site-settings-en",
      title: "Salt",
      description: "Custom footer tagline",
      ctaButton: {
        text: "Get early access",
        linkType: "internal",
        href: "/waitlist?source=custom",
      },
      footerNavigation: [
        {
          text: "Pricing",
          linkType: "internal",
          href: "/pricing",
        },
      ],
      legalNavigation: [
        {
          text: "Privacy",
          linkType: "internal",
          href: "/privacy-policy",
        },
      ],
      supportEmail: "hello@usesalt.io",
      copyrightHolder: "Simcoe House Inc.",
      social: {
        linkedin: "https://linkedin.com/company/usesalt.io",
      },
    });

    expect(resolved.footerTagline).toBe("Custom footer tagline");
    expect(resolved.ctaButton.text).toBe("Get early access");
    expect(resolved.footerExploreLinks).toHaveLength(2);
    expect(resolved.footerExploreLinks[0]?.text).toBe("Blog");
    expect(resolved.footerExploreLinks[1]?.href).toBe("/pricing");
    expect(resolved.footerLegalLinks[0]?.href).toBe("/privacy-policy");
    expect(resolved.footerLegalLinks.map((link) => link.href)).toEqual([
      "/privacy-policy",
      "/terms-of-use",
      "/early-access",
      "/cookie-policy",
      "/disclaimer",
    ]);
    expect(resolved.supportEmail).toBe("hello@usesalt.io");
    expect(resolved.socialLinks.some((link) => link.platform === "linkedin")).toBe(
      true
    );
  });
});
