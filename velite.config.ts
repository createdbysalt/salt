import { defineConfig, defineCollection, s } from 'velite'

const posts = defineCollection({
  name: 'Post',
  pattern: 'posts/**/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.slug('posts'),
      description: s.string().max(300),
      date: s.isodate(),
      published: s.boolean().default(false),
      author: s.string().default('Salt Core'),
      category: s.enum([
        'strategy',
        'operations',
        'pricing',
        'client-management',
        'tutorials',
        'announcements',
      ]),
      tags: s.array(s.string()).default([]),
      image: s.image().optional(),
      metadata: s.metadata(),
      excerpt: s.excerpt(),
      content: s.mdx(),
    })
    .transform(data => ({
      ...data,
      permalink: `/blog/${data.slug}`,
      readingTime: data.metadata.readingTime,
    })),
})

const changelog = defineCollection({
  name: 'ChangelogEntry',
  pattern: 'changelog/**/*.mdx',
  schema: s
    .object({
      title: s.string().max(120),
      slug: s.slug('changelog'),
      date: s.isodate(),
      version: s.string().optional(),
      published: s.boolean().default(false),
      type: s.enum(['feature', 'improvement', 'fix', 'security', 'deprecation']),
      content: s.mdx(),
    })
    .transform(data => ({
      ...data,
      permalink: `/changelog#${data.slug}`,
    })),
})

export default defineConfig({
  root: 'content',
  output: {
    data: '.velite',
    assets: 'public/static/content',
    base: '/static/content/',
    name: '[name]-[hash:6].[ext]',
    clean: true,
  },
  collections: { posts, changelog },
})
