import { defineType, defineField, defineArrayMember, type SanityDocument } from 'sanity'
import { DocumentIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

type LandingPageDocument = {
  slug?: { current?: string }
  pageVariant?: string
}

const isMarketingHome = (document?: SanityDocument) => {
  const doc = document as LandingPageDocument | undefined
  if (doc?.pageVariant === 'marketing-home') return true
  if (doc?.pageVariant === 'segment-landing') return false
  if (doc?.pageVariant === 'blog-hub') return false
  if (doc?.pageVariant === 'compare-hub') return false
  if (doc?.pageVariant === 'page-builder') return false
  return doc?.slug?.current === 'home'
}

const isHubPage = (document?: SanityDocument) => {
  const doc = document as LandingPageDocument | undefined
  return doc?.pageVariant === 'blog-hub' || doc?.pageVariant === 'compare-hub'
}

const isSegmentLanding = (document?: SanityDocument) => {
  const doc = document as LandingPageDocument | undefined
  return doc?.pageVariant === 'segment-landing'
}

const usesHeroContent = (document?: SanityDocument) => {
  const doc = document as LandingPageDocument | undefined
  if (doc?.pageVariant === 'marketing-home') return true
  if (doc?.pageVariant === 'segment-landing') return true
  if (doc?.pageVariant === 'page-builder') return false
  return doc?.slug?.current === 'home'
}

export const landingPage = defineType({
  name: 'landingPage',
  title: 'Landing Page',
  type: 'document',
  icon: DocumentIcon as any,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'i18n', title: 'Localization' },
  ],
  fields: [
    defineField({
      name: 'language',
      title: 'Language',
      type: 'string',
      group: 'i18n',
      options: {
        list: supportedLanguages.map((lang) => ({
          title: lang.title,
          value: lang.id,
        })),
      },
      initialValue: defaultLanguage.id,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'pageVariant',
      title: 'Page variant',
      type: 'string',
      group: 'content',
      options: {
        list: [
          {
            title: 'Marketing homepage (hero + features + waitlist)',
            value: 'marketing-home',
          },
          {
            title: 'Segment landing (hero + features + waitlist)',
            value: 'segment-landing',
          },
          { title: 'Blog hub (/blog)', value: 'blog-hub' },
          { title: 'Compare hub (/compare)', value: 'compare-hub' },
          { title: 'Page builder (legacy sections)', value: 'page-builder' },
        ],
        layout: 'radio',
      },
      description:
        'Marketing homepage uses the same layout as usesalt.io/. Duplicate this variant per ICP and edit copy only.',
      initialValue: 'page-builder',
    }),
    defineField({
      name: 'icpSegment',
      title: 'ICP segment label',
      type: 'string',
      group: 'content',
      description:
        'Internal label for who this copy targets (e.g. Coaches, Creatives, Consultants). Not shown on the page.',
      hidden: ({ document }) => !isMarketingHome(document) && !isSegmentLanding(document),
    }),
    defineField({
      name: 'homepageContent',
      title: 'Homepage content',
      type: 'homepageContent',
      group: 'content',
      description:
        'Hero and Features header copy. Segment landings keep segment hero copy; feature cards are linked below. Waitlist block copy comes from the CTA reference.',
      hidden: ({ document }) => !usesHeroContent(document),
    }),
    defineField({
      name: 'featureCards',
      title: 'Feature cards',
      type: 'array',
      group: 'content',
      of: [{ type: 'reference', to: [{ type: 'featurePage' }] }],
      description:
        'Ordered feature cards for this landing. Segment landings can reuse homepage cards or duplicate per ICP later.',
      hidden: ({ document }) => !isMarketingHome(document) && !isSegmentLanding(document),
    }),
    defineField({
      name: 'waitlistCta',
      title: 'Waitlist CTA',
      type: 'reference',
      group: 'content',
      to: [{ type: 'marketingCta' }],
      description:
        'Aurora waitlist section. Duplicate the CTA per ICP landing so waitlist copy can vary.',
      hidden: ({ document }) => !usesHeroContent(document),
    }),
    defineField({
      name: 'hubContent',
      title: 'Hub hero',
      type: 'hubPageContent',
      group: 'content',
      description: 'Hero copy for /blog or /compare hub pages.',
      hidden: ({ document }) => !isHubPage(document),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page Sections',
      type: 'array',
      group: 'content',
      hidden: ({ document }) => isMarketingHome(document) || isHubPage(document),
      of: [
        defineArrayMember({ type: 'heroSection' }),
        defineArrayMember({ type: 'problemSection' }),
        defineArrayMember({ type: 'featuresSection' }),
        defineArrayMember({ type: 'transformationSection' }),
        defineArrayMember({ type: 'pricingSection' }),
        defineArrayMember({ type: 'faqSection' }),
        defineArrayMember({ type: 'testimonialsSection' }),
        defineArrayMember({ type: 'comparisonSection' }),
        defineArrayMember({ type: 'ctaSection' }),
        defineArrayMember({ type: 'textSection' }),
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      language: 'language',
      pageVariant: 'pageVariant',
      icpSegment: 'icpSegment',
    },
    prepare({ title, slug, language, pageVariant, icpSegment }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      const variantLabel =
        pageVariant === 'blog-hub'
          ? 'Blog hub'
          : pageVariant === 'compare-hub'
            ? 'Compare hub'
            : pageVariant === 'segment-landing'
          ? icpSegment
            ? `Segment · ${icpSegment}`
            : 'Segment landing'
          : pageVariant === 'marketing-home' || slug === 'home'
            ? icpSegment
              ? `Marketing home · ${icpSegment}`
              : 'Marketing homepage'
            : 'Page builder'
      const path =
        slug === 'home'
          ? '/'
          : pageVariant === 'segment-landing'
            ? `/for/${slug || ''}`
            : pageVariant === 'blog-hub'
              ? '/blog'
              : pageVariant === 'compare-hub'
                ? '/compare'
                : `/${slug || ''}`
      return {
        title: `${langLabel} ${title}`.trim(),
        subtitle: `${variantLabel} · ${path}`,
      }
    },
  },
})
