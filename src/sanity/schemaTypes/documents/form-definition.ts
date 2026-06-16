import { defineType, defineField, defineArrayMember } from 'sanity'
import { ComposeIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

const FORM_KIND_OPTIONS = [
  { title: 'Waitlist (gated calculator)', value: 'waitlist-gated-calculator' },
  { title: 'Waitlist', value: 'waitlist' },
  { title: 'Contact', value: 'contact' },
  { title: 'Lead magnet', value: 'lead-magnet' },
] as const

export const formDefinition = defineType({
  name: 'formDefinition',
  title: 'Form',
  type: 'document',
  icon: ComposeIcon as any,
  groups: [
    { name: 'content', title: 'Page copy', default: true },
    { name: 'gate', title: 'Email gate' },
    { name: 'fields', title: 'Fields' },
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
        'Stable identifier for code and analytics (e.g. money-on-the-table). Not a public URL.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Internal title',
      type: 'string',
      group: 'meta',
      description: 'Studio label for editors.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'route',
      title: 'Route',
      type: 'string',
      group: 'meta',
      description: 'Public path (e.g. /money-on-the-table).',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'formKind',
      title: 'Form kind',
      type: 'string',
      group: 'meta',
      options: {
        list: [...FORM_KIND_OPTIONS],
        layout: 'radio',
      },
      initialValue: 'waitlist-gated-calculator',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'waitlistSource',
      title: 'Waitlist source',
      type: 'string',
      group: 'meta',
      description: 'Analytics source passed to saveWaitlistLeadAction.',
    }),
    defineField({
      name: 'analyticsEvent',
      title: 'Analytics event',
      type: 'string',
      group: 'meta',
      description: 'Primary completion event (e.g. calculator_completed).',
    }),
    defineField({
      name: 'gateAnalyticsEvent',
      title: 'Gate analytics event',
      type: 'string',
      group: 'meta',
      description: 'Email gate submit event (e.g. calculator_gate_submit).',
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'text',
      group: 'content',
      rows: 2,
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
      name: 'submitLabel',
      title: 'Submit button label',
      type: 'string',
      group: 'content',
      description:
        'Inline form CTA (homepage hero / waitlist panel). For /waitlist, use gate submit label.',
    }),
    defineField({
      name: 'emailPlaceholder',
      title: 'Email placeholder',
      type: 'string',
      group: 'content',
      description: 'Placeholder for email inputs (inline form and /waitlist email step).',
    }),
    defineField({
      name: 'gateEyebrow',
      title: 'Gate eyebrow',
      type: 'string',
      group: 'gate',
    }),
    defineField({
      name: 'gateHeading',
      title: 'Gate heading',
      type: 'text',
      group: 'gate',
      rows: 2,
    }),
    defineField({
      name: 'gateSubheading',
      title: 'Gate subheading',
      type: 'text',
      group: 'gate',
      rows: 3,
    }),
    defineField({
      name: 'gateSubmitLabel',
      title: 'Gate submit label',
      type: 'string',
      group: 'gate',
    }),
    defineField({
      name: 'gateDisclaimer',
      title: 'Gate disclaimer',
      type: 'text',
      group: 'gate',
      rows: 2,
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      group: 'fields',
      of: [defineArrayMember({ type: 'formField' })],
    }),
  ],
  orderings: [
    {
      title: 'Title',
      name: 'titleAsc',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      key: 'key',
      route: 'route',
      language: 'language',
    },
    prepare({ title, key, route, language }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      return {
        title: `${langLabel} ${title}`.trim(),
        subtitle: `${key} · ${route}`,
        media: ComposeIcon as any,
      }
    },
  },
})
