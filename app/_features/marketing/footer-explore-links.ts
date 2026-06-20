import type { SanityLink } from "@/app/_lib/sanity/types";
import { normalizeMoneyOnTheTableLink } from "./money-on-the-table-links";

const BLOG_FOOTER_LINK: SanityLink = {
  text: "Blog",
  linkType: "internal",
  href: "/blog",
};

/** Canonical footer explore order (Blog → Features → Compare → Early access → MOT). */
const FOOTER_EXPLORE_CANONICAL_HREFS = [
  "/blog",
  "#product",
  "/compare",
  "/waitlist?source=homepage-footer",
  "/money-on-the-table",
] as const;

/** Legacy footer targets replaced by current marketing surfaces. */
const RETIRED_FOOTER_HREFS = new Set(["/learn"]);

function footerExploreLinkRank(href: string): number {
  const exact = FOOTER_EXPLORE_CANONICAL_HREFS.indexOf(
    href as (typeof FOOTER_EXPLORE_CANONICAL_HREFS)[number]
  );
  if (exact >= 0) return exact;
  if (href.startsWith("/waitlist") || href === "/early-access") return 3;
  return FOOTER_EXPLORE_CANONICAL_HREFS.length;
}

export function normalizeFooterExploreLinks(links: SanityLink[]): SanityLink[] {
  const normalized = links
    .filter((link) => !RETIRED_FOOTER_HREFS.has(link.href))
    .map(normalizeMoneyOnTheTableLink);

  const withBlog = normalized.some((link) => link.href === "/blog")
    ? normalized
    : [BLOG_FOOTER_LINK, ...normalized];

  return [...withBlog].sort(
    (a, b) => footerExploreLinkRank(a.href) - footerExploreLinkRank(b.href)
  );
}
