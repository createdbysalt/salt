---
name: build-page
description: "Build production-ready marketing pages from approved copy using Salt Core's design system."
---

# /build-page - Marketing Page Builder

Build Next.js marketing pages from structured briefs using Salt Core's section components and design system.

## Purpose

Transform approved copy into production-ready marketing pages. This command orchestrates the `marketing-page-builder` agent to create Server Component pages with proper meta tags, semantic colors, and accessibility.

## When to Use

- After `/copy` generates approved copy
- Building new marketing pages (features, about, etc.)
- Rebuilding existing pages with new design
- Creating landing pages for campaigns

## Usage

```bash
# Build from copy output (recommended workflow)
/copy page homepage | /build-page

# Build specific page with inline brief
/build-page homepage
/build-page pricing
/build-page features
/build-page about

# Build from brief file
/build-page --brief briefs/homepage.json

# Preview mode (dry run)
/build-page homepage --preview

# With specific sections only
/build-page homepage --sections hero,features,cta
```

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `page` | Page to build: `homepage`, `pricing`, `features`, `about` | - |
| `--brief` | Path to JSON brief file | - |
| `--preview` | Show plan without writing files | `false` |
| `--sections` | Comma-separated section list | All sections |
| `--force` | Overwrite existing page | `false` |

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                   /build-page [page]                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PHASE 1: BRIEF LOADING                                      │
│  ─────────────────────────                                   │
│  • Load brief from /copy output or file                      │
│  • Validate required fields (meta, sections)                 │
│  • Map sections to components                                │
│                                                              │
│  PHASE 2: SCAFFOLDING                                        │
│  ─────────────────────────                                   │
│  • Create page file at app/(public)/[page]/page.tsx          │
│  • Add metadata export                                       │
│  • Import required components                                │
│                                                              │
│  PHASE 3: SECTION BUILDING                                   │
│  ─────────────────────────                                   │
│  • For each section in brief:                                │
│    - Select matching section component                       │
│    - Inject content from brief                               │
│    - Create new components if needed                         │
│                                                              │
│  PHASE 4: VALIDATION                                         │
│  ─────────────────────────                                   │
│  • TypeScript compilation check                              │
│  • ESLint (semantic colors, no raw Tailwind)                 │
│  • Accessibility basics                                      │
│  • Server Component verification                             │
│                                                              │
│  PHASE 5: OUTPUT                                             │
│  ─────────────────────────                                   │
│  • Write page file                                           │
│  • Write any new components                                  │
│  • Report validation results                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Brief Format

The agent expects a structured brief (JSON):

```json
{
  "page": "homepage",
  "meta": {
    "title": "Salt Core - The Studio Operating System",
    "description": "Transform from order-taker to strategic partner.",
    "ogImage": "/og/homepage.png"
  },
  "sections": [
    {
      "type": "hero",
      "content": {
        "headline": "Win $10k+ projects",
        "subheadline": "The studio OS that transforms designer-developers into strategic consultants.",
        "primaryCTA": { "label": "Join the waitlist", "href": "/waitlist" },
        "secondaryCTA": { "label": "See how it works", "href": "#features" }
      }
    },
    {
      "type": "features",
      "content": {
        "headline": "Everything you need to run a premium studio",
        "items": [
          {
            "title": "Strategic Intelligence",
            "description": "Know what to charge before you quote.",
            "icon": "brain"
          },
          {
            "title": "Client Portal",
            "description": "White-labeled workspace for every client.",
            "icon": "users"
          }
        ]
      }
    },
    {
      "type": "cta",
      "content": {
        "headline": "Ready to charge what you're worth?",
        "primaryCTA": { "label": "Join the waitlist", "href": "/waitlist" }
      }
    }
  ]
}
```

## Section Types

| Type | Component | Content Fields |
|------|-----------|----------------|
| `hero` | HeroSection | headline, subheadline, primaryCTA, secondaryCTA |
| `problem` | ProblemSection | headline, body |
| `solution` | SolutionSection | headline, body, features |
| `features` | FeaturesGrid / FeaturesBento | headline, items[] |
| `testimonials` | TestimonialsSection | headline, testimonials[] |
| `pricing` | PricingSection | headline, tiers[] |
| `faq` | FAQSection | headline, questions[] |
| `cta` | CTASection | headline, primaryCTA |
| `comparison` | WithWithoutSection | without[], with[] |

## Example Output

```
═══════════════════════════════════════════════════════════════
PAGE BUILT: Homepage
═══════════════════════════════════════════════════════════════

FILES CREATED
─────────────────────────────────────────────────────────────────
✅ app/(public)/page.tsx (updated)
✅ app/_features/marketing/components/sections/HeroSection.tsx (created)

PAGE STRUCTURE
─────────────────────────────────────────────────────────────────
1. HeroSection
   - Headline: "Win $10k+ projects"
   - CTA: "Join the waitlist" → /waitlist

2. FeaturesGrid (6 features)
   - Strategic Intelligence
   - Client Portal
   - Ambient Intelligence
   - Project Management
   - Invoicing
   - Calendar

3. CTASection
   - CTA: "Join the waitlist" → /waitlist

VALIDATION
─────────────────────────────────────────────────────────────────
✅ TypeScript: Build successful
✅ ESLint: No errors
✅ Semantic colors: All valid (no raw Tailwind)
✅ Server Components: 3/3 sections

META TAGS
─────────────────────────────────────────────────────────────────
Title: Salt Core - The Studio Operating System
Description: Transform from order-taker to strategic partner...
Canonical: /

═══════════════════════════════════════════════════════════════
```

## Component Library

### Existing Components
Check `app/_features/marketing/components/` for existing sections.

### Creating New Components
If a section type doesn't have a component:
1. Create in `app/_features/marketing/components/sections/`
2. Use Server Component by default
3. Follow SectionWrapper pattern
4. Use semantic color tokens only

## Styling Requirements

### Semantic Colors Only
```
✅ bg-background, bg-card, bg-muted
✅ text-foreground, text-muted-foreground
✅ border-border

❌ bg-slate-900, bg-gray-800
❌ text-white, text-gray-400
```

### Dark Mode First
- Design for dark mode as primary
- Light mode should work automatically via CSS variables
- Test in both modes

## Integration with Other Commands

| Command | Integration |
|---------|-------------|
| `/copy` | Provides brief with approved copy |
| `/optimize` | Adds meta tags and schema |
| `/scout` | Research section patterns |

## Troubleshooting

### "Component not found"
Check if section component exists in `app/_features/marketing/components/sections/`. If not, the agent will create it.

### "Build failed"
Check TypeScript errors. Usually missing imports or type mismatches.

### "Semantic color warning"
Replace raw Tailwind colors (bg-gray-900) with semantic tokens (bg-background).

## See Also

- `marketing-page-builder` agent (core implementation)
- `brand-identity/research/feature-research/2026-02-06-marketing-page-builder-agent.md` (research)
- `docs/guides/agent-component-guide.md` (component reference)
- `docs/guides/ui-patterns.md` (styling guide)
