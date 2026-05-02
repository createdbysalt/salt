import {seoConfig, type SEOConfig} from './config'

/**
 * JSON-LD Structured Data Helpers
 *
 * These functions generate Schema.org structured data for SEO.
 * Use the component versions to render them in your pages.
 *
 * @see https://schema.org
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

// =============================================================================
// SCHEMA GENERATORS
// =============================================================================

/**
 * Organization schema - used site-wide in the root layout.
 * Tells search engines who runs this website.
 */
export function generateOrganizationSchema(config: SEOConfig = seoConfig) {
  const sameAs = Object.values(config.socialLinks).filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': config.businessType,
    name: config.businessName,
    url: config.siteUrl,
    logo: config.logo ? `${config.siteUrl}${config.logo}` : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

/**
 * WebSite schema - used site-wide in the root layout.
 * Enables sitelinks search box in Google results.
 */
export function generateWebSiteSchema(config: SEOConfig = seoConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: config.siteName,
    url: config.siteUrl,
    description: config.siteDescription,
    publisher: {
      '@type': config.businessType,
      name: config.businessName,
    },
  }
}

/**
 * BreadcrumbList schema - used on interior pages.
 * Shows breadcrumb trail in search results.
 */
export function generateBreadcrumbSchema(
  items: {name: string; url: string}[],
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${config.siteUrl}${item.url}`,
    })),
  }
}

/**
 * Article schema - used on blog posts and articles.
 */
export function generateArticleSchema(
  article: {
    title: string
    description: string
    url: string
    image?: string
    datePublished: string
    dateModified?: string
    authorName?: string
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url.startsWith('http')
      ? article.url
      : `${config.siteUrl}${article.url}`,
    image: article.image,
    datePublished: article.datePublished,
    dateModified: article.dateModified || article.datePublished,
    author: {
      '@type': config.businessType === 'Person' ? 'Person' : 'Organization',
      name: article.authorName || config.businessName,
    },
    publisher: {
      '@type': 'Organization',
      name: config.businessName,
      logo: config.logo
        ? {
            '@type': 'ImageObject',
            url: `${config.siteUrl}${config.logo}`,
          }
        : undefined,
    },
  }
}

/**
 * FAQPage schema - used on pages with FAQ sections.
 * Can trigger rich results in Google.
 */
export function generateFAQSchema(
  faqs: {question: string; answer: string}[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

/**
 * Service schema - used on service/offering pages.
 * Helps AI assistants understand what services you provide.
 */
export function generateServiceSchema(
  service: {
    name: string
    description: string
    url: string
    image?: string
    provider?: string
    areaServed?: string | string[]
    serviceType?: string
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: service.name,
    description: service.description,
    url: service.url.startsWith('http')
      ? service.url
      : `${config.siteUrl}${service.url}`,
    image: service.image,
    provider: {
      '@type': config.businessType,
      name: service.provider || config.businessName,
      url: config.siteUrl,
    },
    areaServed: service.areaServed,
    serviceType: service.serviceType,
  }
}

/**
 * HowTo schema - used on tutorial/guide pages.
 * Can trigger rich results with step-by-step instructions.
 */
export function generateHowToSchema(
  howTo: {
    name: string
    description: string
    image?: string
    totalTime?: string // ISO 8601 duration, e.g., "PT30M" for 30 minutes
    estimatedCost?: {currency: string; value: string}
    steps: {
      name: string
      text: string
      image?: string
      url?: string
    }[]
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.name,
    description: howTo.description,
    image: howTo.image,
    totalTime: howTo.totalTime,
    estimatedCost: howTo.estimatedCost
      ? {
          '@type': 'MonetaryAmount',
          currency: howTo.estimatedCost.currency,
          value: howTo.estimatedCost.value,
        }
      : undefined,
    step: howTo.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      image: step.image,
      url: step.url,
    })),
  }
}

/**
 * Product/Project schema - used on portfolio items or product pages.
 * Helps search engines and AI understand your work.
 */
export function generateProductSchema(
  product: {
    name: string
    description: string
    url: string
    image?: string | string[]
    brand?: string
    category?: string
    datePublished?: string
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    url: product.url.startsWith('http')
      ? product.url
      : `${config.siteUrl}${product.url}`,
    image: product.image,
    brand: {
      '@type': config.businessType,
      name: product.brand || config.businessName,
    },
    category: product.category,
    datePublished: product.datePublished,
  }
}

/**
 * CreativeWork schema - alternative to Product for portfolio/case studies.
 * Better semantic fit for creative agencies.
 */
export function generateCreativeWorkSchema(
  work: {
    name: string
    description: string
    url: string
    image?: string | string[]
    dateCreated?: string
    datePublished?: string
    client?: string
    keywords?: string[]
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: work.name,
    description: work.description,
    url: work.url.startsWith('http') ? work.url : `${config.siteUrl}${work.url}`,
    image: work.image,
    dateCreated: work.dateCreated,
    datePublished: work.datePublished,
    creator: {
      '@type': config.businessType,
      name: config.businessName,
      url: config.siteUrl,
    },
    // Client as "about" entity
    about: work.client
      ? {
          '@type': 'Organization',
          name: work.client,
        }
      : undefined,
    keywords: work.keywords?.join(', '),
  }
}

/**
 * LocalBusiness schema - used for businesses with physical locations.
 */
export function generateLocalBusinessSchema(
  business: {
    name: string
    description?: string
    phone?: string
    email?: string
    address?: {
      street: string
      city: string
      region: string
      postalCode: string
      country: string
    }
    openingHours?: string[] // e.g., ["Mo-Fr 09:00-17:00"]
    priceRange?: string // e.g., "$$"
  },
  config: SEOConfig = seoConfig
) {
  const sameAs = Object.values(config.socialLinks).filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    url: config.siteUrl,
    telephone: business.phone,
    email: business.email,
    address: business.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: business.address.street,
          addressLocality: business.address.city,
          addressRegion: business.address.region,
          postalCode: business.address.postalCode,
          addressCountry: business.address.country,
        }
      : undefined,
    openingHoursSpecification: business.openingHours,
    priceRange: business.priceRange,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

// =============================================================================
// REACT COMPONENTS
// =============================================================================

/**
 * Renders a JSON-LD script tag.
 * Use this in your page components to add structured data.
 *
 * @example
 * <JsonLd data={generateOrganizationSchema()} />
 */
export function JsonLd({data}: {data: Record<string, unknown>}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: JSON.stringify(data)}}
    />
  )
}

/**
 * Renders multiple JSON-LD scripts.
 * Useful when you need Organization + WebSite + Breadcrumb on one page.
 *
 * @example
 * <JsonLdMultiple data={[organizationSchema, websiteSchema, breadcrumbSchema]} />
 */
export function JsonLdMultiple({data}: {data: Record<string, unknown>[]}) {
  return (
    <>
      {data.map((schema, index) => (
        <JsonLd key={index} data={schema} />
      ))}
    </>
  )
}

// =============================================================================
// PRE-BUILT SCHEMA COMPONENTS
// =============================================================================

/**
 * Site-wide structured data (Organization + WebSite).
 * Add this to your root layout for global SEO.
 *
 * @example
 * // In app/(personal)/layout.tsx
 * <SiteStructuredData />
 */
export function SiteStructuredData() {
  const organizationSchema = generateOrganizationSchema()
  const websiteSchema = generateWebSiteSchema()

  return <JsonLdMultiple data={[organizationSchema, websiteSchema]} />
}

/**
 * Breadcrumb structured data.
 *
 * @example
 * <BreadcrumbStructuredData
 *   items={[
 *     { name: 'Home', url: '/' },
 *     { name: 'Projects', url: '/projects' },
 *     { name: 'My Project', url: '/projects/my-project' },
 *   ]}
 * />
 */
export function BreadcrumbStructuredData({
  items,
}: {
  items: {name: string; url: string}[]
}) {
  const schema = generateBreadcrumbSchema(items)
  return <JsonLd data={schema} />
}

/**
 * Article structured data for blog posts.
 *
 * @example
 * <ArticleStructuredData
 *   title="My Blog Post"
 *   description="A summary of the post"
 *   url="/blog/my-post"
 *   datePublished="2024-01-15"
 * />
 */
export function ArticleStructuredData({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
}: {
  title: string
  description: string
  url: string
  image?: string
  datePublished: string
  dateModified?: string
  authorName?: string
}) {
  const schema = generateArticleSchema({
    title,
    description,
    url,
    image,
    datePublished,
    dateModified,
    authorName,
  })
  return <JsonLd data={schema} />
}

/**
 * FAQ structured data for pages with Q&A content.
 *
 * @example
 * <FAQStructuredData
 *   faqs={[
 *     { question: "What is this?", answer: "This is a thing." },
 *     { question: "How does it work?", answer: "It works like this." },
 *   ]}
 * />
 */
export function FAQStructuredData({
  faqs,
}: {
  faqs: {question: string; answer: string}[]
}) {
  const schema = generateFAQSchema(faqs)
  return <JsonLd data={schema} />
}

/**
 * Service structured data for service/offering pages.
 *
 * @example
 * <ServiceStructuredData
 *   name="Web Development"
 *   description="Custom web development services"
 *   url="/services/web-development"
 *   serviceType="Web Development"
 * />
 */
export function ServiceStructuredData({
  name,
  description,
  url,
  image,
  areaServed,
  serviceType,
}: {
  name: string
  description: string
  url: string
  image?: string
  areaServed?: string | string[]
  serviceType?: string
}) {
  const schema = generateServiceSchema({
    name,
    description,
    url,
    image,
    areaServed,
    serviceType,
  })
  return <JsonLd data={schema} />
}

/**
 * HowTo structured data for tutorial/guide pages.
 *
 * @example
 * <HowToStructuredData
 *   name="How to Set Up Your Project"
 *   description="Step-by-step guide to setting up your project"
 *   steps={[
 *     { name: "Install dependencies", text: "Run npm install" },
 *     { name: "Configure environment", text: "Copy .env.example to .env.local" },
 *   ]}
 * />
 */
export function HowToStructuredData({
  name,
  description,
  image,
  totalTime,
  estimatedCost,
  steps,
}: {
  name: string
  description: string
  image?: string
  totalTime?: string
  estimatedCost?: {currency: string; value: string}
  steps: {name: string; text: string; image?: string; url?: string}[]
}) {
  const schema = generateHowToSchema({
    name,
    description,
    image,
    totalTime,
    estimatedCost,
    steps,
  })
  return <JsonLd data={schema} />
}

/**
 * CreativeWork structured data for portfolio/case studies.
 *
 * @example
 * <CreativeWorkStructuredData
 *   name="Brand Redesign for Acme Corp"
 *   description="Complete brand identity overhaul"
 *   url="/projects/acme-rebrand"
 *   client="Acme Corporation"
 *   datePublished="2024-01-15"
 * />
 */
export function CreativeWorkStructuredData({
  name,
  description,
  url,
  image,
  dateCreated,
  datePublished,
  client,
  keywords,
}: {
  name: string
  description: string
  url: string
  image?: string | string[]
  dateCreated?: string
  datePublished?: string
  client?: string
  keywords?: string[]
}) {
  const schema = generateCreativeWorkSchema({
    name,
    description,
    url,
    image,
    dateCreated,
    datePublished,
    client,
    keywords,
  })
  return <JsonLd data={schema} />
}

// =============================================================================
// AEO (ANSWER ENGINE OPTIMIZATION) UTILITIES
// =============================================================================

/**
 * Add speakable property to any schema.
 * Tells AI voice assistants which content to read aloud.
 *
 * @param schema - The base schema object
 * @param cssSelectors - CSS selectors pointing to speakable content
 *
 * @example
 * const articleSchema = generateArticleSchema({...})
 * const withSpeakable = addSpeakable(articleSchema, ['h1', '.summary', '.key-points'])
 */
export function addSpeakable(
  schema: Record<string, unknown>,
  cssSelectors: string[]
): Record<string, unknown> {
  return {
    ...schema,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  }
}

/**
 * Add speakable by XPath (alternative to CSS selectors).
 */
export function addSpeakableXPath(
  schema: Record<string, unknown>,
  xpaths: string[]
): Record<string, unknown> {
  return {
    ...schema,
    speakable: {
      '@type': 'SpeakableSpecification',
      xpath: xpaths,
    },
  }
}

/**
 * Generate a WebPage schema with speakable content.
 * Best for landing pages and key content pages.
 */
export function generateSpeakableWebPageSchema(
  page: {
    name: string
    description: string
    url: string
    speakableSelectors: string[]
    datePublished?: string
    dateModified?: string
  },
  config: SEOConfig = seoConfig
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.name,
    description: page.description,
    url: page.url.startsWith('http') ? page.url : `${config.siteUrl}${page.url}`,
    datePublished: page.datePublished,
    dateModified: page.dateModified,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: page.speakableSelectors,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: config.siteName,
      url: config.siteUrl,
    },
  }
}

/**
 * SpeakableWebPage component for AEO-optimized pages.
 *
 * @example
 * <SpeakableWebPage
 *   name="About Us"
 *   description="Learn about our company"
 *   url="/about"
 *   speakableSelectors={['h1', '.hero-text', '.mission-statement']}
 * />
 */
export function SpeakableWebPage({
  name,
  description,
  url,
  speakableSelectors,
  datePublished,
  dateModified,
}: {
  name: string
  description: string
  url: string
  speakableSelectors: string[]
  datePublished?: string
  dateModified?: string
}) {
  const schema = generateSpeakableWebPageSchema({
    name,
    description,
    url,
    speakableSelectors,
    datePublished,
    dateModified,
  })
  return <JsonLd data={schema} />
}
