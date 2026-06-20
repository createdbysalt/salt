import { getClient } from './client'
import { dedupeBlogPostsBySlug, dedupeCategoriesByRouteSlug } from './blog-dedupe'
import type {
  LandingPage,
  BlogPost,
  LegalPage,
  SiteSettings,
  Category,
  Author,
  CompareHubEntryFromSanity,
  LandingCapabilityCard,
  MarketingCta,
  FormDefinition,
} from './types'

const marketingCtaFields = `
  _id,
  _type,
  key,
  eyebrow,
  heading,
  subheading,
  benefits,
  disclaimer,
  footerText,
  secondaryLinkLead,
  secondaryLink {
    text,
    linkType,
    href,
    openInNewTab
  },
  waitlistSource
`

const landingPageFields = `
  _id,
  _type,
  title,
  slug,
  pageVariant,
  icpSegment,
  homepageContent {
    heroBadge,
    heroHeadline,
    heroSubheadline,
    heroWaitlistSource,
    heroMicroline,
    heroShowPreview,
    heroPreviewVisualKey,
    productEyebrow,
    productTitle,
    structuredDataFaqs[] {
      question,
      answer
    }
  },
  hubContent {
    eyebrow,
    headline,
    subheadline
  },
  featureCards[]-> {
    _id,
    _type,
    key,
    title,
    label,
    visualKey,
    sortOrder,
    showOnLanding,
    landingPageKey
  },
  waitlistCta-> {
    ${marketingCtaFields}
  },
  pageBuilder[] {
    _type,
    _key,
    ...,
    testimonials[]-> {
      _id,
      quote,
      authorName,
      authorTitle,
      authorCompany,
      authorImage
    }
  },
  seo
`

const blogPostFields = `
  _id,
  _type,
  title,
  slug,
  excerpt,
  keyTakeaways,
  body,
  publishedAt,
  updatedAt,
  articleKind,
  compareHub,
  compareHero,
  compareFeatureTable,
  compareHiddenCosts,
  compareNarrative,
  compareUserReviews,
  comparisonTable,
  faq,
  articleFaq,
  primaryCompetitor-> {
    _id,
    _type,
    name,
    slug,
    website,
    logo,
    logoSource,
    category,
    isSalt
  },
  relatedPosts[]-> {
    _id,
    title,
    slug
  },
  relatedComparisons[]-> {
    _id,
    title,
    slug,
    articleKind,
    compareHub
  },
  author-> {
    _id,
    name,
    slug,
    jobTitle,
    bio,
    image
  },
  category-> {
    _id,
    title,
    titleShort,
    slug,
    legacyArticleSlug,
    description
  },
  featuredImage,
  seo
`

const compareHubEntryFields = `
  "slug": slug.current,
  "label": coalesce(compareHub.hubLabel, primaryCompetitor->name, title),
  "description": compareHub.hubDescription,
  "kind": coalesce(compareHub.hubKind, "versus"),
  "competitorSlug": primaryCompetitor->slug.current,
  "hubAnchor": coalesce(compareHub.hubAnchor, "default"),
  "sortOrder": coalesce(compareHub.sortOrder, 0)
`

const legalPageFields = `
  _id,
  _type,
  title,
  slug,
  body,
  lastUpdated,
  seo
`

export async function getLandingPage(
  slug: string,
  preview = false
): Promise<LandingPage | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "landingPage" && slug.current == $slug][0] {
      ${landingPageFields}
    }`,
    { slug }
  )
}

export async function getHomePage(preview = false): Promise<LandingPage | null> {
  return getLandingPage('home', preview)
}

export async function getAllLandingPages(preview = false): Promise<LandingPage[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "landingPage"] | order(title asc) {
      ${landingPageFields}
    }`
  )
}

export async function getBlogPost(
  slug: string,
  preview = false
): Promise<BlogPost | null> {
  const client = getClient(preview)
  const posts: BlogPost[] = await client.fetch(
    `*[_type == "blogPost" && slug.current == $slug] {
      ${blogPostFields}
    }`,
    { slug }
  )

  const [post] = dedupeBlogPostsBySlug(posts)
  return post ?? null
}

export async function getAllBlogPosts(preview = false): Promise<BlogPost[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost"] | order(publishedAt desc) {
      ${blogPostFields}
    }`
  )
}

export async function getBlogPostsByCategory(
  categorySlug: string,
  preview = false
): Promise<BlogPost[]> {
  const client = getClient(preview)
  const posts: BlogPost[] = await client.fetch(
    `*[_type == "blogPost" && category->slug.current == $categorySlug] | order(publishedAt desc) {
      ${blogPostFields}
    }`,
    { categorySlug }
  )

  return dedupeBlogPostsBySlug(posts)
}

export async function getLegalPage(
  slug: string,
  preview = false
): Promise<LegalPage | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "legalPage" && slug.current == $slug][0] {
      ${legalPageFields}
    }`,
    { slug }
  )
}

