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
  title?: string
  description?: string
  image?: SanityImage
  noIndex?: boolean
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
  _type?: 'faqSection'
  _key?: string
  heading?: string
  items: Array<{
    question: string
    answer: string
    _key?: string
  }>
}

export interface CompareHeroSectionData {
  headline: string
  thesis: string
  bullets: string[]
}

export interface CompareFeatureTableRow {
  label: string
  competitorValue: string
  saltValue: string
}

export interface CompareFeatureTableSectionData {
  competitorLabel?: string
  rows: CompareFeatureTableRow[]
}

export interface CompareHiddenCostItemData {
  title: string
  body: string
}

export interface CompareHiddenCostsSectionData {
  heading?: string
  items: CompareHiddenCostItemData[]
}

export interface CompareNarrativeVisualData {
  visualKind: 'mock' | 'screenshot'
  mockKey?: 'plays' | 'connect' | 'morning'
  screenshotSrc?: string
  screenshotAlt?: string
  screenshotCaption?: string
}

export interface CompareNarrativePointData {
  lead: string
  body: string
}

export interface CompareNarrativeFeatureBlockData {
  title: string
  accent?: 'sky' | 'violet' | 'blush'
  visualPlacement?: 'left' | 'right'
  visual: CompareNarrativeVisualData
  points: CompareNarrativePointData[]
}

export interface CompareNarrativeSectionData {
  introTitle: string
  introSubtitle: string
  featureBlocks: CompareNarrativeFeatureBlockData[]
  closingTitle?: string
  closingParagraphs?: string[]
  closingCtaLabel?: string
  closingCtaHref?: string
}

export interface ComparePlatformScreenshotData {
  src: string
  alt: string
}

export interface CompareUserReviewHighlightData {
  title: string
  body: string
}

export interface CompareUserReviewsSectionData {
  competitorName?: string
  g2ReviewsUrl: string
  g2ProductUrl?: string
  platformScreenshotsCaption?: string
  platformScreenshots?: ComparePlatformScreenshotData[]
  highlights: CompareUserReviewHighlightData[]
}

export type ComparisonCellValueType = 'yes' | 'no' | 'partial' | 'text'

export interface ComparisonCellValue {
  type?: ComparisonCellValueType
  text?: string
  tooltip?: string
}

export interface ComparisonColumn {
  name?: string
  highlight?: boolean
  logo?: SanityImage
}

export interface ComparisonFeatureRow {
  feature?: string
  category?: string
  values?: ComparisonCellValue[]
}

export interface ComparisonSection {
  _type: 'comparisonSection'
  eyebrow?: string
  headline?: string
  subtitle?: string
  comparisonType?: 'plans' | 'competitors' | 'beforeAfter'
  columns?: ComparisonColumn[]
  features?: ComparisonFeatureRow[]
  footnote?: string
}

export type CompareHubAnchor = 'default' | 'hiring-va' | 'alternatives'

export type CompareHubKind = 'versus' | 'guide'

export type ArticleKind = 'article' | 'comparison' | 'guide'

export interface CompareHubSettings {
  showOnHub?: boolean
  hubLabel?: string
  hubDescription?: string
  hubKind?: CompareHubKind
  hubAnchor?: CompareHubAnchor
  sortOrder?: number
}

export interface Competitor {
  _type: 'competitor'
  _id: string
  name: string
  slug: {
    current: string
  }
  website?: string
  logo?: SanityImage
  logoSource?: 'brandfetch' | 'manual' | 'favicon'
  category?: string
  isSalt?: boolean
  attributionNote?: string
}

