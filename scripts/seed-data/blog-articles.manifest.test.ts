import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_ARTICLE_MANIFEST } from "./blog-articles.manifest";
import { getRelatedSlugsForArticle } from "@/app/_features/marketing/blog/blog-article-related";

describe("blog-articles.manifest", () => {
  it("lists every markdown file in content/migrate/blog", () => {
    const dir = join(process.cwd(), "content/migrate/blog");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();

    const manifestSlugs = BLOG_ARTICLE_MANIFEST.map((e) => e.slug).sort();
    expect(manifestSlugs).toEqual(files);
  });

  it("requires at least 3 key takeaways per entry", () => {
    for (const entry of BLOG_ARTICLE_MANIFEST) {
      expect(entry.keyTakeaways.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("maps every manifest slug in the related-post graph when applicable", () => {
    for (const entry of BLOG_ARTICLE_MANIFEST) {
      const related = getRelatedSlugsForArticle(entry.slug);
      expect(Array.isArray(related)).toBe(true);
    }
  });
});
