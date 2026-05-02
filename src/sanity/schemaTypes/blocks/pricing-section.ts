import { defineType, defineField, defineArrayMember } from 'sanity'
import { CreditCardIcon } from '@sanity/icons'

export const pricingTier = defineType({
  name: 'pricingTier',
  title: 'Pricing Tier',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Tier Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'string',
    }),
    defineField({
      name: 'monthlyPrice',
      title: 'Monthly Price',
      type: 'number',
    }),
    defineField({
      name: 'yearlyPrice',
      title: 'Yearly Price',
      type: 'number',
    }),
    defineField({
      name: 'features',
      title: 'Features',
      type: 'array',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'highlighted',
      title: 'Highlighted (Recommended)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'ctaText',
      title: 'CTA Text',
      type: 'string',
      initialValue: 'Get Started',
    }),
    defineField({
      name: 'ctaHref',
      title: 'CTA Link',
      type: 'string',
    }),
  ],
  preview: {
    select: { title: 'name', price: 'monthlyPrice' },
    prepare({ title, price }) {
      return { title, subtitle: price ? `$${price}/mo` : 'No price set' }
    },
  },
})

export const pricingSection = defineType({
  name: 'pricingSection',
  title: 'Pricing Section',
  type: 'object',
  icon: CreditCardIcon as any,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'tiers',
      title: 'Pricing Tiers',
      type: 'array',
      of: [defineArrayMember({ type: 'pricingTier' })],
      validation: (rule) => rule.max(4),
    }),
  ],
  preview: {
    select: { title: 'heading', tiers: 'tiers' },
    prepare({ title, tiers }) {
      return {
        title: title || 'Pricing Section',
        subtitle: `Pricing (${tiers?.length || 0} tiers)`,
        media: CreditCardIcon as any,
      }
    },
  },
})