export interface CompareHubEntryFromSanity {
  slug: string
  label: string
  description?: string
  kind: CompareHubKind
  competitorSlug?: string
  hubAnchor?: CompareHubAnchor
  sortOrder?: number
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

export interface HubPageContent {
  eyebrow?: string
  headline?: string
  subheadline?: string
}

export interface LandingPage {
  _type: 'landingPage'
  _id: string
  title: string
  slug: {
    current: string
  }
  pageVariant?: 'marketing-home' | 'segment-landing' | 'blog-hub' | 'compare-hub' | 'page-builder'
  icpSegment?: string
  homepageContent?: HomepageContent
  hubContent?: HubPageContent
  featureCards?: LandingCapabilityCard[]
  waitlistCta?: MarketingCta
  pageBuilder?: PageSection[]
  seo?: SEO
}

export interface HomepageStructuredDataFaq {
  question: string
  answer: string
}

export interface HomepageContent {
  heroBadge?: string
  heroHeadline?: string
  heroSubheadline?: string
  heroWaitlistSource?: string
  heroMicroline?: string
  heroShowPreview?: boolean
  heroPreviewVisualKey?: string
  productEyebrow?: string
  productTitle?: string
  structuredDataFaqs?: HomepageStructuredDataFaq[]
}

export interface AuthorSocial {
  twitter?: string
  linkedin?: string
  github?: string
}

export interface Author {
  _type: 'author'
  _id: string
  name: string
  slug: {
    current: string
  }
  jobTitle?: string
  bio?: string
  image?: SanityImage
  social?: AuthorSocial
}

export interface Category {
  _type: 'category'
  _id: string
  title: string
  titleShort?: string
  slug: {
    current: string
  }
  description?: string
  legacyArticleSlug?: string
  sortOrder?: number
  seo?: SEO
}

export interface BlogPost {
  _type: 'blogPost'
  _id: string
  title: string
  slug: {
    current: string
  }
  excerpt?: string
  keyTakeaways?: string[]
  body: PortableTextBlock[]
  publishedAt: string
  updatedAt?: string
  author?: Author
  category?: Category
  featuredImage?: SanityImage
  seo?: SEO
  articleKind?: ArticleKind
  primaryCompetitor?: Competitor
  compareHub?: CompareHubSettings
  compareHero?: CompareHeroSectionData
  compareFeatureTable?: CompareFeatureTableSectionData
  compareHiddenCosts?: CompareHiddenCostsSectionData
  compareNarrative?: CompareNarrativeSectionData
  compareUserReviews?: CompareUserReviewsSectionData
  comparisonTable?: ComparisonSection
  faq?: FAQSection
  articleFaq?: FAQSection
  relatedPosts?: Array<Pick<BlogPost, "_id" | "title" | "slug">>
  relatedComparisons?: BlogPost[]
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

export type CapabilityVisualKey =
  | 'integrations'
  | 'capture-memory'
  | 'morning-brief'
  | 'plays'
  | 'intelligence'
  | 'playbooks'

export interface LandingCapabilityCard {
  _type: 'featurePage'
  _id: string
  key: string
  title: string
  label: string
  visualKey: CapabilityVisualKey
  sortOrder?: number
  showOnLanding?: boolean
  landingPageKey?: string
}

export interface MarketingCta {
  _type: 'marketingCta'
  _id: string
  key: string
  eyebrow?: string
  heading: string
  subheading?: string
  benefits?: string[]
  disclaimer?: string
  footerText?: string
  secondaryLinkLead?: string
  secondaryLink?: SanityLink
  waitlistSource?: string
}

export type FormFieldType =
  | 'email'
  | 'text'
  | 'number'
  | 'select'
  | 'radio'
  | 'multi-select'
  | 'boolean'

export interface FormFieldOption {
  value: string
  label: string
}

export interface FormField {
  _key?: string
  key: string
  label: string
  fieldType: FormFieldType
  required?: boolean
  helpText?: string
  placeholder?: string
  eyebrow?: string
  questionNumber?: string
  options?: FormFieldOption[]
  conditionalOn?: string
  sortOrder?: number
}

export type FormKind =
  | 'waitlist-gated-calculator'
  | 'waitlist'
  | 'contact'
  | 'lead-magnet'
  | 'blog-newsletter'

export interface FormDefinition {
  _type: 'formDefinition'
  _id: string
  key: string
  title: string
  route: string
  formKind: FormKind
  waitlistSource?: string
  analyticsEvent?: string
  gateAnalyticsEvent?: string
  eyebrow?: string
  heading?: string
  subheading?: string
  submitLabel?: string
  emailPlaceholder?: string
  gateEyebrow?: string
  gateHeading?: string
  gateSubheading?: string
  gateSubmitLabel?: string
  gateDisclaimer?: string
  fields?: FormField[]
}

export interface OrganizationData {
  name: string
  legalName?: string
  description?: string
  url?: string
  logo?: string
  foundingDate?: string
  founders?: Array<{ name: string; url?: string }>
  contactEmail?: string
  sameAs?: string[]
}

export interface SoftwareApplicationData {
  name?: string
  description?: string
  applicationCategory?: string
  operatingSystem?: string
  offers?: {
    price?: number
    priceCurrency?: string
    priceValidUntil?: string
  }
}

export interface SanityLink {
  _type?: 'link'
  _key?: string
  text: string
  linkType?: 'internal' | 'external'
  href: string
  openInNewTab?: boolean
}

export interface SiteSettingsSocial {
  twitter?: string
  linkedin?: string
  github?: string
  instagram?: string
  reddit?: string
  youtube?: string
}

export interface SiteSettings {
  _type: 'siteSettings'
  _id: string
  language?: string
  title: string
  description?: string
  logo?: SanityImage
  favicon?: SanityImage
  ogImage?: SanityImage
  navigation?: SanityLink[]
  footerNavigation?: SanityLink[]
  legalNavigation?: SanityLink[]
  ctaButton?: SanityLink
  supportEmail?: string
  llmInfoEyebrow?: string
  llmInfoLink?: SanityLink
  copyrightHolder?: string
  social?: SiteSettingsSocial
  /** @deprecated Use `title` — kept for llms.txt and legacy queries */
  siteName?: string
  /** @deprecated Use `description` */
  tagline?: string
  /** @deprecated Use `social` */
  socialLinks?: SiteSettingsSocial
  defaultSeo?: SEO
  organization?: OrganizationData
  softwareApplication?: SoftwareApplicationData
}
