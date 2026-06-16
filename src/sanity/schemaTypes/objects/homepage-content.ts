import { defineType, defineField } from 'sanity'

export const homepageContent = defineType({
  name: 'homepageContent',
  title: 'Homepage content',
  type: 'object',
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
      name: 'productEyebrow',
      title: 'Product section eyebrow',
      type: 'string',
      description: 'Label above the Product section title',
    }),
    defineField({
      name: 'productTitle',
      title: 'Product section title',
      type: 'string',
    }),
  ],
})
