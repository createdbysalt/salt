import { defineType, defineField, defineArrayMember } from 'sanity'
import { RocketIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

export const marketingCta = defineType({
  name: 'marketingCta',
  title: 'Marketing CTA',
  type: 'document',
  icon: RocketIcon as any,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'meta', title: 'Meta' },
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
      name: 'key',
      title: 'Key',
      type: 'string',
      group: 'meta',
      description:
        'Stable identifier for where this CTA is used (e.g. cta-waitlist). Not a public URL.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'content',
      description: 'Small label above the headline (e.g. Early access)',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subheading',
      title: 'Subheading',
      type: 'text',
      group: 'content',
      rows: 3,
    }),
    defineField({
      name: 'benefits',
      title: 'Benefits',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'string' })],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'disclaimer',
      title: 'Disclaimer',
      type: 'string',
      group: 'content',
      description: 'Small trust line under benefits (e.g. No countdown timers)',
    }),
    defineField({
      name: 'footerText',
      title: 'Footer text',
      type: 'text',
      group: 'content',
      rows: 2,
      description: 'Closing line below the form',
    }),
    defineField({
      name: 'secondaryLinkLead',
      title: 'Secondary link lead-in',
      type: 'string',
      group: 'content',
      description:
        'Short line before the optional secondary link (e.g. Want to see the gap first?)',
    }),
    defineField({
      name: 'secondaryLink',
      title: 'Secondary link',
      type: 'link',
      group: 'content',
      description:
        'Softer action below the form — e.g. Money on the table calculator',
    }),
    defineField({
      name: 'waitlistSource',
      title: 'Waitlist form source',
      type: 'string',
      group: 'meta',
      description: 'Analytics source passed to the waitlist form',
      initialValue: 'homepage-cta',
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      key: 'key',
      language: 'language',
    },
    prepare({ heading, key, language }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      return {
        title: `${langLabel} ${heading}`.trim(),
        subtitle: key,
        media: RocketIcon as any,
      }
    },
  },
})
