import { describe, expect, it } from "vitest";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import {
  getRelatedSlugsForArticle,
  PROACTIVE_AI_CLUSTER,
  resolveRelatedBlogArticles,
} from "./blog-article-related";

function makeArticle(slug: string, categorySlug = "proactive-ai"): articleType {
  return {
    slug,
    title: slug,
    description: "desc",
    publishedAt: "2026-06-01",
    categories: [
      {
        slug: categorySlug,
        title: "Proactive AI",
        titleShort: "Proactive AI",
        description: "",
        descriptionShort: "",
      },
    ],
    author: {
      slug: "matt",
      name: "Matt",
      job: "CMO",
      description: "",
      avatar: "/logo.png",
    },
    image: { urlRelative: "/learn/header.png", alt: "alt" },
    relatedSlugs: getRelatedSlugsForArticle(slug),
    content: {} as articleType["content"],
  };
}

describe("blog-article-related", () => {
  it("links pillar to every proactive-ai cluster sibling", () => {
    const related = getRelatedSlugsForArticle("what-is-proactive-ai");
    expect(related).toHaveLength(PROACTIVE_AI_CLUSTER.length - 1);
    expect(related).toContain("proactive-ai-vs-reactive-ai");
  });

  it("links cluster posts back to the pillar", () => {
    expect(getRelatedSlugsForArticle("proactive-ai-vs-chatbot")[0]).toBe(
      "what-is-proactive-ai"
    );
  });
});

describe("resolveRelatedBlogArticles", () => {
  it("prefers explicit relatedSlugs over same-category fallback", () => {
    const pillar = makeArticle("what-is-proactive-ai");
    const sibling = makeArticle("proactive-ai-vs-chatbot");
    const unrelated = makeArticle("how-to-price-your-projects", "business");

    const related = resolveRelatedBlogArticles(pillar, [
      pillar,
      sibling,
      unrelated,
    ]);

    expect(related[0]?.slug).toBe("proactive-ai-vs-chatbot");
    expect(related.some((entry) => entry.slug === "how-to-price-your-projects")).toBe(
      false
    );
  });
});
