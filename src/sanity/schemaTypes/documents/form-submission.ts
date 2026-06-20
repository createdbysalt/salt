import { defineType, defineField } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons'

export const formSubmission = defineType({
  name: 'formSubmission',
  title: 'Form submission',
  type: 'document',
  icon: DocumentTextIcon as any,
  fields: [
    defineField({
      name: 'form',
      title: 'Form',
      type: 'reference',
      to: [{ type: 'formDefinition' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted at',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'Analytics / waitlist source at submit time.',
    }),
    defineField({
      name: 'payload',
      title: 'Field payload',
      type: 'text',
      rows: 8,
      description: 'JSON snapshot of calculator answers or other field values.',
    }),
    defineField({
      name: 'resultSummary',
      title: 'Result summary',
      type: 'object',
      description: 'Calculator output snapshot (totals, leaks) for editorial review.',
      fields: [
        defineField({
          name: 'totalMid',
          title: 'Total (mid)',
          type: 'number',
        }),
        defineField({
          name: 'rangeLow',
          title: 'Range low',
          type: 'number',
        }),
        defineField({
          name: 'rangeHigh',
          title: 'Range high',
          type: 'number',
        }),
        defineField({
          name: 'segment',
          title: 'Segment',
          type: 'string',
        }),
      ],
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'submittedAtDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      email: 'email',
      submittedAt: 'submittedAt',
      formTitle: 'form.title',
      formKey: 'form.key',
    },
    prepare({ email, submittedAt, formTitle, formKey }) {
      const date = submittedAt
        ? new Date(submittedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown date'
      return {
        title: email || 'Anonymous',
        subtitle: `${formTitle || formKey || 'Form'} · ${date}`,
      }
    },
  },
})
