/**
 * SEO Configuration
 *
 * These values are set during client onboarding via setup-client.sh.
 * They're used for structured data, meta tags, and sitemap generation.
 *
 * Most of these come from environment variables so they can differ
 * between environments (localhost vs staging vs production).
 */

export type BusinessType = 'Organization' | 'LocalBusiness' | 'Person'

export interface SEOConfig {
  // Site basics
  siteUrl: string
  siteName: string
  siteDescription: string

  // Business/Organization info
  businessType: BusinessType
  businessName: string
  foundingDate?: string

  // Social links (for Organization schema sameAs)
  socialLinks: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
    github?: string
    youtube?: string
  }

  // Contact (for LocalBusiness)
  contact?: {
    email?: string
    phone?: string
    address?: {
      street?: string
      city?: string
      region?: string
      postalCode?: string
      country?: string
    }
  }

  // Default images
  defaultOgImage?: string
  logo?: string
}

/**
 * Build SEO config from environment variables.
 *
 * Environment variables (set in .env.local during onboarding):
 * - NEXT_PUBLIC_SITE_URL - Production URL (required for sitemap/canonical)
 * - NEXT_PUBLIC_SITE_NAME - Business/site name
 * - NEXT_PUBLIC_SITE_DESCRIPTION - Default meta description
 * - NEXT_PUBLIC_BUSINESS_TYPE - Organization, LocalBusiness, or Person
 * - NEXT_PUBLIC_TWITTER_URL - Twitter profile URL
 * - NEXT_PUBLIC_LINKEDIN_URL - LinkedIn profile/company URL
 * - NEXT_PUBLIC_INSTAGRAM_URL - Instagram profile URL
 * - NEXT_PUBLIC_FACEBOOK_URL - Facebook page URL
 * - NEXT_PUBLIC_GITHUB_URL - GitHub profile/org URL
 * - NEXT_PUBLIC_YOUTUBE_URL - YouTube channel URL
 */
export function getSEOConfig(): SEOConfig {
  return {
    siteUrl:
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://usesalt.io',
    siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Salt',
    siteDescription:
      process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
      'The proactive AI for your business. Salt learns from connected accounts, prepares what\'s next, and you approve what grows.',

    businessType:
      (process.env.NEXT_PUBLIC_BUSINESS_TYPE as BusinessType) || 'Organization',
    businessName: process.env.NEXT_PUBLIC_SITE_NAME || 'Salt',
    foundingDate: '2025',

    socialLinks: {
      twitter: process.env.NEXT_PUBLIC_TWITTER_URL || 'https://x.com/usesalt',
      linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL,
      instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      github: process.env.NEXT_PUBLIC_GITHUB_URL,
    },

    logo: '/logo.svg',
    defaultOgImage: '/opengraph-image.png',
  }
}

// Export a singleton for convenience
export const seoConfig = getSEOConfig()
