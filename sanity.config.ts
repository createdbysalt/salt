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
            select: {
              title: 'title',
              slug: 'slug.current',
              pageVariant: 'pageVariant',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href:
                    doc?.slug === 'home'
                      ? '/'
                      : doc?.pageVariant === 'segment-landing'
                        ? `/for/${doc?.slug}`
                        : doc?.pageVariant === 'blog-hub'
                          ? '/blog'
                          : doc?.pageVariant === 'compare-hub'
                            ? '/compare'
                            : `/${doc?.slug}`,
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
              const href = isCompare ? `/compare/${doc.slug}` : `/blog/${doc.slug}`
              return {
                locations: [
                  { title: doc.title || 'Untitled', href },
                  ...(isCompare
                    ? [{ title: 'Compare hub', href: '/compare' }]
                    : [{ title: 'Blog', href: '/blog' }]),
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
            route: '/for/:segment',
            filter:
              '_type == "landingPage" && slug.current == $segment && pageVariant == "segment-landing"',
          },
          {
            route: '/learn/:slug',
            filter:
              '_type == "blogPost" && slug.current == $slug && (articleKind == "article" || !defined(articleKind))',
          },
          {
            route: '/blog',
            filter: '_type == "landingPage" && slug.current == "blog"',
          },
          {
            route: '/compare',
            filter: '_type == "landingPage" && slug.current == "compare"',
          },
          {
            route: '/compare/:slug',
            filter:
              '_type == "blogPost" && slug.current == $slug && articleKind in ["comparison", "guide"]',
          },
          {
            route: '/money-on-the-table',
            filter: '_type == "formDefinition" && key == "money-on-the-table"',
          },
          {
            route: '/waitlist',
            filter: '_type == "formDefinition" && key == "waitlist"',
          },
          {
            route: '/privacy-policy',
            filter: '_type == "legalPage" && slug.current == "privacy-policy"',
          },
          {
            route: '/terms-of-service',
            filter: '_type == "legalPage" && slug.current == "terms-of-service"',
          },
          {
            route: '/cookie-policy',
            filter: '_type == "legalPage" && slug.current == "cookie-policy"',
          },
          {
            route: '/early-access',
            filter: '_type == "legalPage" && slug.current == "early-access"',
          },
          {
            route: '/tos',
            filter: '_type == "legalPage" && slug.current == "tos"',
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
