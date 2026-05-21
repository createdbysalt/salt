---
name: sanity-schema
description: Scaffold new Sanity schemas with client-friendliness, SEO, AEO, page builder patterns, and performance built in. Use when creating document types, objects, sections, or singletons.
---

This skill guides creation of Sanity schemas that are client-friendly, SEO-optimized, and performant. Includes the **Constrained Page Builder** pattern for drag-and-drop sections.

## When to Use

- Creating a new document type (page, blog post, project, etc.)
- Creating a new section type (for page builders)
- Creating a new object type (hero section, CTA block, etc.)
- Creating a new singleton (home, about, settings, etc.)
- Adding fields to existing schemas

## Decision Framework

### Step 1: What kind of schema?

| If...                           | Create a...   | Location                           |
| ------------------------------- | ------------- | ---------------------------------- |
| Many instances, own URL         | Document      | `sanity/schemas/documents/`        |
| Many instances, no URL          | Object        | `sanity/schemas/objects/`          |
| One instance globally           | Singleton     | `sanity/schemas/singletons/`       |
| Reusable categorization         | Taxonomy      | `sanity/schemas/taxonomy/`         |
| Draggable page section          | Section       | `sanity/schemas/sections/`         |
| Preset-specific (studio/church) | Preset Schema | `sanity/schemas/presets/<preset>/` |

### Step 2: Should it be a reference or embedded?

Ask: "Will this content be reused across multiple documents?"

- **YES** → Document + Reference (e.g., `client`, `testimonial`)
- **NO** → Embedded object/array item (e.g., team member in about page)

### Step 3: Should clients control order/visibility?

Ask: "Do clients need to reorder or toggle this content?"

- **YES** → Use the **Constrained Page Builder** pattern (sections array)
- **NO** → Use fixed fields

---

## Constrained Page Builder Pattern

The core pattern for client-editable pages. Clients control **content and order**, Salt controls **design quality**.

### Philosophy

```
┌─────────────────────────────────────┐
│  Hero Section                       │  ← FIXED: Always first, can't remove
│  (content editable, position fixed) │
├─────────────────────────────────────┤
│                                     │
│   DRAGGABLE SECTIONS                │  ← Client reorders via drag-and-drop
│   Each has: enabled toggle + content│
│                                     │
│   ☑ Featured Work                   │
│   ☑ Testimonials                    │
│   ☐ Client Logos (hidden)           │
│   ☑ Stats                           │
│                                     │
├─────────────────────────────────────┤
│  CTA Section                        │  ← FIXED: Always last, can't remove
│  (content editable, position fixed) │
└─────────────────────────────────────┘
```

**Clients CAN:**

- Edit text/images in any section
- Reorder sections via drag-and-drop
- Toggle sections visible/hidden
- Choose which projects/testimonials to feature

**Clients CANNOT:**

- Add arbitrary section types (only from curated pool)
- Duplicate a section type
- Remove Hero or CTA
- Access spacing/styling controls

### Section Schema Pattern

Every section follows this template:

```ts
// sanity/schemas/sections/featuredWorkSection.ts

import {GridIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'featuredWorkSection',
  title: 'Featured Work',
  type: 'object', // Sections are OBJECTS, not documents
  icon: GridIcon,
  fields: [
    // ═══════════════════════════════════════════
    // ENABLED TOGGLE — Required for all sections
    // ═══════════════════════════════════════════
    defineField({
      name: 'enabled',
      title: 'Show this section',
      type: 'boolean',
      initialValue: true,
      description: 'Turn off to hide without deleting.',
    }),

    // ═══════════════════════════════════════════
    // SECTION HEADLINE — Most sections need one
    // ═══════════════════════════════════════════
    defineField({
      name: 'headline',
      title: 'Section Headline',
      type: 'string',
      initialValue: 'Featured Work',
      hidden: ({parent}) => !parent?.enabled,
    }),

    // ═══════════════════════════════════════════
    // SECTION-SPECIFIC CONTENT
    // ═══════════════════════════════════════════
    defineField({
      name: 'projects',
      title: 'Featured Projects',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'project'}]}],
      description: 'Drag to reorder. Recommended: 3-4 projects.',
      validation: (rule) => rule.max(6).warning('More than 6 may overwhelm visitors'),
      hidden: ({parent}) => !parent?.enabled,
    }),

    defineField({
      name: 'ctaText',
      title: 'Button Text',
      type: 'string',
      initialValue: 'View All Work',
      hidden: ({parent}) => !parent?.enabled,
    }),

    defineField({
      name: 'ctaLink',
      title: 'Button Link',
      type: 'string',
      initialValue: '/gallery',
      hidden: ({parent}) => !parent?.enabled,
    }),
  ],

  // Preview shows enabled/hidden status
  preview: {
    select: {
      enabled: 'enabled',
      headline: 'headline',
    },
    prepare({enabled, headline}) {
      return {
        title: headline || 'Featured Work',
        subtitle: enabled ? 'Visible' : 'Hidden',
        media: GridIcon,
      }
    },
  },
})
```

