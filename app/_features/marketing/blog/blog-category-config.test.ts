import { describe, expect, it } from "vitest";
import {
  BLOG_CATEGORY_ROUTE_SLUGS,
  getCategoryRouteSlug,
  getLegacyCategorySlug,
  isBlogCategoryRouteSlug,
} from "./blog-category-config";

describe("blog-category-config", () => {
  it("exposes four public category routes including proactive-ai", () => {
    expect(BLOG_CATEGORY_ROUTE_SLUGS).toEqual([
      "features",
      "tutorials",
      "proactive-ai",
      "business",
    ]);
  });

  it("maps legacy proactive-ai slug to proactive-ai route", () => {
    expect(getCategoryRouteSlug("proactive-ai")).toBe("proactive-ai");
    expect(getLegacyCategorySlug("proactive-ai")).toBe("proactive-ai");
  });

  it("maps plural route slugs to legacy article categories", () => {
    expect(getLegacyCategorySlug("features")).toBe("feature");
    expect(getLegacyCategorySlug("tutorials")).toBe("tutorial");
    expect(getCategoryRouteSlug("feature")).toBe("features");
    expect(getCategoryRouteSlug("tutorial")).toBe("tutorials");
  });

  it("validates route slugs", () => {
    expect(isBlogCategoryRouteSlug("proactive-ai")).toBe(true);
    expect(isBlogCategoryRouteSlug("compare")).toBe(false);
  });
});