export async function getAllLegalPages(preview = false): Promise<LegalPage[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "legalPage"] | order(title asc) {
      ${legalPageFields}
    }`
  )
}

export async function getSiteSettings(preview = false): Promise<SiteSettings | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "siteSettings" && language == "en"][0] {
      _id,
      _type,
      language,
      title,
      description,
      logo,
      favicon,
      ogImage,
      navigation[] {
        _key,
        text,
        linkType,
        href,
        openInNewTab
      },
      footerNavigation[] {
        _key,
        text,
        linkType,
        href,
        openInNewTab
      },
      legalNavigation[] {
        _key,
        text,
        linkType,
        href,
        openInNewTab
      },
      ctaButton {
        text,
        linkType,
        href,
        openInNewTab
      },
      supportEmail,
      llmInfoEyebrow,
      llmInfoLink {
        text,
        linkType,
        href,
        openInNewTab
      },
      copyrightHolder,
      social,
      organization,
      softwareApplication
    }`
  )
}

export async function getAllCategories(preview = false): Promise<Category[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "category"] | order(sortOrder asc, title asc) {
      _id,
      _type,
      title,
      titleShort,
      slug,
      description,
      legacyArticleSlug,
      sortOrder,
      seo
    }`
  )
}

export async function getCategoryBySlug(
  slug: string,
  preview = false
): Promise<Category | null> {
  const client = getClient(preview)
  const categories: Category[] = await client.fetch(
    `*[_type == "category" && slug.current == $slug] {
      _id,
      _type,
      title,
      titleShort,
      slug,
      description,
      legacyArticleSlug,
      sortOrder,
      seo
    }`,
    { slug }
  )

  const [category] = dedupeCategoriesByRouteSlug(categories)
  return category ?? null
}

export async function getAllAuthors(preview = false): Promise<Author[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "author"] | order(name asc) {
      _id,
      _type,
      name,
      slug,
      jobTitle,
      bio,
      image,
      social
    }`
  )
}

export async function getAuthor(
  slug: string,
  preview = false
): Promise<Author | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "author" && slug.current == $slug][0] {
      _id,
      _type,
      name,
      slug,
      jobTitle,
      bio,
      image,
      social
    }`,
    { slug }
  )
}

export async function getCompareHubEntriesFromSanity(
  preview = false
): Promise<CompareHubEntryFromSanity[]> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost" && compareHub.showOnHub == true] {
      ${compareHubEntryFields}
    }`
  )
}

export async function getCompareBlogPost(
  slug: string,
  preview = false
): Promise<BlogPost | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "blogPost" && slug.current == $slug && articleKind in ["comparison", "guide"]][0] {
      ${blogPostFields}
    }`,
    { slug }
  )
}

const landingCapabilityCardFields = `
  _id,
  _type,
  key,
  title,
  label,
  visualKey,
  sortOrder,
  showOnLanding,
  landingPageKey
`

export async function getLandingCapabilityCards(
  landingSlug = 'home',
  preview = false
): Promise<LandingCapabilityCard[]> {
  const client = getClient(preview)

  const fromLandingRefs = await client.fetch<LandingCapabilityCard[]>(
    `*[_type == "landingPage" && slug.current == $slug][0].featureCards[]-> | order(sortOrder asc, title asc) {
      ${landingCapabilityCardFields}
    }`,
    { slug: landingSlug }
  )

  if (fromLandingRefs?.length) {
    return fromLandingRefs
  }

  const fromLandingKey = await client.fetch<LandingCapabilityCard[]>(
    `*[_type == "featurePage" && landingPageKey == $slug] | order(sortOrder asc, title asc) {
      ${landingCapabilityCardFields}
    }`,
    { slug: landingSlug }
  )

  if (fromLandingKey?.length) {
    return fromLandingKey
  }

  if (landingSlug !== 'home') {
    const homeCards = await client.fetch<LandingCapabilityCard[] | null>(
      `*[_type == "landingPage" && slug.current == "home"][0].featureCards[]-> | order(sortOrder asc, title asc) {
        ${landingCapabilityCardFields}
      }`
    )
    if (homeCards?.length) {
      return homeCards
    }
  }

  return client.fetch(
    `*[_type == "featurePage" && showOnLanding != false && !defined(landingPageKey)] | order(sortOrder asc, title asc) {
      ${landingCapabilityCardFields}
    }`
  )
}

export async function getMarketingCta(
  key: string,
  preview = false
): Promise<MarketingCta | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "marketingCta" && key == $key][0] {
      ${marketingCtaFields}
    }`,
    { key }
  )
}

const formDefinitionFields = `
  _id,
  _type,
  key,
  title,
  route,
  formKind,
  waitlistSource,
  analyticsEvent,
  gateAnalyticsEvent,
  eyebrow,
  heading,
  subheading,
  submitLabel,
  emailPlaceholder,
  gateEyebrow,
  gateHeading,
  gateSubheading,
  gateSubmitLabel,
  gateDisclaimer,
  fields[] {
    _key,
    key,
    label,
    fieldType,
    required,
    helpText,
    placeholder,
    eyebrow,
    questionNumber,
    conditionalOn,
    sortOrder,
    options[] {
      _key,
      value,
      label
    }
  }
`

export async function getFormDefinition(
  key: string,
  preview = false
): Promise<FormDefinition | null> {
  const client = getClient(preview)
  return client.fetch(
    `*[_type == "formDefinition" && key == $key][0] {
      ${formDefinitionFields}
    }`,
    { key }
  )
}
