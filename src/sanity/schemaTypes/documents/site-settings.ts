import { defineType, defineField } from 'sanity'
import { CogIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon as any,
  groups: [
    { name: 'general', title: 'General', default: true },
    { name: 'navigation', title: 'Navigation' },
    { name: 'social', title: 'Social' },
    { name: 'structuredData', title: 'Structured Data (AEO)' },
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
      title: 'Site Title',
      type: 'string',
      group: 'general',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Site Description',
      type: 'text',
      group: 'general',
      rows: 2,
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'general',
      options: { hotspot: true },
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'general',
    }),
    defineField({
      name: 'ogImage',
      title: 'Default OG Image',
      type: 'image',
      group: 'general',
      description: 'Default social sharing image',
    }),
    defineField({
      name: 'navigation',
      title: 'Main Navigation',
      type: 'array',
      group: 'navigation',
      of: [{ type: 'link' }],
    }),
    defineField({
      name: 'footerNavigation',
      title: 'Footer explore links',
      type: 'array',
      group: 'navigation',
      of: [{ type: 'link' }],
      description: 'Primary footer column (Product, Compare, Learn, etc.)',
    }),
    defineField({
      name: 'legalNavigation',
      title: 'Footer legal links',
      type: 'array',
      group: 'navigation',
      of: [{ type: 'link' }],
      description: 'Privacy, Terms, and other legal links in the footer bar',
    }),
    defineField({
      name: 'supportEmail',
      title: 'Support email',
      type: 'string',
      group: 'general',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'llmInfoLink',
      title: 'Hey AI / LLM info link',
      type: 'link',
      group: 'navigation',
      description: 'Footer link to llm-info for AI crawlers and assistants',
    }),
    defineField({
      name: 'copyrightHolder',
      title: 'Copyright holder',
      type: 'string',
      group: 'general',
      description: 'Legal entity name in the footer copyright line',
    }),
    defineField({
      name: 'social',
      title: 'Social Links',
      type: 'object',
      group: 'social',
      fields: [
        { name: 'twitter', title: 'Twitter/X', type: 'url' },
        { name: 'linkedin', title: 'LinkedIn', type: 'url' },
        { name: 'github', title: 'GitHub', type: 'url' },
        { name: 'instagram', title: 'Instagram', type: 'url' },
        { name: 'reddit', title: 'Reddit', type: 'url' },
        { name: 'youtube', title: 'YouTube', type: 'url' },
      ],
    }),
    defineField({
      name: 'ctaButton',
      title: 'Global CTA Button',
      type: 'link',
      group: 'navigation',
      description: 'Primary CTA used in header/navigation',
    }),
    defineField({
      name: 'announcement',
      title: 'Announcement Banner',
      type: 'object',
      group: 'general',
      fields: [
        { name: 'enabled', title: 'Show Banner', type: 'boolean' },
        { name: 'text', title: 'Text', type: 'string' },
        { name: 'link', title: 'Link', type: 'link' },
      ],
    }),
    defineField({
      name: 'organization',
      title: 'Organization Data',
      type: 'organizationData',
      group: 'structuredData',
      description: 'Used for Schema.org Organization markup (AEO/SEO)',
    }),
    defineField({
      name: 'softwareApplication',
      title: 'Software Application Data',
      type: 'softwareApplicationData',
      group: 'structuredData',
      description: 'Used for Schema.org SoftwareApplication markup',
    }),
  ],
  preview: {
    select: { language: 'language' },
    prepare({ language }) {
      const lang = supportedLanguages.find((l) => l.id === language)
      return {
        title: `Site Settings`,
        subtitle: lang?.title || 'No language set',
      }
    },
  },
})
