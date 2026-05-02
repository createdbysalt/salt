import { defineType, defineField, defineArrayMember } from 'sanity'
import { UsersIcon } from '@sanity/icons'

export const testimonialsSection = defineType({
  name: 'testimonialsSection',
  title: 'Testimonials Section',
  type: 'object',
  icon: UsersIcon as any,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
    }),
    defineField({
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'testimonial' }],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'heading', testimonials: 'testimonials' },
    prepare({ title, testimonials }) {
      return {
        title: title || 'Testimonials Section',
        subtitle: `Testimonials (${testimonials?.length || 0})`,
        media: UsersIcon as any,
      }
    },
  },
})
