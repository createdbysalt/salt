'use client'

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
  basePath: '/edit',

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
            select: {
              title: 'title',
              slug: 'slug.current',
              articleKind: 'articleKind',
            },
            resolve: (doc) => {
              if (!doc?.slug) {
                return { locations: [] }
              }
              const isCompare =
                doc.articleKind === 'comparison' || doc.articleKind === 'guide'
              const href = isCompare ? `/compare/${doc.slug}` : `/learn/${doc.slug}`
              return {
                locations: [
                  { title: doc.title || 'Untitled', href },
                  ...(isCompare
                    ? [{ title: 'Compare hub', href: '/compare' }]
                    : [{ title: 'All Posts', href: '/learn' }]),
                ],
              }
            },
          }),
          legalPage: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{ title: doc.title || 'Untitled', href: `/${doc.slug}` }]
                : [],
            }),
          }),
          featurePage: defineLocations({
            select: { title: 'label', key: 'key' },
            resolve: (doc) => ({
              locations: doc?.key
                ? [{ title: doc.title || doc.key, href: '/#product' }]
                : [],
            }),
          }),
          marketingCta: defineLocations({
            select: { title: 'heading', key: 'key' },
            resolve: (doc) => ({
              locations: doc?.key
                ? [{ title: doc.title || doc.key, href: '/#waitlist' }]
                : [],
            }),
          }),
          formDefinition: defineLocations({
            select: { title: 'title', route: 'route' },
            resolve: (doc) => ({
              locations: doc?.route
                ? [{ title: doc.title || 'Form', href: doc.route }]
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
            filter:
              '_type == "blogPost" && slug.current == $slug && (articleKind == "article" || !defined(articleKind))',
          },
          {
            route: '/compare/:slug',
            filter:
              '_type == "blogPost" && slug.current == $slug && articleKind in ["comparison", "guide"]',
          },
          {
            route: '/compare',
            filter: '_type == "blogPost" && compareHub.showOnHub == true',
          },
          {
            route: '/money-on-the-table',
            filter: '_type == "formDefinition" && key == "money-on-the-table"',
          },
          {
            route: '/waitlist',
            filter: '_type == "formDefinition" && key == "waitlist"',
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
