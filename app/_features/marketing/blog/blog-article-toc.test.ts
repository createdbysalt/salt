import { describe, expect, it } from "vitest";
import {
  extractMarkdownHeadings,
  formatTocLabel,
  slugifyHeading,
} from "./blog-article-toc";

describe("blog-article-toc", () => {
  it("slugifies headings for anchor links", () => {
    expect(slugifyHeading("What Is Proactive AI?")).toBe("what-is-proactive-ai");
  });

  it("keeps colon subtitles in TOC labels", () => {
    expect(
      formatTocLabel("Trend 1: Agent-to-Agent Commerce")
    ).toBe("Trend 1: Agent-to-Agent Commerce");
  });

  it("extracts only h2 headings from markdown", () => {
    const headings = extractMarkdownHeadings(`
# Title
Intro

## The burden of seeing
Body

### A smaller point
More

## What Makes AI Proactive Instead of Reactive
More body

## Frequently Asked Questions
FAQ body
`);

    expect(headings).toEqual([
      {
        text: "The burden of seeing",
        label: "The burden of seeing",
        id: "the-burden-of-seeing",
      },
      {
        text: "What Makes AI Proactive Instead of Reactive",
        label: "What Makes AI Proactive Instead of Reactive",
        id: "what-makes-ai-proactive-instead-of-reactive",
      },
    ]);
  });

  it("extracts colon-style trend headings for the sidebar", () => {
    const headings = extractMarkdownHeadings(`
## Trend 1: Agent-to-Agent Commerce
Body

## Trend 2: Autonomous Procurement
More
`);

    expect(headings[0]?.label).toBe("Trend 1: Agent-to-Agent Commerce");
    expect(headings[1]?.label).toBe("Trend 2: Autonomous Procurement");
  });
});
