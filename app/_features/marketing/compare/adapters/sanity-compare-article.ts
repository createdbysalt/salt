import type { BlogPost } from '@/app/_lib/sanity/types'
import { getCompareHeroImage } from '@/app/_features/marketing/compare/compare-hero-images'
import type {
  CompareFaqItem,
  CompareHeroConfig,
  CompareHiddenCostsConfig,
  CompareNarrativeConfig,
  CompareNarrativeFeatureBlock,
  CompareNarrativeMockVisualKey,
  CompareNarrativeVisual,
  CompareTableRow,
  CompareUserReviewsConfig,
} from '@/app/_features/marketing/compare/types'

export function hasSanityCompareTemplate(post: BlogPost): boolean {
  return Boolean(
    post.compareHero?.headline ||
      post.compareFeatureTable?.rows?.length ||
      post.compareNarrative?.introTitle,
  )
}

function mapNarrativeVisual(
  visual: NonNullable<BlogPost['compareNarrative']>['featureBlocks'][number]['visual'],
): CompareNarrativeVisual {
  if (!visual) {
    return { kind: 'mock', key: 'morning' }
  }

  if (visual.visualKind === 'screenshot' && visual.screenshotSrc && visual.screenshotAlt) {
    return {
      kind: 'screenshot',
      src: visual.screenshotSrc,
      alt: visual.screenshotAlt,
      caption: visual.screenshotCaption,
    }
  }

  const mockKey = (visual.mockKey ?? 'morning') as CompareNarrativeMockVisualKey
  return { kind: 'mock', key: mockKey }
}

export function mapSanityCompareHero(
  post: BlogPost,
  slug: string,
  fallback?: { publishedAt?: string; authorName?: string; kind?: 'versus' | 'guide' },
): CompareHeroConfig | undefined {
  const hero = post.compareHero
  if (!hero?.headline || !hero.thesis || !hero.bullets?.length) {
    return undefined
  }

  const heroImage = getCompareHeroImage(slug)
  const competitorSlug = post.primaryCompetitor?.slug?.current

  return {
    kind: post.compareHub?.hubKind ?? fallback?.kind ?? 'versus',
    headline: hero.headline,
    thesis: hero.thesis,
    bullets: hero.bullets,
    publishedAt: post.publishedAt ?? fallback?.publishedAt ?? new Date().toISOString(),
    authorName: post.author?.name ?? fallback?.authorName,
    competitorSlug,
    heroImageSrc: heroImage.src,
    heroImageAlt: heroImage.alt,
  }
}

export function mapSanityCompareTable(post: BlogPost):
  | {
      competitorLabel: string
      competitorSlug?: string
      rows: CompareTableRow[]
    }
  | undefined {
  const table = post.compareFeatureTable
  if (!table?.rows?.length) {
    return undefined
  }

  return {
    competitorLabel:
      table.competitorLabel ?? post.primaryCompetitor?.name ?? 'Competitor',
    competitorSlug: post.primaryCompetitor?.slug?.current,
    rows: table.rows.map((row) => ({
      label: row.label,
      competitorValue: row.competitorValue,
      saltValue: row.saltValue,
    })),
  }
}

export function mapSanityCompareHiddenCosts(
  post: BlogPost,
): CompareHiddenCostsConfig | undefined {
  const section = post.compareHiddenCosts
  if (!section?.items?.length) {
    return undefined
  }

  return {
    heading: section.heading,
    items: section.items.map((item) => ({
      title: item.title,
      body: item.body,
    })),
  }
}

export function mapSanityCompareNarrative(
  post: BlogPost,
): CompareNarrativeConfig | undefined {
  const narrative = post.compareNarrative
  if (!narrative?.introTitle || !narrative.introSubtitle) {
    return undefined
  }

  const featureBlocks: CompareNarrativeFeatureBlock[] = (narrative.featureBlocks ?? []).map(
    (block) => ({
      title: block.title,
      accent: block.accent,
      visualPlacement: block.visualPlacement,
      visual: mapNarrativeVisual(block.visual),
      points: block.points.map((point) => ({
        lead: point.lead,
        body: point.body,
      })),
    }),
  )

  return {
    intro: {
      title: narrative.introTitle,
      subtitle: narrative.introSubtitle,
    },
    featureBlocks,
    closing: {
      title: narrative.closingTitle ?? 'The bottom line',
      blocks: (narrative.closingParagraphs ?? []).map((paragraph) => ({
        type: 'paragraph' as const,
        content: paragraph,
      })),
      cta:
        narrative.closingCtaLabel && narrative.closingCtaHref
          ? {
              label: narrative.closingCtaLabel,
              href: narrative.closingCtaHref,
            }
          : undefined,
    },
  }
}

export function mapSanityCompareUserReviews(
  post: BlogPost,
): CompareUserReviewsConfig | undefined {
  const reviews = post.compareUserReviews
  if (!reviews?.g2ReviewsUrl || !reviews.highlights?.length) {
    return undefined
  }

  return {
    competitorName: reviews.competitorName ?? post.primaryCompetitor?.name ?? 'Competitor',
    g2ReviewsUrl: reviews.g2ReviewsUrl,
    g2ProductUrl: reviews.g2ProductUrl,
    platformScreenshotsCaption: reviews.platformScreenshotsCaption,
    platformScreenshots: reviews.platformScreenshots?.map((shot) => ({
      src: shot.src,
      alt: shot.alt,
    })),
    highlights: reviews.highlights.map((item) => ({
      title: item.title,
      body: item.body,
    })),
  }
}

export function mapSanityCompareFaq(post: BlogPost): CompareFaqItem[] | undefined {
  const items = post.faq?.items
  if (!items?.length) {
    return undefined
  }

  return items.map((item) => ({
    question: item.question,
    answer: item.answer,
  }))
}

export function mapSanityCompareExtras(post: BlogPost, slug: string) {
  return {
    hero: mapSanityCompareHero(post, slug),
    table: mapSanityCompareTable(post),
    hiddenCosts: mapSanityCompareHiddenCosts(post),
    narrative: mapSanityCompareNarrative(post),
    userReviews: mapSanityCompareUserReviews(post),
    alternativesGrid: undefined,
    faq: mapSanityCompareFaq(post),
  }
}
