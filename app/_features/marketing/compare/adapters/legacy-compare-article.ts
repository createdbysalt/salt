import type { CompareArticle } from "../compare-content";
import { COMPARE_ARTICLE_COMPETITOR } from "../compare-competitors";
import { isCompareArticleSlug } from "../compare-slugs";
import {
  getComparePageTemplate,
  getStructuredCompareTemplateExtras,
  type StructuredCompareTemplateExtras,
} from "../data/compare-templates";
import { getCompareNarrativeForSlug } from "../narratives";
import { getCompareHeroImage } from "../compare-hero-images";
import type { CompareArticleMeta, CompareHeroConfig, CompareNarrativeConfig } from "../types";

export type StructuredCompareExtras = StructuredCompareTemplateExtras & {
  narrative?: CompareNarrativeConfig;
};

export function buildCompareArticleMeta(article: CompareArticle): CompareArticleMeta {
  const competitorSlug = COMPARE_ARTICLE_COMPETITOR[article.slug];
  const heroImage = getCompareHeroImage(article.slug);

  return {
    slug: article.slug,
    kind: competitorSlug ? "versus" : "guide",
    title: article.title,
    description: article.description,
    publishedAt: article.publishedAt,
    authorName: article.author.name,
    competitorSlug,
    heroImageSrc: heroImage?.src,
    heroImageAlt: heroImage?.alt,
  };
}

export function getCompareHeroConfig(
  slug: string,
  article: CompareArticle,
): CompareHeroConfig | undefined {
  if (!isCompareArticleSlug(slug)) {
    return undefined;
  }

  const template = getComparePageTemplate(slug);
  if (!template) {
    return undefined;
  }

  const heroImage = getCompareHeroImage(slug);
  const competitorSlug = COMPARE_ARTICLE_COMPETITOR[slug];

  return {
    kind: competitorSlug ? "versus" : "guide",
    headline: template.compareHero.headline,
    thesis: template.compareHero.thesis,
    bullets: [...template.compareHero.bullets],
    publishedAt: article.publishedAt,
    authorName: article.author.name,
    competitorSlug,
    heroImageSrc: heroImage?.src ?? article.image.urlRelative,
    heroImageAlt: heroImage?.alt ?? article.image.alt,
  };
}

export function getStructuredCompareExtras(slug: string): StructuredCompareExtras {
  if (!isCompareArticleSlug(slug)) {
    return {};
  }

  const extras = getStructuredCompareTemplateExtras(slug);
  const narrative = isCompareArticleSlug(slug) ? getCompareNarrativeForSlug(slug) : undefined;

  return { ...extras, narrative };
}
