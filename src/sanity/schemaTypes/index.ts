import { type SchemaTypeDefinition } from 'sanity'

// Objects
import { seo } from './objects/seo'
import { link } from './objects/link'
import { homepageContent } from './objects/homepage-content'
import { hubPageContent } from './objects/hub-page-content'
import { organizationData, softwareApplicationData } from './objects/structured-data'

// Blocks (page builder sections)
import { heroSection } from './blocks/hero-section'
import { problemSection } from './blocks/problem-section'
import { featuresSection, featureItem } from './blocks/features-section'
import { transformationSection } from './blocks/transformation-section'
import { pricingSection, pricingTier } from './blocks/pricing-section'
import { faqSection } from './blocks/faq-section'
import { ctaSection } from './blocks/cta-section'
import { testimonialsSection } from './blocks/testimonials-section'
import { textSection } from './blocks/text-section'
import { comparisonSection } from './blocks/comparison-section'
import { comparePageSectionTypes } from './blocks/compare-page-sections'

// Documents
import { landingPage } from './documents/landing-page'
import { blogPost } from './documents/blog-post'
import { competitor } from './documents/competitor'
import { author } from './documents/author'
import { category } from './documents/category'
import { legalPage } from './documents/legal-page'
import { siteSettings } from './documents/site-settings'
import { testimonial } from './documents/testimonial'
import { docCategory } from './documents/doc-category'
import { docArticle } from './documents/doc-article'
import { feedback } from './documents/feedback'
import { featurePage } from './documents/feature-page'
import { marketingCta } from './documents/marketing-cta'
import { formField } from './objects/form-field'
import { formDefinition } from './documents/form-definition'
import { formSubmission } from './documents/form-submission'

export const schemaTypes: SchemaTypeDefinition[] = [
  // Objects (reusable)
  seo,
  link,
  homepageContent,
  hubPageContent,
  organizationData,
  softwareApplicationData,
  formField,

  // Blocks (page builder sections)
  heroSection,
  problemSection,
  featuresSection,
  featureItem,
  transformationSection,
  pricingSection,
  pricingTier,
  faqSection,
  ctaSection,
  testimonialsSection,
  textSection,
  comparisonSection,
  ...comparePageSectionTypes,

  // Documents
  landingPage,
  blogPost,
  competitor,
  author,
  category,
  legalPage,
  siteSettings,
  testimonial,
  docCategory,
  docArticle,
  feedback,
  featurePage,
  marketingCta,
  formDefinition,
  formSubmission,
]
