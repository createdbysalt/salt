import { defineType, defineField, defineArrayMember } from 'sanity'

export const homepageContent = defineType({
  name: 'homepageContent',
  title: 'Homepage content',
  type: 'object',
  description:
    'Marketing copy for the homepage. Visual components are implemented in code; visualKey fields document which component renders.',
  fields: [
    defineField({
      name: 'heroBadge',
      title: 'Hero badge',
      type: 'string',
      description: 'Small pill above the headline',
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroSubheadline',
      title: 'Hero subheadline',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'heroWaitlistSource',
      title: 'Hero waitlist source',
      type: 'string',
      description: 'Analytics tag for the hero waitlist form',
      initialValue: 'homepage-hero',
    }),
    defineField({
      name: 'heroMicroline',
      title: 'Hero microline',
      type: 'string',
      description:
        'Trust line under the hero waitlist form. Used on segment landing pages.',
    }),
    defineField({
      name: 'heroShowPreview',
      title: 'Show hero workspace preview',
      type: 'boolean',
      description:
        'When off, hides the animated product preview below the hero (segment landings).',
      initialValue: true,
    }),
    defineField({
      name: 'heroPreviewVisualKey',
      title: 'Hero preview visual',
      type: 'string',
      options: {
        list: [
          {
            title: 'Workspace demo (HQ animation)',
            value: 'workspace-demo',
          },
        ],
        layout: 'radio',
      },
      description:
        'Animated product preview below the hero. Renders via Landing2HeroWorkspacePreview in code.',
      initialValue: 'workspace-demo',
    }),
    defineField({
      name: 'productEyebrow',
      title: 'Features section eyebrow',
      type: 'string',
      description: 'Label above the Features section title',
    }),
    defineField({
      name: 'productTitle',
      title: 'Features section title',
      type: 'string',
    }),
    defineField({
      name: 'structuredDataFaqs',
      title: 'Structured data FAQs (SEO/AEO)',
      type: 'array',
      description:
        'FAQ copy for JSON-LD on the homepage. Not shown in the page UI.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'question',
              title: 'Question',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'answer',
              title: 'Answer',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: 'question' },
          },
        }),
      ],
    }),
  ],
})
