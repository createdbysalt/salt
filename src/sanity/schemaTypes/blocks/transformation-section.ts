import { defineType, defineField, defineArrayMember } from 'sanity'
import { TransferIcon } from '@sanity/icons'

export const transformationSection = defineType({
  name: 'transformationSection',
  title: 'Transformation Section',
  type: 'object',
  icon: TransferIcon as any,
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
    }),
    defineField({
      name: 'subheadline',
      title: 'Subheadline',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'items',
      title: 'Before/After Items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            { name: 'before', title: 'Before', type: 'string' },
            { name: 'after', title: 'After', type: 'string' },
          ],
          preview: {
            select: { before: 'before', after: 'after' },
            prepare({ before, after }) {
              return { title: `${before} → ${after}` }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'headline' },
    prepare({ title }) {
      return {
        title: title || 'Transformation Section',
        subtitle: 'Transformation',
        media: TransferIcon as any,
      }
    },
  },
})
