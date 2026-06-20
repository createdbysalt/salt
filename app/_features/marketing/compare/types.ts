import type { ReactNode } from "react";

export type CompareArticleKind = "versus" | "guide";

export type CompareTableRow = {
  label: string;
  competitorValue: string;
  saltValue: string;
};

export type CompareFaqItem = {
  question: string;
  answer: string;
};

export type CompareNarrativeParagraph = {
  type: "paragraph";
  content: ReactNode;
};

export type CompareNarrativeCallout = {
  type: "callout";
  content: ReactNode;
};

export type CompareNarrativeBullets = {
  type: "bullets";
  items: string[];
};

export type CompareNarrativeBlock =
  | CompareNarrativeParagraph
  | CompareNarrativeCallout
  | CompareNarrativeBullets;

export type CompareNarrativePoint = {
  lead: string;
  body: ReactNode;
};

export type CompareNarrativeMockVisualKey = "plays" | "connect" | "morning";

export type CompareNarrativeVisual =
  | { kind: "mock"; key: CompareNarrativeMockVisualKey }
  | { kind: "screenshot"; src: string; alt: string; caption?: string };

export type CompareNarrativeFeatureBlock = {
  title: string;
  points: CompareNarrativePoint[];
  visual: CompareNarrativeVisual;
  visualPlacement?: "left" | "right";
  accent?: "sky" | "violet" | "blush";
};

export type CompareNarrativeClosing = {
  title: string;
  blocks: CompareNarrativeBlock[];
  caption?: string;
  cta?: {
    label: string;
    href: string;
  };
};

export type CompareNarrativeConfig = {
  intro: {
    title: string;
    subtitle: string;
  };
  featureBlocks: CompareNarrativeFeatureBlock[];
  closing: CompareNarrativeClosing;
};

/** @deprecated Legacy editorial sections — use intro + featureBlocks */
export type CompareNarrativeSection = {
  title: string;
  blocks: CompareNarrativeBlock[];
};

export type CompareUserReviewHighlight = {
  title: string;
  body: string;
};

export type ComparePlatformScreenshot = {
  src: string;
  alt: string;
};

export type CompareUserReviewsConfig = {
  competitorName: string;
  g2ReviewsUrl: string;
  /** G2 product profile (screenshots, integrations, overview) */
  g2ProductUrl?: string;
  platformScreenshots?: ComparePlatformScreenshot[];
  platformScreenshotsCaption?: string;
  highlights: CompareUserReviewHighlight[];
};

export type CompareHiddenCostItem = {
  title: string;
  body: string;
};

export type CompareHiddenCostsConfig = {
  heading?: string;
  items: CompareHiddenCostItem[];
};

export type CompareAlternativesGridEntry = {
  title: string;
  strengths: string;
  gap: string;
  cta?: { label: string; href: string };
};

export type CompareAlternativesGridConfig = {
  heading?: string;
  intro?: string;
  entries: CompareAlternativesGridEntry[];
};

export type CompareHeroConfig = {
  kind: CompareArticleKind;
  headline: string;
  thesis: string;
  bullets: string[];
  publishedAt: string;
  authorName?: string;
  competitorSlug?: string;
  heroImageSrc: string;
  heroImageAlt: string;
};

export type CompareArticleMeta = {
  slug: string;
  kind: CompareArticleKind;
  title: string;
  description: string;
  publishedAt: string;
  authorName: string;
  competitorSlug?: string;
  heroImageSrc?: string;
  heroImageAlt?: string;
};

export type CompareArticleShellProps = {
  meta: CompareArticleMeta;
  /** Quo-style hero — pilot on salt-vs-lindy; other slugs use legacy header until migrated */
  hero?: CompareHeroConfig;
  /** Structured table — omitted for guide-only pages until migrated */
  table?: {
    competitorLabel: string;
    competitorSlug?: string;
    rows: CompareTableRow[];
  };
  faq?: CompareFaqItem[];
  /** Structured narrative — pilot on salt-vs-lindy; legacy JSX hidden when set */
  narrative?: CompareNarrativeConfig;
  /** G2-style reviewer highlights — Quo-inspired cons cards */
  userReviews?: CompareUserReviewsConfig;
  /** Quo-inspired hidden costs list below feature comparison */
  hiddenCosts?: CompareHiddenCostsConfig;
  /** Guide pages — category cards instead of versus table */
  alternativesGrid?: CompareAlternativesGridConfig;
  /** Legacy JSX body until Sanity portable text cutover */
  children: ReactNode;
};
