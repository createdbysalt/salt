import type { CompareArticleSlug } from "../../compare-slugs";
import type {
  CompareAlternativesGridConfig,
  CompareFaqItem,
  CompareHiddenCostsConfig,
  CompareUserReviewsConfig,
} from "../../types";
import { SALT_ALTERNATIVES_COMPARE_TEMPLATE } from "./salt-alternatives";
import { SALT_VS_CHATGPT_COMPARE_TEMPLATE } from "./salt-vs-chatgpt";
import { SALT_VS_HIRING_A_VA_COMPARE_TEMPLATE } from "./salt-vs-hiring-a-va";
import { SALT_VS_LINDY_COMPARE_TEMPLATE } from "./salt-vs-lindy";
import { SALT_VS_VIKTOR_COMPARE_TEMPLATE } from "./salt-vs-viktor";
import type { ComparePageTemplate } from "./types";

export type { ComparePageTemplate, CompareSanityTemplate } from "./types";

export {
  SALT_VS_LINDY_COMPARE_TEMPLATE,
  SALT_VS_VIKTOR_COMPARE_TEMPLATE,
  SALT_VS_CHATGPT_COMPARE_TEMPLATE,
  SALT_VS_HIRING_A_VA_COMPARE_TEMPLATE,
  SALT_ALTERNATIVES_COMPARE_TEMPLATE,
};

const COMPARE_PAGE_TEMPLATES: Record<CompareArticleSlug, ComparePageTemplate> = {
  "salt-vs-lindy": SALT_VS_LINDY_COMPARE_TEMPLATE,
  "salt-vs-viktor": SALT_VS_VIKTOR_COMPARE_TEMPLATE,
  "salt-vs-chatgpt": SALT_VS_CHATGPT_COMPARE_TEMPLATE,
  "salt-vs-hiring-a-va": SALT_VS_HIRING_A_VA_COMPARE_TEMPLATE,
  "salt-alternatives": SALT_ALTERNATIVES_COMPARE_TEMPLATE,
};

export function getComparePageTemplate(
  slug: CompareArticleSlug,
): ComparePageTemplate | undefined {
  return COMPARE_PAGE_TEMPLATES[slug];
}

export function listComparePageTemplates(): ComparePageTemplate[] {
  return Object.values(COMPARE_PAGE_TEMPLATES);
}

export type StructuredCompareTemplateExtras = {
  table?: {
    competitorLabel: string;
    competitorSlug?: string;
    rows: { label: string; competitorValue: string; saltValue: string }[];
  };
  hiddenCosts?: CompareHiddenCostsConfig;
  userReviews?: CompareUserReviewsConfig;
  alternativesGrid?: CompareAlternativesGridConfig;
  faq?: CompareFaqItem[];
};

/** Registry-backed structured sections — safe to import from unit tests (no content.tsx). */
export function getStructuredCompareTemplateExtras(
  slug: CompareArticleSlug,
): StructuredCompareTemplateExtras {
  const template = getComparePageTemplate(slug);
  if (!template) {
    return {};
  }

  const tableSlug = COMPARE_TABLE_COMPETITOR_SLUG[slug];

  const result: StructuredCompareTemplateExtras = {
    faq: template.faq.items.map((item) => ({
      question: item.question,
      answer: item.answer,
    })),
  };

  if (template.compareFeatureTable) {
    result.table = {
      competitorLabel: template.compareFeatureTable.competitorLabel,
      competitorSlug: tableSlug,
      rows: template.compareFeatureTable.rows.map((row) => ({ ...row })),
    };
  }

  if (template.compareHiddenCosts) {
    result.hiddenCosts = {
      heading: template.compareHiddenCosts.heading,
      items: template.compareHiddenCosts.items.map((item) => ({ ...item })),
    };
  }

  if (template.compareUserReviews) {
    result.userReviews = {
      ...template.compareUserReviews,
      highlights: template.compareUserReviews.highlights.map((item) => ({ ...item })),
      platformScreenshots: template.compareUserReviews.platformScreenshots
        ? [...template.compareUserReviews.platformScreenshots]
        : undefined,
    };
  }

  if (template.alternativesGrid) {
    result.alternativesGrid = {
      heading: template.alternativesGrid.heading,
      intro: template.alternativesGrid.intro,
      entries: template.alternativesGrid.entries.map((entry) => ({
        ...entry,
        cta: entry.cta ? { ...entry.cta } : undefined,
      })),
    };
  }

  return result;
}

/** Competitor label for feature table when slug has no logo mapping (e.g. hiring a VA). */
export const COMPARE_TABLE_COMPETITOR_SLUG: Partial<
  Record<CompareArticleSlug, string | undefined>
> = {
  "salt-vs-lindy": "lindy",
  "salt-vs-viktor": "viktor",
  "salt-vs-chatgpt": "chatgpt",
  "salt-vs-hiring-a-va": undefined,
  "salt-alternatives": undefined,
};
