import { defineType, defineField, defineArrayMember } from 'sanity'
import { ThListIcon } from '@sanity/icons'

export const comparisonSection = defineType({
  name: 'comparisonSection',
  title: 'Comparison Section',
  type: 'object',
  icon: ThListIcon as any,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Small text above headline (e.g., "Compare")',
    }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      title: 'Subtitle',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'comparisonType',
      title: 'Comparison Type',
      type: 'string',
      options: {
        list: [
          { title: 'Plans', value: 'plans' },
          { title: 'Competitors', value: 'competitors' },
          { title: 'Before/After', value: 'beforeAfter' },
        ],
        layout: 'radio',
      },
      initialValue: 'competitors',
    }),
    defineField({
      name: 'columns',
      title: 'Columns',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'column',
          fields: [
            { name: 'name', title: 'Name', type: 'string' },
            { name: 'highlight', title: 'Highlight (recommended)', type: 'boolean' },
            { name: 'logo', title: 'Logo', type: 'image' },
          ],
          preview: {
            select: { title: 'name', highlight: 'highlight' },
            prepare({ title, highlight }) {
              return {
                title: title || 'Unnamed',
                subtitle: highlight ? '★ Highlighted' : '',
              }
            },
          },
        }),
      ],
      validation: (rule) => rule.min(2).max(5),
    }),
    defineField({
      name: 'features',
      title: 'Features to Compare',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'featureRow',
          fields: [
            { name: 'feature', title: 'Feature Name', type: 'string' },
            { name: 'category', title: 'Category', type: 'string', description: 'Group features by category' },
            {
              name: 'values',
              title: 'Values per Column',
              type: 'array',
              of: [
                defineArrayMember({
                  type: 'object',
                  name: 'cellValue',
                  fields: [
                    {
                      name: 'type',
                      title: 'Type',
                      type: 'string',
                      options: {
                        list: [
                          { title: '✓ Yes', value: 'yes' },
                          { title: '✗ No', value: 'no' },
                          { title: '~ Partial', value: 'partial' },
                          { title: 'Text', value: 'text' },
                        ],
                      },
                      initialValue: 'yes',
                    },
                    { name: 'text', title: 'Text (if type is Text)', type: 'string' },
                    { name: 'tooltip', title: 'Tooltip', type: 'string' },
                  ],
                  preview: {
                    select: { type: 'type', text: 'text' },
                    prepare({ type, text }) {
                      const icons = { yes: '✓', no: '✗', partial: '~', text: '📝' }
                      return { title: text || icons[type as keyof typeof icons] || type }
                    },
                  },
                }),
              ],
            },
          ],
          preview: {
            select: { title: 'feature', category: 'category' },
            prepare({ title, category }) {
              return {
                title: title || 'Unnamed feature',
                subtitle: category || '',
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'footnote',
      title: 'Footnote',
      type: 'text',
      rows: 2,
      description: 'Optional disclaimer or note below the table',
    }),
  ],
  preview: {
    select: { headline: 'headline', type: 'comparisonType' },
    prepare({ headline, type }) {
      return {
        title: headline || 'Comparison Section',
        subtitle: `Comparison: ${type || 'competitors'}`,
      }
    },
  },
})
