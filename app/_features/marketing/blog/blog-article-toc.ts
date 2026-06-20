/**
 * Table of contents convention: only `##` (H2) headings are major sections.
 * H3+ are subsections and never appear in the sidebar TOC.
 */

import { decodeHtmlEntities } from "./blog-display-text";

export type BlogArticleHeading = {
  /** Full heading text — matches the on-page H2 and anchor id source */
  text: string;
  /** Short label for the TOC (e.g. text before an em dash subtitle) */
  label: string;
  id: string;
};

const TOC_SKIP_PATTERN = /^frequently asked questions$/i;

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** TOC label matches the on-page H2 (including subtitles after a colon). */
export function formatTocLabel(text: string): string {
  return decodeHtmlEntities(text).trim();
}

export function extractMarkdownHeadings(markdown: string): BlogArticleHeading[] {
  const headings: BlogArticleHeading[] = [];

  for (const line of markdown.split("\n")) {
    const h2 = line.match(/^##\s+(.+)$/);
    if (!h2) continue;

    const text = decodeHtmlEntities(h2[1].trim());
    if (TOC_SKIP_PATTERN.test(text)) continue;

    headings.push({
      text,
      label: formatTocLabel(text),
      id: slugifyHeading(text),
    });
  }

  return headings;
}
