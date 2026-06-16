import { describe, expect, it } from "vitest";
import { COMPARE_ARTICLE_SLUGS } from "./compare-slugs";
import {
  getComparePageTemplate,
  getStructuredCompareTemplateExtras,
  listComparePageTemplates,
} from "./data/compare-templates";

describe("compare-templates registry", () => {
  it("returns a template for every compare slug", () => {
    for (const slug of COMPARE_ARTICLE_SLUGS) {
      expect(getComparePageTemplate(slug)).toBeDefined();
    }
    expect(listComparePageTemplates()).toHaveLength(COMPARE_ARTICLE_SLUGS.length);
  });

  it("returns structured extras for every versus slug", () => {
    const versusSlugs = COMPARE_ARTICLE_SLUGS.filter((slug) => slug !== "salt-alternatives");

    for (const slug of versusSlugs) {
      const extras = getStructuredCompareTemplateExtras(slug);
      expect(extras.table?.rows.length).toBeGreaterThan(0);
      expect(extras.hiddenCosts?.items.length).toBeGreaterThan(0);
      expect(extras.userReviews?.highlights.length).toBeGreaterThan(0);
      expect(extras.faq?.length).toBeGreaterThan(0);
    }
  });

  it("returns guide layout extras for salt-alternatives", () => {
    const extras = getStructuredCompareTemplateExtras("salt-alternatives");
    expect(extras.table).toBeUndefined();
    expect(extras.hiddenCosts).toBeUndefined();
    expect(extras.userReviews).toBeUndefined();
    expect(extras.alternativesGrid?.entries.length).toBe(5);
    expect(extras.faq?.length).toBeGreaterThan(0);
  });
});