### Section with Embedded Items (Not References)

Use this for content that won't be reused elsewhere:

```ts
// sanity/schemas/sections/testimonialsSection.ts

import {CommentIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'testimonialsSection',
  title: 'Testimonials',
  type: 'object',
  icon: CommentIcon,
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show this section',
      type: 'boolean',
      initialValue: true,
    }),

    defineField({
      name: 'headline',
      title: 'Section Headline',
      type: 'string',
      initialValue: 'What Our Clients Say',
      hidden: ({parent}) => !parent?.enabled,
    }),

    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      options: {
        list: [
          {title: 'Carousel', value: 'carousel'},
          {title: 'Grid', value: 'grid'},
          {title: 'Single Featured', value: 'single'},
        ],
        layout: 'radio',
      },
      initialValue: 'carousel',
      hidden: ({parent}) => !parent?.enabled,
    }),

    // EMBEDDED testimonials (not references)
    defineField({
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      hidden: ({parent}) => !parent?.enabled,
      of: [
        {
          type: 'object',
          name: 'testimonialItem',
          fields: [
            defineField({name: 'quote', title: 'Quote', type: 'text', rows: 4}),
            defineField({name: 'author', title: 'Name', type: 'string'}),
            defineField({name: 'role', title: 'Role', type: 'string'}),
            defineField({name: 'company', title: 'Company', type: 'string'}),
            defineField({name: 'image', title: 'Photo', type: 'image', options: {hotspot: true}}),
          ],
          preview: {
            select: {title: 'author', subtitle: 'company', media: 'image'},
          },
        },
      ],
      validation: (rule) => rule.min(1).max(6),
    }),
  ],

  preview: {
    select: {enabled: 'enabled', headline: 'headline'},
    prepare({enabled, headline}) {
      return {
        title: headline || 'Testimonials',
        subtitle: enabled ? 'Visible' : 'Hidden',
        media: CommentIcon,
      }
    },
  },
})
```

### Singleton with Page Builder

