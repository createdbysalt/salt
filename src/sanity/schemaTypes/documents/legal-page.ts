import { defineType, defineField, defineArrayMember } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal Page',
  type: 'document',
  icon: DocumentTextIcon as any,
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
      name: 'managementType',
      title: 'Management Type',
      type: 'string',
      group: 'content',
      description: 'How this legal page is managed. Termageddon pages auto-update from their service; self-managed pages use the body content below.',
      options: {
        list: [
          { title: 'Termageddon (auto-updating)', value: 'termageddon' },
          { title: 'Self-managed (edit in Sanity)', value: 'self-managed' },
        ],
        layout: 'radio',
      },
      initialValue: 'self-managed',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'termageddonPolicyId',
      title: 'Termageddon Policy ID',
      type: 'string',
      group: 'content',
      description: 'The base64-encoded policy ID from Termageddon. Find this in your Termageddon dashboard under the embed code.',
      hidden: ({ parent }) => parent?.managementType !== 'termageddon',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { managementType?: string }
          if (parent?.managementType === 'termageddon' && !value) {
            return 'Policy ID is required for Termageddon-managed pages'
          }
          return true
        }),
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
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'date',
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      description: 'Content for self-managed pages. Ignored for Termageddon-managed pages.',
      hidden: ({ parent }) => parent?.managementType === 'termageddon',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2', value: 'h2' },
            { title: 'H3', value: 'h3' },
            { title: 'H4', value: 'h4' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [{ name: 'href', type: 'string', title: 'URL' }],
              },
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
  preview: {
    select: { title: 'title', lastUpdated: 'lastUpdated', language: 'language', managementType: 'managementType' },
    prepare({ title, lastUpdated, language, managementType }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      const typeLabel = managementType === 'termageddon' ? '🔗 Termageddon' : '📝 Self-managed'
      const dateLabel = lastUpdated ? `Updated: ${lastUpdated}` : 'No date'
      return {
        title: `${langLabel} ${title}`.trim(),
        subtitle: `${typeLabel} · ${dateLabel}`,
      }
    },
  },
})
