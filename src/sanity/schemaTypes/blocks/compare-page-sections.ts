import { defineType, defineField, defineArrayMember } from 'sanity'
import {
  BlockElementIcon,
  ThListIcon,
  WarningOutlineIcon,
  BlockContentIcon,
  StarIcon,
  HelpCircleIcon,
} from '@sanity/icons'

/** ① Hero — matches CompareDetailHero on /compare/[slug] */
export const compareHeroSection = defineType({
  name: 'compareHeroSection',
  title: 'Compare hero',
  type: 'object',
  icon: BlockElementIcon as any,
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'thesis',
      title: 'Thesis',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bullets',
      title: 'Bullets',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      validation: (rule) => rule.min(1).max(6),
    }),
  ],
  preview: {
    select: { title: 'headline', subtitle: 'thesis' },
    prepare({ title, subtitle }) {
      return {
        title: title || 'Compare hero',
        subtitle: subtitle?.slice(0, 80),
        media: BlockElementIcon as any,
      }
    },
  },
})

/** ② Feature table — matches CompareFeatureTable (Salt vs competitor rows) */
export const compareFeatureTableSection = defineType({
  name: 'compareFeatureTableSection',
  title: 'Compare feature table',
  type: 'object',
  icon: ThListIcon as any,
  fields: [
    defineField({
      name: 'competitorLabel',
      title: 'Competitor column label',
      type: 'string',
      description: 'Defaults to primary competitor name when empty',
    }),
    defineField({
      name: 'rows',
      title: 'Rows',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Feature',
              type: 'string',
              validation: (rule) => rule.required(),
            },
            {
              name: 'competitorValue',
              title: 'Competitor',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required(),
            },
            {
              name: 'saltValue',
              title: 'Salt',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required(),
            },
          ],
          preview: {
            select: { title: 'label' },
          },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { rows: 'rows' },
    prepare({ rows }) {
      return {
        title: 'Feature table',
        subtitle: `${rows?.length ?? 0} rows`,
        media: ThListIcon as any,
      }
    },
  },
})

/** ③ Hidden costs — matches CompareHiddenCostsSection */
export const compareHiddenCostsSection = defineType({
  name: 'compareHiddenCostsSection',
  title: 'Compare hidden costs',
  type: 'object',
  icon: WarningOutlineIcon as any,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Hidden Costs',
    }),
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() },
            { name: 'body', title: 'Body', type: 'text', rows: 3, validation: (rule) => rule.required() },
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { heading: 'heading', items: 'items' },
    prepare({ heading, items }) {
      return {
        title: heading || 'Hidden costs',
        subtitle: `${items?.length ?? 0} items`,
        media: WarningOutlineIcon as any,
      }
    },
  },
})

const compareNarrativeVisual = defineType({
  name: 'compareNarrativeVisual',
  title: 'Narrative visual',
  type: 'object',
  fields: [
    defineField({
      name: 'visualKind',
      title: 'Visual type',
      type: 'string',
      options: {
        list: [
          { title: 'Salt product mock', value: 'mock' },
          { title: 'Screenshot (URL)', value: 'screenshot' },
        ],
        layout: 'radio',
      },
      initialValue: 'mock',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'mockKey',
      title: 'Mock variant',
      type: 'string',
      options: {
        list: [
          { title: 'Plays', value: 'plays' },
          { title: 'Connect', value: 'connect' },
          { title: 'Morning queue', value: 'morning' },
        ],
      },
      hidden: ({ parent }) => parent?.visualKind !== 'mock',
    }),
    defineField({
      name: 'screenshotSrc',
      title: 'Screenshot path',
      type: 'string',
      description: 'Site path, e.g. /compare/lindy/platform-builder.png',
      hidden: ({ parent }) => parent?.visualKind !== 'screenshot',
    }),
    defineField({
      name: 'screenshotAlt',
      title: 'Screenshot alt text',
      type: 'string',
      hidden: ({ parent }) => parent?.visualKind !== 'screenshot',
    }),
    defineField({
      name: 'screenshotCaption',
      title: 'Screenshot caption',
      type: 'string',
      hidden: ({ parent }) => parent?.visualKind !== 'screenshot',
    }),
  ],
})