```ts
// sanity/schemas/singletons/home.ts

import {HomeIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'home',
  title: 'Home',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'hero', title: 'Hero', default: true},
    {name: 'sections', title: 'Page Sections'},
    {name: 'cta', title: 'Call to Action'},
    {name: 'seo', title: 'SEO'},
  ],
  fields: [
    // ════════════════════════════════════════════════════
    // HERO — Fixed first position (not in sections array)
    // ════════════════════════════════════════════════════
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      group: 'hero',
      description: 'The big text visitors see first.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'heroTagline',
      title: 'Hero Tagline',
      type: 'text',
      rows: 2,
      group: 'hero',
    }),

    defineField({
      name: 'heroMedia',
      title: 'Hero Background',
      type: 'object',
      group: 'hero',
      fields: [
        defineField({
          name: 'type',
          title: 'Media Type',
          type: 'string',
          options: {
            list: [
              {title: 'Image', value: 'image'},
              {title: 'Video (YouTube/Vimeo)', value: 'video'},
            ],
            layout: 'radio',
          },
          initialValue: 'image',
        }),
        defineField({
          name: 'image',
          title: 'Image',
          type: 'image',
          options: {hotspot: true},
          hidden: ({parent}) => parent?.type !== 'image',
          fields: [defineField({name: 'alt', title: 'Alt Text', type: 'string'})],
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL',
          type: 'url',
          description: 'YouTube or Vimeo link. Do NOT upload video files.',
          hidden: ({parent}) => parent?.type !== 'video',
        }),
        defineField({
          name: 'videoPoster',
          title: 'Video Poster',
          type: 'image',
          description: 'Shown before video loads.',
          hidden: ({parent}) => parent?.type !== 'video',
        }),
      ],
    }),

    // ════════════════════════════════════════════════════
    // SECTIONS — Draggable, toggleable (client-controlled)
    // ════════════════════════════════════════════════════
    defineField({
      name: 'sections',
      title: 'Page Sections',
      type: 'array',
      group: 'sections',
      description: 'Drag to reorder. Toggle visibility in each section.',
      of: [
        // CURATED POOL — only these section types allowed
        {type: 'featuredWorkSection'},
        {type: 'testimonialsSection'},
        {type: 'clientLogosSection'},
        {type: 'statsSectionToggleable'},
      ],
      // Prevent duplicates of same type
      validation: (rule) =>
        rule.custom((sections) => {
          if (!sections) return true
          const types = sections.map((s: {_type: string}) => s._type)
          const unique = new Set(types)
          if (types.length !== unique.size) {
            return 'Each section type can only appear once'
          }
          return true
        }),
    }),

    // ════════════════════════════════════════════════════
    // CTA — Fixed last position (not in sections array)
    // ════════════════════════════════════════════════════
    defineField({
      name: 'ctaHeadline',
      title: 'CTA Headline',
      type: 'string',
      group: 'cta',
      initialValue: 'Ready to start your project?',
    }),

    defineField({
      name: 'ctaDescription',
      title: 'CTA Description',
      type: 'text',
      rows: 2,
      group: 'cta',
    }),

    defineField({
      name: 'ctaButtonText',
      title: 'Button Text',
      type: 'string',
      group: 'cta',
      initialValue: 'Get in Touch',
    }),

    defineField({
      name: 'ctaButtonLink',
      title: 'Button Link',
      type: 'string',
      group: 'cta',
      initialValue: '/contact',
    }),

    // ════════════════════════════════════════════════════
    // SEO
    // ════════════════════════════════════════════════════
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      group: 'seo',
      validation: (rule) => rule.max(60).warning('Keep under 60 characters'),
    }),

    defineField({
      name: 'seoDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 2,
      group: 'seo',
      validation: (rule) => rule.max(155).warning('Keep under 155 characters'),
    }),

    defineField({
      name: 'ogImage',
      title: 'Social Share Image',
      type: 'image',
      group: 'seo',
      description: 'Recommended: 1200×630px',
    }),
  ],
})
```

### Section Pools by Page Type

Different pages get different section options:

| Singleton        | Available Sections                                                              |
| ---------------- | ------------------------------------------------------------------------------- |
| **home**         | featuredWorkSection, testimonialsSection, clientLogosSection, statsSection      |
| **about**        | storySection, teamSection, valuesSection, timelineSection, testimonialsSection  |
| **capabilities** | servicesGridSection, processSection, differentiatorSection, featuredWorkSection |
| **gallery**      | N/A (uses separate fields for grid config, not page builder)                    |

### GROQ Query Pattern for Sections

```ts
export const homePageQuery = defineQuery(`
  *[_type == "home"][0]{
    _id,
    _type,
    // Hero fields
    heroHeadline,
    heroTagline,
    heroMedia,
    // Sections with conditional projections
    sections[]{
      _key,
      _type,
      enabled,
      headline,
      // Each section type projects its own fields
      _type == "featuredWorkSection" => {
        ctaText,
        ctaLink,
        projects[]->{
          _id,
          _type,
          title,
          tagline,
          coverImage,
          "slug": slug.current,
        }
      },
      _type == "testimonialsSection" => {
        layout,
        testimonials[] {
          _key,
          quote,
          author,
          role,
          company,
          image
        }
      },
      _type == "clientLogosSection" => {
        clients[]->{
          _id,
          title,
          logo,
          logoDark
        }
      },
      _type == "statsSectionToggleable" => {
        stats
      }
    },
    // CTA fields
    ctaHeadline,
    ctaDescription,
    ctaButtonText,
    ctaButtonLink,
    // SEO
    seoTitle,
    seoDescription,
    ogImage,
  }
