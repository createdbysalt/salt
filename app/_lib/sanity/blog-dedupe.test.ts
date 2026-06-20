import { describe, expect, it } from "vitest";
import {
  dedupeBlogPostsBySlug,
  dedupeCategoriesByRouteSlug,
  dedupeResolvedBlogCategories,
  pickPreferredBlogPost,
} from "./blog-dedupe";
import type { BlogPost, Category } from "./types";

function makePost(
  id: string,
  slug: string,
  overrides: Partial<BlogPost> = {}
): BlogPost {
  return {
    _type: "blogPost",
    _id: id,
    title: slug,
    slug: { current: slug },
    body: [],
    publishedAt: "2026-01-01",
    ...overrides,
  };
}

function makeCategory(id: string, slug: string): Category {
  return {
    _id: id,
    _type: "category",
    title: slug,
    slug: { current: slug },
    description: "",
  };
}

describe("dedupeBlogPostsBySlug", () => {
  it("keeps canonical seeded post over orphan duplicate slug", () => {
    const orphan = makePost("qFyotTttMJJgXAfFHDTmXD", "what-is-proactive-ai");
    const canonical = makePost("blogPost-what-is-proactive-ai", "what-is-proactive-ai", {
      featuredImage: { _type: "image", asset: { _ref: "image-abc", _type: "reference" } },
      keyTakeaways: ["one", "two", "three"],
      body: Array.from({ length: 10 }, (_, index) => ({
        _type: "block" as const,
        _key: `block-${index}`,
        style: "normal",
        children: [{ _type: "span" as const, _key: `span-${index}`, text: `para ${index}` }],
      })),
    });

    const result = dedupeBlogPostsBySlug([orphan, canonical]);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("blogPost-what-is-proactive-ai");
  });

  it("pickPreferredBlogPost prefers featured image when ids are equal tier", () => {
    const plain = makePost("draft.a", "slug-a");
    const withImage = makePost("draft.b", "slug-a", {
      featuredImage: { _type: "image", asset: { _ref: "image-abc", _type: "reference" } },
    });

    expect(pickPreferredBlogPost(plain, withImage)._id).toBe("draft.b");
  });

  it("keeps canonical compare post over orphan duplicate slug", () => {
    const orphan = makePost("qFyotTttMJJgXAfFHDTmXD", "salt-vs-lindy", {
      articleKind: "comparison",
      body: Array.from({ length: 20 }, (_, index) => ({
        _type: "block" as const,
        _key: `block-${index}`,
        style: "normal",
        children: [{ _type: "span" as const, _key: `span-${index}`, text: `para ${index}` }],
      })),
    });
    const canonical = makePost("compare-salt-vs-lindy", "salt-vs-lindy", {
      articleKind: "comparison",
    });

    const result = dedupeBlogPostsBySlug([orphan, canonical]);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe("compare-salt-vs-lindy");
  });
});

describe("dedupeCategoriesByRouteSlug", () => {
  it("keeps one category per route slug", () => {
    const duplicate = makeCategory("extra-proactive-ai", "proactive-ai");
    const canonical = makeCategory("category-proactive-ai", "proactive-ai");

    const result = dedupeCategoriesByRouteSlug([
      duplicate,
      canonical,
      makeCategory("category-features", "features"),
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.slug?.current === "proactive-ai")?._id).toBe(
      "category-proactive-ai"
    );
  });
});

describe("dedupeResolvedBlogCategories", () => {
  it("keeps one nav chip per route slug", () => {
    const result = dedupeResolvedBlogCategories([
      {
        routeSlug: "proactive-ai",
        title: "Proactive AI",
        description: "",
        sortOrder: 0,
      },
      {
        routeSlug: "proactive-ai",
        title: "Proactive AI",
        titleShort: "Proactive AI",
        description: "Proactive AI education for solo operators.",
        sortOrder: 2,
      },
      {
        routeSlug: "features",
        title: "Features",
        description: "Latest features.",
        sortOrder: 0,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result.filter((item) => item.routeSlug === "proactive-ai")).toHaveLength(1);
    expect(result.find((item) => item.routeSlug === "proactive-ai")?.sortOrder).toBe(2);
  });
});
