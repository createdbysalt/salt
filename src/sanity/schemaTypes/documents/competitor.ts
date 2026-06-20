import { defineField, defineType } from 'sanity'
import { UsersIcon } from '@sanity/icons'

export const competitor = defineType({
  name: 'competitor',
  title: 'Competitor',
  type: 'document',
  icon: UsersIcon as any,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
      description: 'Primary domain for logo sync (e.g. https://lindy.ai)',
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', title: 'Alt text', type: 'string' }],
    }),
    defineField({
      name: 'logoSource',
      title: 'Logo source',
      type: 'string',
      options: {
        list: [
          { title: 'Brandfetch', value: 'brandfetch' },
          { title: 'Manual upload', value: 'manual' },
          { title: 'Favicon', value: 'favicon' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'e.g. agent-builder, chat-coworker, crm',
    }),
    defineField({
      name: 'isSalt',
      title: 'Is Salt',
      type: 'boolean',
      description: 'True only for the Salt row in comparison tables',
      initialValue: false,
    }),
    defineField({
      name: 'attributionNote',
      title: 'Attribution note',
      type: 'string',
      description: 'Optional audit trail for logo licensing',
    }),
  ],
  preview: {
    select: { title: 'name', media: 'logo', isSalt: 'isSalt' },
    prepare({ title, media, isSalt }) {
      return {
        title: title || 'Unnamed competitor',
        subtitle: isSalt ? 'Salt (highlight column)' : undefined,
        media,
      }
    },
  },
})
