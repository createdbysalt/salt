export interface PortableTextBlock {
  _type: 'block'
  _key: string
  style?: string
  listItem?: string
  level?: number
  children: Array<{
    _type: string
    _key: string
    text?: string
    marks?: string[]
  }>
  markDefs?: Array<{
    _type: string
    _key: string
    [key: string]: unknown
  }>
}

export interface SanityImage {
  _type: 'image'
  asset: {
    _ref: string
    _type: 'reference'
  }
  alt?: string
}

export interface SEO {
  _type: 'seo'
  metaTitle?: string
  metaDescription?: string
  ogImage?: SanityImage
}

export interface HeroSection {
  _type: 'heroSection'
  _key: string
  headline: string
  subheadline?: string
  primaryCTA?: {
    text: string
    href: string
  }
  secondaryCTA?: {
    text: string
    href: string
  }
  backgroundImage?: SanityImage
}

export interface FeatureItem {
  _type: 'featureItem'
  _key: string
  title: string
  description: string
  icon?: string
}

export interface FeaturesSection {
  _type: 'featuresSection'
  _key: string
  heading?: string
  subheading?: string
  features: FeatureItem[]
}

export interface PricingTier {
  _type: 'pricingTier'
  _key: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  description?: string
  features: string[]
  highlighted?: boolean
  ctaText?: string
  ctaHref?: string
}

export interface PricingSection {
  _type: 'pricingSection'
  _key: string
  heading?: string
  subheading?: string
  tiers: PricingTier[]
}

export interface CTASection {
  _type: 'ctaSection'
  _key: string
  heading: string
  subheading?: string
  primaryCTA?: {
    text: string
    href: string
  }
  secondaryCTA?: {
    text: string
    href: string
  }
}

export interface FAQItem {
  _type: 'faqItem'
  _key: string
  question: string
  answer: string
}

export interface FAQSection {
  _type: 'faqSection'
  _key: string
  heading?: string
  items: FAQItem[]
}

export interface TextSection {
  _type: 'textSection'
  _key: string
  heading?: string
  body: PortableTextBlock[]
}

export interface Testimonial {
  _type: 'testimonial'
  _id: string
  quote: string
  authorName: string
  authorTitle?: string
  authorCompany?: string
  authorImage?: SanityImage
}

export interface TestimonialsSection {
  _type: 'testimonialsSection'
  _key: string
  heading?: string
  testimonials: Testimonial[]
}

export type PageSection =
  | HeroSection
  | FeaturesSection
  | PricingSection
  | CTASection
  | FAQSection
  | TextSection
  | TestimonialsSection

export interface LandingPage {
  _type: 'landingPage'
  _id: string
  title: string
  slug: {
    current: string
  }
  pageBuilder: PageSection[]
  seo?: SEO
}

export interface Author {
  _type: 'author'
  _id: string
  name: string
  slug: {
    current: string
  }
  bio?: string
  image?: SanityImage
}

export interface Category {
  _type: 'category'
  _id: string
  title: string
  slug: {
    current: string
  }
  description?: string
}

export interface BlogPost {
  _type: 'blogPost'
  _id: string
  title: string
  slug: {
    current: string
  }
  excerpt?: string
  body: PortableTextBlock[]
  publishedAt: string
  author?: Author
  category?: Category
  featuredImage?: SanityImage
  seo?: SEO
}

export interface LegalPage {
  _type: 'legalPage'
  _id: string
  title: string
  slug: {
    current: string
  }
  body: PortableTextBlock[]
  lastUpdated: string
  seo?: SEO
}

export interface SiteSettings {
  _type: 'siteSettings'
  _id: string
  siteName: string
  tagline?: string
  logo?: SanityImage
  favicon?: SanityImage
  socialLinks?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  defaultSeo?: SEO
}
