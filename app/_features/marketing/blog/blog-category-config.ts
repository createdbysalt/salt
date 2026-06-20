/** Public URL slugs → legacy article category slugs in content.tsx */
export const BLOG_CATEGORY_ROUTE_SLUGS = [
  "features",
  "tutorials",
  "proactive-ai",
  "business",
] as const;

export type BlogCategoryRouteSlug = (typeof BLOG_CATEGORY_ROUTE_SLUGS)[number];

const ROUTE_TO_LEGACY: Record<BlogCategoryRouteSlug, string> = {
  features: "feature",
  tutorials: "tutorial",
  "proactive-ai": "proactive-ai",
  business: "business",
};

const LEGACY_TO_ROUTE: Record<string, BlogCategoryRouteSlug> = {
  feature: "features",
  tutorial: "tutorials",
  "proactive-ai": "proactive-ai",
  business: "business",
};

const LEGACY_CATEGORY_SLUGS = new Set(Object.keys(LEGACY_TO_ROUTE));

export type BlogCategoryFallback = {
  routeSlug: BlogCategoryRouteSlug;
  legacySlug: string;
  title: string;
  titleShort?: string;
  description: string;
};

const CATEGORY_FALLBACK_COPY: Record<
  BlogCategoryRouteSlug,
  Omit<BlogCategoryFallback, "routeSlug" | "legacySlug">
> = {
  features: {
    title: "New Features",
    titleShort: "Features",
    description: "Latest features added to Salt.",
  },
  tutorials: {
    title: "How Tos & Tutorials",
    titleShort: "Tutorials",
    description: "Learn how to use Salt with these step-by-step tutorials.",
  },
  business: {
    title: "Business",
    titleShort: "Business",
    description: "Business strategy for independent professionals.",
  },
  "proactive-ai": {
    title: "Proactive AI",
    titleShort: "Proactive AI",
    description: "Proactive AI education for solo operators.",
  },
};

export function getLegacyCategorySlug(routeSlug: string): string | null {
  if (routeSlug in ROUTE_TO_LEGACY) {
    return ROUTE_TO_LEGACY[routeSlug as BlogCategoryRouteSlug];
  }
  return LEGACY_CATEGORY_SLUGS.has(routeSlug) ? routeSlug : null;
}

export function getCategoryRouteSlug(
  legacyOrRouteSlug: string
): BlogCategoryRouteSlug | null {
  if (LEGACY_TO_ROUTE[legacyOrRouteSlug]) {
    return LEGACY_TO_ROUTE[legacyOrRouteSlug];
  }
  if (BLOG_CATEGORY_ROUTE_SLUGS.includes(legacyOrRouteSlug as BlogCategoryRouteSlug)) {
    return legacyOrRouteSlug as BlogCategoryRouteSlug;
  }
  return null;
}

export function isBlogCategoryRouteSlug(slug: string): slug is BlogCategoryRouteSlug {
  return BLOG_CATEGORY_ROUTE_SLUGS.includes(slug as BlogCategoryRouteSlug);
}

/** Fallback copy when Sanity category documents are unavailable. */
export function getBlogCategoryFallbacks(): BlogCategoryFallback[] {
  return BLOG_CATEGORY_ROUTE_SLUGS.map((routeSlug) => {
    const legacySlug = ROUTE_TO_LEGACY[routeSlug];
    const copy = CATEGORY_FALLBACK_COPY[routeSlug];
    return {
      routeSlug,
      legacySlug,
      ...copy,
    };
  });
}

export function getBlogCategoryFallback(
  routeSlug: BlogCategoryRouteSlug
): BlogCategoryFallback | null {
  return getBlogCategoryFallbacks().find((c) => c.routeSlug === routeSlug) ?? null;
}