/** ④ Narrative — matches CompareNarrative (Quo zigzag) */
export const compareNarrativeSection = defineType({
  name: 'compareNarrativeSection',
  title: 'Compare narrative',
  type: 'object',
  icon: BlockContentIcon as any,
  fields: [
    defineField({
      name: 'introTitle',
      title: 'Intro title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'introSubtitle',
      title: 'Intro subtitle',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'featureBlocks',
      title: 'Feature blocks',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'title', title: 'Block title', type: 'string', validation: (rule) => rule.required() },
            {
              name: 'accent',
              title: 'Accent',
              type: 'string',
              options: {
                list: [
                  { title: 'Sky', value: 'sky' },
                  { title: 'Violet', value: 'violet' },
                  { title: 'Blush', value: 'blush' },
                ],
              },
            },
            {
              name: 'visualPlacement',
              title: 'Visual placement',
              type: 'string',
              options: {
                list: [
                  { title: 'Left', value: 'left' },
                  { title: 'Right', value: 'right' },
                ],
                layout: 'radio',
              },
              initialValue: 'right',
            },
            {
              name: 'visual',
              title: 'Visual',
              type: 'compareNarrativeVisual',
              validation: (rule) => rule.required(),
            },
            {
              name: 'points',
              title: 'Points',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  fields: [
                    { name: 'lead', title: 'Lead', type: 'string', validation: (rule) => rule.required() },
                    { name: 'body', title: 'Body', type: 'text', rows: 3, validation: (rule) => rule.required() },
                  ],
                  preview: { select: { title: 'lead' } },
                }),
              ],
              validation: (rule) => rule.min(1).max(4),
            },
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: 'closingTitle',
      title: 'Closing title',
      type: 'string',
      initialValue: 'The bottom line',
    }),
    defineField({
      name: 'closingParagraphs',
      title: 'Closing paragraphs',
      type: 'array',
      of: [defineArrayMember({ type: 'text', rows: 3 })],
    }),
    defineField({
      name: 'closingCtaLabel',
      title: 'Closing CTA label',
      type: 'string',
      initialValue: 'Join the waitlist',
    }),
    defineField({
      name: 'closingCtaHref',
      title: 'Closing CTA href',
      type: 'string',
      initialValue: '#waitlist',
    }),
  ],
  preview: {
    select: { title: 'introTitle', blocks: 'featureBlocks' },
    prepare({ title, blocks }) {
      return {
        title: title || 'Compare narrative',
        subtitle: `${blocks?.length ?? 0} feature blocks`,
        media: BlockContentIcon as any,
      }
    },
  },
})

/** ⑤ User reviews — matches CompareUserReviewsSection */
export const compareUserReviewsSection = defineType({
  name: 'compareUserReviewsSection',
  title: 'Compare user reviews',
  type: 'object',
  icon: StarIcon as any,
  fields: [
    defineField({
      name: 'competitorName',
      title: 'Competitor name',
      type: 'string',
      description: 'Defaults to primary competitor when empty',
    }),
    defineField({
      name: 'g2ReviewsUrl',
      title: 'G2 reviews URL',
      type: 'url',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'g2ProductUrl',
      title: 'G2 product URL',
      type: 'url',
    }),
    defineField({
      name: 'platformScreenshotsCaption',
      title: 'Platform screenshots caption',
      type: 'string',
    }),
    defineField({
      name: 'platformScreenshots',
      title: 'Platform screenshots',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'src', title: 'Path', type: 'string', validation: (rule) => rule.required() },
            { name: 'alt', title: 'Alt text', type: 'string', validation: (rule) => rule.required() },
          ],
          preview: { select: { title: 'alt' } },
        }),
      ],
    }),
    defineField({
      name: 'highlights',
      title: 'Review highlights',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'title', title: 'Title', type: 'string', validation: (rule) => rule.required() },
            { name: 'body', title: 'Body', type: 'text', rows: 3, validation: (rule) => rule.required() },
          ],
          preview: { select: { title: 'title' } },
        }),
      ],
      validation: (rule) => rule.min(1),
    }),
  ],
  preview: {
    select: { name: 'competitorName', highlights: 'highlights' },
    prepare({ name, highlights }) {
      return {
        title: name ? `${name} reviews` : 'User reviews',
        subtitle: `${highlights?.length ?? 0} highlights`,
        media: StarIcon as any,
      }
    },
  },
})

export const comparePageSectionTypes = [
  compareHeroSection,
  compareFeatureTableSection,
  compareHiddenCostsSection,
  compareNarrativeVisual,
  compareNarrativeSection,
  compareUserReviewsSection,
]
