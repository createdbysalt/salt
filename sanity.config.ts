import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { presentationTool, defineLocations, defineDocuments } from 'sanity/presentation'
import { visionTool } from '@sanity/vision'
import { codeInput } from '@sanity/code-input'
import { schemaTypes } from './src/sanity/schemaTypes'
import { structure } from './src/sanity/structure'

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'salt-studio',
  title: 'Salt Marketing',

  projectId,
  dataset,

  plugins: [
    structureTool({ structure }),

    presentationTool({
      previewUrl: {
        draftMode: {
          enable: '/api/sanity/draft/enable',
          disable: '/api/sanity/draft/disable',
        },
      },
      resolve: {
        locations: {
          landingPage: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: doc?.slug === 'home' ? '/' : `/${doc?.slug}`,
                },
              ],
            }),
          }),
          blogPost: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: doc?.slug
                ? [
                    { title: doc.title || 'Untitled', href: `/learn/${doc.slug}` },
                    { title: 'All Posts', href: '/learn' },
                  ]
                : [],
            }),
          }),
          legalPage: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{ title: doc.title || 'Untitled', href: `/${doc.slug}` }]
                : [],
            }),
          }),
          siteSettings: defineLocations({
            locations: [{ title: 'Home', href: '/' }],
          }),
        },
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: '_type == "landingPage" && slug.current == "home"',
          },
          {
            route: '/:slug',
            filter: '_type == "landingPage" && slug.current == $slug',
          },
          {
            route: '/learn/:slug',
            filter: '_type == "blogPost" && slug.current == $slug',
          },
        ]),
      },
    }),

    visionTool({ defaultApiVersion: '2024-01-01' }),
    codeInput(),
  ],

  schema: {
    types: schemaTypes,
  },

  scheduledPublishing: {
    enabled: true,
  },
})