`)
```

### Frontend SectionRenderer Pattern

```tsx
// components/SectionRenderer.tsx

import {ClientLogosSection} from './sections/ClientLogosSection'
import {FeaturedWorkSection} from './sections/FeaturedWorkSection'
import {StatsSection} from './sections/StatsSection'
import {TestimonialsSection} from './sections/TestimonialsSection'

// Map section types to components
const sectionComponents: Record<string, React.ComponentType<{section: any}>> = {
  featuredWorkSection: FeaturedWorkSection,
  testimonialsSection: TestimonialsSection,
  clientLogosSection: ClientLogosSection,
  statsSectionToggleable: StatsSection,
}

interface Props {
  sections: Array<{_key: string; _type: string; enabled?: boolean}>
}

export function SectionRenderer({sections}: Props) {
  if (!sections?.length) return null

  return (
    <>
      {sections.map((section) => {
        // Skip disabled sections
        if (!section.enabled) return null

        const Component = sectionComponents[section._type]
        if (!Component) {
          console.warn(`Unknown section type: ${section._type}`)
          return null
        }

        return <Component key={section._key} section={section} />
      })}
    </>
  )
}
```

### Page Component Using SectionRenderer

```tsx
// app/(personal)/page.tsx

import {SectionRenderer} from '@/components/SectionRenderer'
import {sanityFetch} from '@/sanity/lib/live'
import {homePageQuery} from '@/sanity/lib/queries'

export default async function HomePage() {
  const {data} = await sanityFetch({query: homePageQuery})
  if (!data?._id) return notFound()

  return (
    <div className="space-y-0">
      {/* Fixed Hero — always first */}
      <HeroSection data={data} />

      {/* Draggable sections — rendered in client's order */}
      <SectionRenderer sections={data.sections} />

      {/* Fixed CTA — always last */}
      {data.ctaHeadline && <CTASection data={data} />}
    </div>
  )
}
```

---

## Standard Schema Patterns

### Client-Friendly Document Template

```ts
import {DocumentIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'schemaName',
  title: 'Schema Title',
  type: 'document',
  icon: DocumentIcon,
  description: 'Help text shown in the Studio desk.',

  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'media', title: 'Media'},
    {name: 'seo', title: 'SEO'},
    {name: 'settings', title: 'Settings'},
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      description: 'The main headline. Keep under 60 characters for SEO.',
      validation: (rule) =>
        rule.required().error('Title is required — it appears as the page headline'),
    }),

    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      group: 'seo',
      description: 'The URL path. Click Generate to create from title.',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required().error('Slug is required for the page URL'),
    }),

    // ... more fields
  ],

  preview: {
    select: {title: 'title', media: 'coverImage'},
    prepare({title, media}) {
      return {title: title || 'Untitled', media}
    },
  },
})
```

### Image with Alt Text

```ts
defineField({
  name: 'coverImage',
  title: 'Cover Image',
  type: 'image',
  group: 'media',
  description: 'Recommended: 1200×630px for social sharing.',
  options: {hotspot: true},
  fields: [
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
      description: 'Describe the image for accessibility.',
      validation: (rule) => rule.warning('Alt text improves accessibility and SEO'),
    }),
  ],
})
```

### FAQ Array (AEO)

```ts
defineField({
  name: 'faq',
  title: 'FAQ',
  type: 'array',
  group: 'seo',
  description: 'Great for SEO and AI search results.',
  of: [
    {
      type: 'object',
      name: 'faqItem',
      fields: [
        defineField({
          name: 'question',
          type: 'string',
          title: 'Question',
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'answer',
          type: 'text',
          title: 'Answer',
          rows: 3,
          validation: (rule) => rule.required(),
        }),
      ],
      preview: {select: {title: 'question'}},
    },
  ],
})
```

