/**
 * Internal linking graph for SEO clusters (pillar ↔ cluster posts).
 * Seeded to Sanity `relatedPosts` references.
 */
import type { articleType } from "@/app/(public)/learn/_assets/content";

export const PROACTIVE_AI_CLUSTER = [
  "what-is-proactive-ai",
  "proactive-ai-vs-reactive-ai",
  "how-proactive-ai-automates-operations",
  "proactive-ai-examples-business",
  "what-can-proactive-ai-do",
  "future-of-proactive-ai-trends",
  "proactive-ai-vs-chatbot",
  "best-ai-tools-small-business",
] as const;

const PROACTIVE_AI_PILLAR = "what-is-proactive-ai";

const PROACTIVE_AI_SIBLINGS: Record<string, string[]> = {
  "proactive-ai-vs-reactive-ai": [
    "what-is-proactive-ai",
    "how-proactive-ai-automates-operations",
    "proactive-ai-vs-chatbot",
  ],
  "how-proactive-ai-automates-operations": [
    "what-is-proactive-ai",
    "proactive-ai-vs-reactive-ai",
    "what-can-proactive-ai-do",
  ],
  "proactive-ai-examples-business": [
    "what-is-proactive-ai",
    "how-proactive-ai-automates-operations",
    "best-ai-tools-small-business",
  ],
  "what-can-proactive-ai-do": [
    "what-is-proactive-ai",
    "how-proactive-ai-automates-operations",
    "future-of-proactive-ai-trends",
  ],
  "future-of-proactive-ai-trends": [
    "what-is-proactive-ai",
    "what-can-proactive-ai-do",
    "proactive-ai-vs-chatbot",
  ],
  "proactive-ai-vs-chatbot": [
    "what-is-proactive-ai",
    "proactive-ai-vs-reactive-ai",
    "best-ai-tools-small-business",
  ],
  "best-ai-tools-small-business": [
    "what-is-proactive-ai",
    "proactive-ai-examples-business",
    "proactive-ai-vs-chatbot",
  ],
};

const BUSINESS_CLUSTER_LINKS: Record<string, string[]> = {
  "how-to-price-your-projects": [
    "when-to-say-no-to-a-client",
    "set-boundaries-before-the-project-starts",
  ],
  "when-to-say-no-to-a-client": [
    "set-boundaries-before-the-project-starts",
    "how-to-price-your-projects",
  ],
  "set-boundaries-before-the-project-starts": [
    "when-to-say-no-to-a-client",
    "from-hired-hand-to-trusted-partner",
  ],
  "from-hired-hand-to-trusted-partner": [
    "set-boundaries-before-the-project-starts",
    "how-to-price-your-projects",
  ],
};

const PRODUCT_CLUSTER_LINKS: Record<string, string[]> = {
  "salt-reads-your-business": [
    "how-salt-drafts-proposals-and-followups",
    "what-is-proactive-ai",
  ],
  "how-salt-drafts-proposals-and-followups": [
    "salt-reads-your-business",
    "what-is-proactive-ai",
  ],
};

export function getRelatedSlugsForArticle(slug: string): string[] {
  if (slug === PROACTIVE_AI_PILLAR) {
    return PROACTIVE_AI_CLUSTER.filter((entry) => entry !== slug);
  }

  if (slug in PROACTIVE_AI_SIBLINGS) {
    return PROACTIVE_AI_SIBLINGS[slug];
  }

  if (slug in BUSINESS_CLUSTER_LINKS) {
    return BUSINESS_CLUSTER_LINKS[slug];
  }

  if (slug in PRODUCT_CLUSTER_LINKS) {
    return PRODUCT_CLUSTER_LINKS[slug];
  }

  return [];
}

export function resolveRelatedBlogArticles(
  article: articleType,
  allArticles: articleType[],
  limit = 3
): articleType[] {
  const explicit = (article.relatedSlugs ?? [])
    .map((slug) => allArticles.find((entry) => entry.slug === slug))
    .filter(
      (entry): entry is articleType =>
        entry !== undefined && entry.slug !== article.slug
    )
    .slice(0, limit);

  if (explicit.length) return explicit;

  return allArticles
    .filter(
      (item) =>
        item.slug !== article.slug &&
        item.categories.some((category) =>
          article.categories.map((c) => c.slug).includes(category.slug)
        )
    )
    .slice(0, limit);
}
