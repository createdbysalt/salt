import { defineType, defineField } from 'sanity'
import { CommentIcon } from '@sanity/icons'

export const feedback = defineType({
  name: 'feedback',
  title: 'Feedback',
  type: 'document',
  icon: CommentIcon as any,
  fields: [
    defineField({
      name: 'type',
      title: 'Type',
      type: 'string',
      options: {
        list: [
          { title: 'Feature Request', value: 'feature' },
          { title: 'Bug Report', value: 'bug' },
          { title: 'General Feedback', value: 'general' },
          { title: 'Testimonial', value: 'testimonial' },
          { title: 'Question', value: 'question' },
        ],
        layout: 'radio',
      },
      initialValue: 'general',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'New', value: 'new' },
          { title: 'Under Review', value: 'reviewing' },
          { title: 'Planned', value: 'planned' },
          { title: 'In Progress', value: 'inProgress' },
          { title: 'Completed', value: 'completed' },
          { title: 'Declined', value: 'declined' },
        ],
      },
      initialValue: 'new',
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Brief summary of the feedback',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'submittedBy',
      title: 'Submitted By',
      type: 'object',
      fields: [
        { name: 'name', title: 'Name', type: 'string' },
        { name: 'email', title: 'Email', type: 'string' },
        { name: 'company', title: 'Company', type: 'string' },
        { name: 'userId', title: 'User ID', type: 'string', description: 'If logged in' },
      ],
    }),
    defineField({
      name: 'submittedAt',
      title: 'Submitted At',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
    defineField({
      name: 'source',
      title: 'Source',
      type: 'string',
      options: {
        list: [
          { title: 'Website', value: 'website' },
          { title: 'App', value: 'app' },
          { title: 'Email', value: 'email' },
          { title: 'Social', value: 'social' },
          { title: 'Support', value: 'support' },
        ],
      },
      initialValue: 'website',
    }),
    defineField({
      name: 'votes',
      title: 'Votes',
      type: 'number',
      description: 'Number of upvotes from other users',
      initialValue: 0,
    }),
    defineField({
      name: 'isPublic',
      title: 'Show Publicly',
      type: 'boolean',
      description: 'Display on public roadmap/feedback board',
      initialValue: false,
    }),
    defineField({
      name: 'convertToTestimonial',
      title: 'Convert to Testimonial',
      type: 'reference',
      to: [{ type: 'testimonial' }],
      description: 'Link to testimonial if this feedback was converted',
    }),
    defineField({
      name: 'internalNotes',
      title: 'Internal Notes',
      type: 'text',
      rows: 3,
      description: 'Private notes (not shown to users)',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
  ],
  orderings: [
    {
      title: 'Newest First',
      name: 'submittedAtDesc',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
    {
      title: 'Most Voted',
      name: 'votesDesc',
      by: [{ field: 'votes', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      type: 'type',
      status: 'status',
      name: 'submittedBy.name',
    },
    prepare({ title, type, status, name }) {
      const typeIcons = {
        feature: '✨',
        bug: '🐛',
        general: '💬',
        testimonial: '⭐',
        question: '❓',
      }
      const icon = typeIcons[type as keyof typeof typeIcons] || '📝'
      return {
        title: `${icon} ${title}`,
        subtitle: `${status || 'new'} • ${name || 'Anonymous'}`,
      }
    },
  },
})
