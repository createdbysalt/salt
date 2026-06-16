import { defineType, defineField, defineArrayMember, type SanityDocument } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

type CompareBlogDocument = {
  articleKind?: string
}

const isCompareOrGuide = (document?: SanityDocument) => {
  const kind = (document as CompareBlogDocument | undefined)?.articleKind
  return kind === 'comparison' || kind === 'guide'
}

const isComparison = (document?: SanityDocument) =>
  (document as CompareBlogDocument | undefined)?.articleKind === 'comparison'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  icon: DocumentTextIcon as any,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'compare', title: 'Compare page (①–⑥)' },
    { name: 'meta', title: 'Meta' },
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
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'Brief summary for listings and SEO',
    }),
    defineField({
      name: 'featuredImage',
      title: 'Featured Image',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [
        { name: 'alt', title: 'Alt Text', type: 'string' },
      ],
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      group: 'meta',
      to: [{ type: 'author' }],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      group: 'meta',
      to: [{ type: 'category' }],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      group: 'meta',
    }),
    defineField({
      name: 'articleKind',
      title: 'Article kind',
      type: 'string',
      group: 'compare',
      options: {
        list: [
          { title: 'Article', value: 'article' },
          { title: 'Comparison', value: 'comparison' },
          { title: 'Guide', value: 'guide' },
        ],
        layout: 'radio',
      },
      initialValue: 'article',
    }),
    defineField({
      name: 'primaryCompetitor',
      title: 'Primary competitor',
      type: 'reference',
      group: 'compare',
      to: [{ type: 'competitor' }],
      description: 'Drives hub card label and logo on vs pages',
      hidden: ({ document }) =>
        document?.articleKind !== 'comparison' && document?.articleKind !== 'guide',
    }),
    defineField({
      name: 'compareHub',
      title: 'Compare hub',
      type: 'object',
      group: 'compare',
      hidden: ({ document }) => !isCompareOrGuide(document),
      fields: [
        {
          name: 'showOnHub',
          title: 'Show on /compare hub',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'hubLabel',
          title: 'Hub card label',
          type: 'string',
          description: 'Override label on hub cards (defaults to competitor name or title)',
        },
        {
          name: 'hubDescription',
          title: 'Hub card description',
          type: 'text',
          rows: 2,
        },
        {
          name: 'hubKind',
          title: 'Hub card kind',
          type: 'string',
          options: {
            list: [
              { title: 'Versus', value: 'versus' },
              { title: 'Guide', value: 'guide' },
            ],
            layout: 'radio',
          },
          initialValue: 'versus',
        },
        {
          name: 'hubAnchor',
          title: 'Hub position',
          type: 'string',
          options: {
            list: [
              { title: 'Default (vs pages)', value: 'default' },
              { title: 'Hiring a VA (near end)', value: 'hiring-va' },
              { title: 'All alternatives (last)', value: 'alternatives' },
            ],
            layout: 'radio',
          },
          initialValue: 'default',
        },
        {
          name: 'sortOrder',
          title: 'Sort order',
          type: 'number',
          description: 'Within the same hub position group (lower = earlier)',
          initialValue: 0,
        },
      ],
    }),
    defineField({
      name: 'compareHero',
      title: '① Hero',
      type: 'compareHeroSection',
      group: 'compare',
      description:
        'Headline, thesis, bullets — renders with workspace preview. Same order as the live /compare page.',
      hidden: ({ document }) => !isCompareOrGuide(document),
    }),
    defineField({
      name: 'compareFeatureTable',
      title: '② Feature table',
      type: 'compareFeatureTableSection',
      group: 'compare',
      description: 'Salt vs competitor rows. Waitlist CTA follows this section on the site.',
      hidden: ({ document }) => !isComparison(document),
    }),
    defineField({
      name: 'compareHiddenCosts',
      title: '③ Hidden costs',
      type: 'compareHiddenCostsSection',
      group: 'compare',
      hidden: ({ document }) => !isComparison(document),
    }),
    defineField({
      name: 'compareNarrative',
      title: '④ Narrative',
      type: 'compareNarrativeSection',
      group: 'compare',
      description: 'Quo-style zigzag feature blocks + closing CTA.',
      hidden: ({ document }) => !isCompareOrGuide(document),
    }),
    defineField({
      name: 'compareUserReviews',
      title: '⑤ User reviews',
      type: 'compareUserReviewsSection',
      group: 'compare',
      description: 'G2 highlights and platform screenshots.',
      hidden: ({ document }) => !isComparison(document),
    }),
    defineField({
      name: 'faq',
      title: '⑥ FAQ',
      type: 'faqSection',
      group: 'compare',
      description: 'Accordion above the waitlist footer.',
      hidden: ({ document }) => !isCompareOrGuide(document),
    }),
    defineField({
      name: 'relatedComparisons',
      title: 'Related comparisons',
      type: 'array',
      group: 'compare',
      of: [{ type: 'reference', to: [{ type: 'blogPost' }] }],
      hidden: ({ document }) => !isCompareOrGuide(document),
    }),
    defineField({
      name: 'comparisonTable',
      title: 'Legacy comparison table (landing block)',
      type: 'comparisonSection',
      group: 'compare',
      description: 'Deprecated — use ② Feature table. Kept for older documents.',
      hidden: () => true,
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
            { title: 'Quote', value: 'blockquote' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'string', title: 'URL' },
                  { name: 'blank', type: 'boolean', title: 'Open in new tab' },
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            { name: 'alt', title: 'Alt Text', type: 'string' },
            { name: 'caption', title: 'Caption', type: 'string' },
          ],
        }),
        defineArrayMember({
          type: 'code',
          options: {
            language: 'typescript',
            languageAlternatives: [
              { title: 'TypeScript', value: 'typescript' },
              { title: 'JavaScript', value: 'javascript' },
              { title: 'CSS', value: 'css' },
              { title: 'HTML', value: 'html' },
              { title: 'Bash', value: 'bash' },
              { title: 'JSON', value: 'json' },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Published Date, New',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      media: 'featuredImage',
      language: 'language',
    },
    prepare({ title, author, media, language }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      return {
        title: `${langLabel} ${title}`.trim(),
        subtitle: author ? `by ${author}` : 'No author',
        media,
      }
    },
  },
})
