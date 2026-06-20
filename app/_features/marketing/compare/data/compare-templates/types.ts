import type { CompareArticleSlug } from "../../compare-slugs";

/** Serializable template fields for Sanity seed + legacy adapter (no React). */
export type CompareTemplateHero = {
  headline: string;
  thesis: string;
  bullets: readonly string[];
};

export type CompareTemplateTableRow = {
  label: string;
  competitorValue: string;
  saltValue: string;
};

export type CompareTemplateFeatureTable = {
  competitorLabel: string;
  rows: readonly CompareTemplateTableRow[];
};

export type CompareTemplateHiddenCosts = {
  heading?: string;
  items: readonly { title: string; body: string }[];
};

export type CompareTemplateUserReviews = {
  competitorName: string;
  g2ReviewsUrl: string;
  g2ProductUrl?: string;
  platformScreenshotsCaption?: string;
  platformScreenshots?: readonly { src: string; alt: string }[];
  highlights: readonly { title: string; body: string }[];
};

export type CompareTemplateFaq = {
  heading?: string;
  items: readonly { question: string; answer: string }[];
};

export type CompareAlternativesGridEntry = {
  title: string;
  strengths: string;
  gap: string;
  cta?: { label: string; href: string };
};

export type CompareTemplateAlternativesGrid = {
  heading?: string;
  intro?: string;
  entries: readonly CompareAlternativesGridEntry[];
};

/** Sanity-shaped narrative seed (React lives in narratives/*.tsx). */
export type CompareTemplateNarrativeSeed = {
  introTitle: string;
  introSubtitle: string;
  featureBlocks: readonly {
    title: string;
    accent?: "sky" | "violet" | "blush";
    visualPlacement?: "left" | "right";
    visual:
      | { visualKind: "mock"; mockKey: "plays" | "connect" | "morning" }
      | {
          visualKind: "screenshot";
          screenshotSrc: string;
          screenshotAlt: string;
          screenshotCaption?: string;
        };
    points: readonly { lead: string; body: string }[];
  }[];
  closingTitle: string;
  closingParagraphs: readonly string[];
  closingCtaLabel?: string;
  closingCtaHref?: string;
};

export type ComparePageTemplate = {
  slug: CompareArticleSlug;
  compareHero: CompareTemplateHero;
  compareFeatureTable?: CompareTemplateFeatureTable;
  compareHiddenCosts?: CompareTemplateHiddenCosts;
  compareNarrative?: CompareTemplateNarrativeSeed;
  compareUserReviews?: CompareTemplateUserReviews;
  alternativesGrid?: CompareTemplateAlternativesGrid;
  faq: CompareTemplateFaq;
};

export type CompareSanityTemplate = ComparePageTemplate;
