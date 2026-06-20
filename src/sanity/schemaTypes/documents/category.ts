import { defineType, defineField } from 'sanity'
import { TagIcon } from '@sanity/icons'

export const category = defineType({
  name: 'category',
  title: 'Blog Category',
  type: 'document',
  icon: TagIcon as any,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
      description: 'Full category name shown on the category landing page',
    }),
    defineField({
      name: 'titleShort',
      title: 'Short title',
      type: 'string',
      group: 'content',
      description: 'Shorter label for nav pills and cards (e.g. Features)',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
      description: 'URL segment: /blog/category/{slug} — use features, tutorials, business',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      group: 'content',
      rows: 3,
      description: 'Shown beside the category title on the landing page',
    }),
    defineField({
      name: 'legacyArticleSlug',
      title: 'Legacy article filter slug',
      type: 'string',
      group: 'content',
      description:
        'Maps to article categories in legacy content until all posts are in Sanity (feature, tutorial, business)',
      options: {
        list: [
          { title: 'Features (feature)', value: 'feature' },
          { title: 'Tutorials (tutorial)', value: 'tutorial' },
          { title: 'Business (business)', value: 'business' },
        ],
      },
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort order',
      type: 'number',
      group: 'content',
      initialValue: 0,
      description: 'Nav pill order on /blog (lower = earlier)',
    }),
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
      group: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Sort order',
      name: 'sortOrderAsc',
      by: [{ field: 'sortOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? `/blog/category/${subtitle}` : undefined,
      }
    },
  },
})
