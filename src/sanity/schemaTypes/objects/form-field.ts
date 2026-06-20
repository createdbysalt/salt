import { defineType, defineField, defineArrayMember } from 'sanity'

const FIELD_TYPE_OPTIONS = [
  { title: 'Email', value: 'email' },
  { title: 'Text', value: 'text' },
  { title: 'Number', value: 'number' },
  { title: 'Select', value: 'select' },
  { title: 'Radio', value: 'radio' },
  { title: 'Multi-select', value: 'multi-select' },
  { title: 'Boolean', value: 'boolean' },
] as const

const OPTION_FIELD_TYPES = new Set(['select', 'radio', 'multi-select'])

export const formField = defineType({
  name: 'formField',
  title: 'Form field',
  type: 'object',
  fields: [
    defineField({
      name: 'key',
      title: 'Key',
      type: 'string',
      description: 'Stable identifier used in code and analytics (e.g. segment, revenue).',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'fieldType',
      title: 'Field type',
      type: 'string',
      options: {
        list: [...FIELD_TYPE_OPTIONS],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'required',
      title: 'Required',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'helpText',
      title: 'Help text',
      type: 'string',
    }),
    defineField({
      name: 'placeholder',
      title: 'Placeholder',
      type: 'string',
      description: 'Input placeholder (email fields on inline forms).',
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      description: 'Optional step label above the question (waitlist qualification).',
    }),
    defineField({
      name: 'questionNumber',
      title: 'Question number',
      type: 'string',
      description: 'Optional display label (e.g. 01, 02).',
    }),
    defineField({
      name: 'options',
      title: 'Options',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'value' },
          },
        }),
      ],
      hidden: ({ parent }) =>
        !OPTION_FIELD_TYPES.has(parent?.fieldType ?? ''),
    }),
    defineField({
      name: 'conditionalOn',
      title: 'Conditional on field',
      type: 'string',
      description: 'Show only when another field key is truthy (e.g. honeybook).',
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      label: 'label',
      key: 'key',
      fieldType: 'fieldType',
      questionNumber: 'questionNumber',
    },
    prepare({ label, key, fieldType, questionNumber }) {
      const prefix = questionNumber ? `${questionNumber} · ` : ''
      return {
        title: `${prefix}${label}`,
        subtitle: `${key} (${fieldType})`,
      }
    },
  },
})