### Sort Order Field (Manual Ordering)

```ts
defineField({
  name: 'sortOrder',
  title: 'Sort Order',
  type: 'number',
  group: 'settings',
  description: 'Lower numbers appear first. Leave blank for default order.',
})
```

### Featured Toggle with Conditional Fields

```ts
;(defineField({
  name: 'isFeatured',
  title: 'Featured?',
  type: 'boolean',
  initialValue: false,
  description: 'Show prominently on the homepage.',
}),
  defineField({
    name: 'featuredSize',
    title: 'Featured Size',
    type: 'string',
    options: {
      list: [
        {title: 'Regular', value: 'regular'},
        {title: 'Large (2 columns)', value: 'large'},
        {title: 'Full Width', value: 'full'},
      ],
    },
    initialValue: 'regular',
    hidden: ({parent}) => !parent?.isFeatured, // Only show when featured
  }))
```

### Video URL Field with Guidance

```ts
defineField({
  name: 'heroVideoUrl',
  title: 'Hero Video',
  type: 'url',
  description:
    'YouTube or Vimeo link. Do NOT upload video files directly — they hurt site performance.',
  validation: (rule) =>
    rule
      .uri({
        scheme: ['http', 'https'],
      })
      .custom((url) => {
        if (!url) return true
        if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
          return true
        }
        return 'Please use a YouTube or Vimeo link'
      }),
})
```

---

## Registration Checklist

### For a New Section Schema

1. Create file in `sanity/schemas/sections/`
2. Export from `sanity/schemas/sections/index.ts`
3. Import in `sanity.config.ts` and add to `schema.types`
4. Add to the `sections` array `of: [...]` in target singleton(s)
5. Add conditional projection in GROQ query (`_type == "sectionName" => {...}`)
6. Create component in `components/sections/`
7. Register in `SectionRenderer` component map
8. Run `npm run typegen`

### For a New Singleton with Page Builder

1. Create file in `sanity/schemas/singletons/` (or `presets/<preset>/singletons/`)
2. Import in `sanity.config.ts`:
   - Add to `schema.types`
   - Add to `singletonPlugin([...])`
   - Add to `createDeskStructure` in settings.tsx
3. Create GROQ query in `sanity/lib/queries.ts`
4. Add to `resolveHref` in `sanity/lib/utils.ts`
5. Add to `locations` in `sanity/plugins/resolve.ts`
6. Create page in `app/(personal)/`
7. Run `npm run typegen`

### For a Standard Document

1. Create file in `sanity/schemas/documents/`
2. Import in `sanity.config.ts` and add to `schema.types`
3. Create GROQ query in `sanity/lib/queries.ts`
4. Add to `resolveHref` if it has a URL
5. Add to `mainDocuments` and `locations` in resolve.ts
6. Create page in `app/(personal)/`
7. Run `npm run typegen`

---

## SEO Checklist

- [ ] `slug` field with `source: 'title'`
- [ ] `seoTitle` with max 60 char warning
- [ ] `seoDescription` with max 155 char warning
- [ ] `ogImage` for social sharing (1200×630)
- [ ] Fields grouped with `group: 'seo'`

## AEO Checklist

- [ ] `faq` array with question/answer pairs
- [ ] Descriptions are complete sentences
- [ ] Related content references (entity links)
- [ ] Clear, specific titles

## Client-Friendliness Checklist

- [ ] Every field has a `description`
- [ ] Validation uses `.error()` or `.warning()` with helpful messages
- [ ] Complex documents use `groups` for tabs
- [ ] Advanced options are `collapsible: true, collapsed: true`
- [ ] Images request alt text
- [ ] Preview shows useful info (title + status/date)

---

## Related Files

- `sanity/CLAUDE.md` — Full Sanity conventions
- `sanity/schemas/sections/` — Section schemas
- `sanity/schemas/presets/studio/` — Studio preset schemas
- `sanity/schemas/presets/church/` — Church preset schemas
- `components/SectionRenderer.tsx` — Section rendering
