import { describe, expect, it } from "vitest";
import type { articleType } from "@/app/(public)/learn/_assets/content";
import { buildBlogArticleGraph } from "./blog-structured-data";

function makeArticle(overrides: Partial<articleType> = {}): articleType {
  return {
    slug: "what-is-proactive-ai",
    title: "What is proactive AI?",
    description: "A primer on proactive AI for solo operators.",
    publishedAt: "2024-06-01",
    updatedAt: "2025-01-15",
    categories: [
      {
        slug: "proactive-ai",
        title: "Proactive AI",
        titleShort: "Proactive AI",
        description: "Proactive AI education",
        descriptionShort: "Proactive AI education",
      },
    ],
    author: {
      slug: "salt-team",
      name: "Salt Team",
      job: "Editorial",
      description: "Salt editorial team",
      avatar: "/authors/salt-team.png",
      socials: [],
    },
    image: {
      urlRelative: "/learn/what-is-proactive-ai/header.png",
      alt: "Proactive AI illustration",
    },
    keyTakeaways: ["Takeaway one", "Takeaway two", "Takeaway three"],
    faq: [
      {
        question: "What is proactive AI?",
        answer: "AI that acts before you ask.",
      },
    ],
    content: {} as articleType["content"],
    ...overrides,
  };
}

describe("buildBlogArticleGraph", () => {
  it("returns a schema.org @graph with BlogPosting and breadcrumbs", () => {
    const graph = buildBlogArticleGraph({ article: makeArticle(), wordCount: 1200 });

    expect(graph).toMatchObject({
      "@context": "https://schema.org",
      "@graph": expect.any(Array),
    });

    const nodes = (graph as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const types = nodes.map((node) => node["@type"]);

    expect(types).toContain("BlogPosting");
    expect(types).toContain("WebPage");
    expect(types).toContain("BreadcrumbList");
    expect(types).toContain("Person");
    expect(types).toContain("FAQPage");

    const posting = nodes.find((node) => node["@type"] === "BlogPosting");
    expect(posting).toMatchObject({
      headline: "What is proactive AI?",
      dateModified: "2025-01-15",
      wordCount: 1200,
      articleSection: ["Proactive AI"],
    });

    const breadcrumb = nodes.find((node) => node["@type"] === "BreadcrumbList");
    const items = breadcrumb?.itemListElement as Array<{ name: string }>;
    expect(items.map((item) => item.name)).toEqual([
      "Blog",
      "Proactive AI",
      "What is proactive AI?",
    ]);
  });

  it("uses /blog URLs in entity ids", () => {
    const graph = buildBlogArticleGraph({ article: makeArticle() });
    const nodes = (graph as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const posting = nodes.find((node) => node["@type"] === "BlogPosting");

    expect(posting?.["@id"]).toContain("/blog/what-is-proactive-ai");
    expect(posting?.url).toContain("/blog/what-is-proactive-ai");
  });

  it("adds VideoObject nodes when article has youtube embeds", () => {
    const graph = buildBlogArticleGraph({
      article: makeArticle({
        videoEmbeds: [
          {
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            videoId: "dQw4w9WgXcQ",
            name: "Overview",
          },
        ],
      }),
    });

    const nodes = (graph as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const video = nodes.find((node) => node["@type"] === "VideoObject");

    expect(video).toMatchObject({
      embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      contentUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("uses absolute URLs for Sanity CDN images", () => {
    const cdnUrl = "https://cdn.sanity.io/images/project/production/abc.jpg";
    const graph = buildBlogArticleGraph({
      article: makeArticle({
        image: { urlRelative: cdnUrl, alt: "Hero" },
      }),
    });

    const nodes = (graph as { "@graph": Array<Record<string, unknown>> })["@graph"];
    const image = nodes.find((node) => node["@type"] === "ImageObject");

    expect(image?.url).toBe(cdnUrl);
  });
});
