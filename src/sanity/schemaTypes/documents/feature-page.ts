import { defineType, defineField } from 'sanity'
import { BoltIcon } from '@sanity/icons'
import { supportedLanguages, defaultLanguage } from '../../lib/i18n'

const VISUAL_KEY_OPTIONS = [
  { title: 'Integrations (app grid)', value: 'integrations' },
  { title: 'Sources & Memory (activity list)', value: 'capture-memory' },
  { title: 'Morning Brief (schedule + heads up)', value: 'morning-brief' },
  { title: 'Plays (draft + approve)', value: 'plays' },
  { title: 'Intelligence (client health)', value: 'intelligence' },
  { title: 'Playbooks (playbook card)', value: 'playbooks' },
] as const

export const featurePage = defineType({
  name: 'featurePage',
  title: 'Feature Card',
  type: 'document',
  icon: BoltIcon as any,
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
      description: 'Stable identifier (e.g. integrations, plays). Not a public URL.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'landingPageKey',
      title: 'Landing page',
      type: 'string',
      group: 'meta',
      description:
        'Slug of the landing page these cards belong to (e.g. icp-template, for-coaches). Leave empty for the main homepage cards.',
    }),
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      group: 'content',
      description: 'Short category label shown under the headline (e.g. Integrations)',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'visualKey',
      title: 'Visual',
      type: 'string',
      group: 'content',
      options: {
        list: [...VISUAL_KEY_OPTIONS],
        layout: 'radio',
      },
      description:
        'Code visual selector — rendered by capability-visuals.tsx from this key.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      group: 'meta',
      description: 'Order on the homepage Features section (lower = earlier)',
      initialValue: 0,
    }),
    defineField({
      name: 'showOnLanding',
      title: 'Show on homepage',
      type: 'boolean',
      group: 'meta',
      initialValue: true,
    }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrderAsc',
      by: [
        { field: 'sortOrder', direction: 'asc' },
        { field: 'title', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      label: 'label',
      visualKey: 'visualKey',
      language: 'language',
    },
    prepare({ title, label, visualKey, language }) {
      const langLabel = language ? `[${language.toUpperCase()}]` : ''
      const visualLabel =
        VISUAL_KEY_OPTIONS.find((option) => option.value === visualKey)?.title ??
        visualKey
      return {
        title: `${langLabel} ${label || title}`.trim(),
        subtitle: visualLabel,
      }
    },
  },
})
