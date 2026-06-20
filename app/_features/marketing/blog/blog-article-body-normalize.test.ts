import { describe, expect, it } from "vitest";
import {
  hasStackedSectionHeadings,
  normalizeBlogArticleBody,
} from "./blog-article-body-normalize";
import type { PortableTextBlock } from "@/app/_lib/sanity/types";

function block(style: string, text: string): PortableTextBlock {
  return {
    _type: "block",
    _key: `${style}-${text}`,
    style,
    children: [{ _type: "span", _key: `span-${text}`, text }],
  };
}

describe("hasStackedSectionHeadings", () => {
  it("detects h2 followed by multiple h3s before body copy", () => {
    const blocks = [
      block("h2", "Section title"),
      block("h3", "Sub one"),
      block("h3", "Sub two"),
      block("normal", "Body copy"),
    ];

    expect(hasStackedSectionHeadings(blocks)).toBe(true);
  });

  it("returns false when h3 is followed by copy before the next h3", () => {
    const blocks = [
      block("h2", "Section title"),
      block("normal", "Intro"),
      block("h3", "Sub one"),
      block("normal", "Body copy"),
      block("h3", "Sub two"),
      block("normal", "More copy"),
    ];

    expect(hasStackedSectionHeadings(blocks)).toBe(false);
  });
});

describe("normalizeBlogArticleBody", () => {
  it("reorders what-is-proactive-ai from migrate markdown without changing words", () => {
    const broken = [
      block("h2", "What Makes AI Proactive Instead of Reactive"),
      block("h3", "Always-On Observation: What It Means for a System to Watch Your Operations"),
      block("h3", "Rules, Schedules, and Predictive Signals: The Three Trigger Types"),
      block(
        "h3",
        "How Proactive AI Surfaces Work Items Without Needing a Command"
      ),
      block(
        "normal",
        "The defining architectural difference between proactive and reactive AI is the push versus pull distinction."
      ),
    ];

    const normalized = normalizeBlogArticleBody("what-is-proactive-ai", broken);
    expect(normalized).toBeDefined();

    const h2Index = normalized!.findIndex(
      (entry) =>
        entry.style === "h2" &&
        entry.children?.[0]?.text === "What Makes AI Proactive Instead of Reactive"
    );
    expect(h2Index).toBeGreaterThanOrEqual(0);

    const nextBlock = normalized![h2Index + 1];
    expect(nextBlock.style).toBe("normal");
    expect(nextBlock.children?.[0]?.text).toContain("push versus pull");

    const firstH3 = normalized![h2Index + 2];
    expect(firstH3.style).toBe("h3");
    expect(firstH3.children?.[0]?.text).toContain("Always-On Observation");
  });
});
