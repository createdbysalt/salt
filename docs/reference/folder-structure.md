# Folder Structure Reference

**Context:** Salt Core project organization and file locations.

## Root Structure

```
salt-core/
├── app/                    # Next.js 15 App Router
├── packages/               # Shared library packages
├── e2e/                    # End-to-end tests (Playwright)
├── supabase/              # Database migrations & config
├── public/                # Static assets
├── scripts/               # Utility scripts
├── docs/                  # Technical documentation
├── brand-identity/        # Brand identity system (foundation, positioning, product, voice)
├── .claude/               # AI agent configuration
└── [config files]        # Package.json, tsconfig, etc.
```

## App Directory (Routes & Features)

```
app/
├── _features/             # Domain-driven feature modules (NEW ARCHITECTURE)
│   ├── auth/             # Authentication flows, session management
│   ├── billing/          # Stripe subscriptions, pricing
│   ├── calendar/         # Google Calendar integration
│   ├── clients/          # Client management features
│   ├── insights/         # Analytics and dashboards
│   ├── intelligence/     # AI/ML features, embeddings
│   ├── marketing/        # Landing pages, lead capture
│   ├── messaging/        # Comments, conversations, notifications
│   ├── onboarding/       # User onboarding flows
│   ├── portal/           # Bridge/client portal components
│   ├── projects/         # Project management features
│   ├── seo/              # SEO audits, site analysis
│   ├── shared/           # Cross-feature utilities
│   ├── shell/            # App shell, navigation, layout
│   ├── studio/           # Workspace management
│   ├── tasks/            # Task management features
│   └── workspace/        # Studio/workspace settings
│
├── _lib/                  # Shared infrastructure modules (NEW ARCHITECTURE)
│   ├── ai/               # AI/GPT utilities
│   ├── bridge/           # Client bridge utilities
│   ├── db/               # Database connection utilities
│   ├── email/            # Email sending (Resend)
│   ├── hooks/            # Shared React hooks
│   ├── logger/           # Production-safe logging
│   ├── permissions/      # Authorization and RLS helpers
│   ├── rate-limit/       # API rate limiting
│   ├── security/         # Tokens, safe URLs, encryption
│   ├── seo/              # SEO integrations (Lighthouse, CrUX)
│   ├── stripe/           # Stripe client utilities
│   ├── supabase/         # Database clients (server, client, admin)
│   ├── tenancy/          # Multi-tenant logic
│   ├── theme/            # Theme resolution and accent presets
│   └── utils/            # General utilities
│
├── _components/           # Shared React components (NEW ARCHITECTURE)
│   ├── ui/               # shadcn/ui primitives
│   ├── layouts/          # Application chrome
│   ├── patterns/         # Reusable patterns
│   ├── charts/           # Chart components
│   ├── dataviz/          # Data visualization
│   ├── effects/          # Animations & effects
│   └── [global]          # Theme providers, global components
│
├── (hq)/                  # HQ app - Studio command center
│   └── hq/               # Dashboard, briefings, inbox
│       ├── inbox/        # Unified inbox
│       ├── insights/     # Studio analytics
│       └── dev-seed/     # Development utilities
│
├── (clients)/             # Clients app - Foundation layer
│   └── clients/          # Client management
│       ├── [id]/         # Client detail page
│       ├── directory/    # Client directory view
│       ├── messages/     # Client messaging
│       └── onboarding/   # Client onboarding
│
├── (work)/                # Work app - Active projects/retainers
│   └── work/             # Project execution
│       └── projects/     # Project management
│           └── [id]/     # Project detail page
│
├── (billing)/             # Billing app - Financial operations
│   └── billing/          # Invoices, services, payments
│
├── (sales)/               # Sales app - Pipeline management
│   └── sales/            # Leads, proposals
│       └── pipeline/     # Pipeline board view
│
├── (studio)/              # Studio settings (not an "app")
│   └── settings/         # Studio configuration
│
├── (client_portal)/       # The Bridge - Client portal (token auth)
│   └── bridge/           # Client-facing routes
│       ├── files/        # Document sharing
│       ├── inbox/        # Client inbox
│       ├── login/        # Client authentication
│       ├── messages/     # Client communication
│       ├── settings/     # Client settings
│       └── verify/       # Magic link verification
│
├── (public)/              # Marketing, auth pages (no auth required)
│   ├── blog/             # Blog system
│   ├── book/             # Booking pages
│   ├── careers/          # Job postings
│   ├── pricing/          # Pricing page
│   ├── signin/           # Authentication
│   └── [legal]/          # Privacy policy, ToS
│
├── (sandbox)/             # Dev tools & playground
│   ├── design-system/    # Design system showcase
│   ├── dev-login/        # Development authentication
│   └── playground/       # Development testing area
│
├── actions/               # Server Actions (grouped by domain)
│   ├── billing/          # Stripe actions
│   ├── calendar/         # Calendar actions
│   ├── clients/          # Client management actions
│   ├── insights/         # Analytics actions
│   ├── meetings/         # Meeting actions
│   ├── messaging/        # Message actions
│   ├── profile/          # Profile actions
│   ├── projects/         # Project actions
│   ├── retainers/        # Retainer actions
│   ├── seo/              # SEO actions
│   └── tags/             # Tag actions
│
├── api/                   # API routes (webhooks only)
│   ├── auth/             # Auth callbacks
│   ├── calendar/         # Calendar webhooks
│   ├── cron/             # Scheduled jobs
│   ├── lead/             # Lead capture
│   ├── stripe/           # Stripe endpoints
│   ├── user/             # User settings
│   └── webhook/          # External webhooks
│
├── globals.css            # Global styles (Tailwind v4)
├── layout.tsx             # Root layout
├── page.tsx              # Landing page
├── error.tsx             # Error boundary
├── not-found.tsx         # 404 page
└── [static assets]       # Icons, images
```

## Packages Directory (Shared Libraries)

```
packages/
├── logger/               # Structured logging utilities
├── patterns/             # Reusable UI patterns
├── security/             # Security utilities
├── shared-types/         # TypeScript types and Zod schemas
├── theme/                # Theme utilities and presets
├── ui/                   # shadcn/ui component library
└── utils/                # General utilities
```

Each package contains:
```
packages/[package]/
├── package.json          # Package metadata
├── tsconfig.json         # TypeScript config
├── vitest.config.ts      # Test configuration
└── src/
    ├── index.ts          # Public API exports
    └── [modules]         # Implementation files
```

## E2E Testing Directory

```
e2e/
├── playwright.config.ts  # Playwright configuration
├── global-setup.ts       # Application health check
├── fixtures/
│   └── auth.json         # Stored authentication states
├── tests/
│   ├── auth.setup.ts     # Authentication setup
│   ├── *.spec.ts         # Test specifications
│   └── smoke.spec.ts     # Basic functionality tests
└── utils/
    └── [helpers]         # Test utilities
```

## Database Structure

```
supabase/
├── migrations/           # SQL migrations (chronological)
│   ├── 00001_*.sql      # Initial schema
│   ├── 00002_*.sql      # Add features
│   └── [incremental]    # Sequential migrations
├── config.toml          # Supabase configuration
└── .env.example         # Environment template
```

## Configuration Files

```
Root Level:
├── .env.example         # Environment template
├── .env.local          # Local environment (gitignored)
├── next.config.js      # Next.js configuration
├── tailwind.config.ts  # Tailwind v4 config
├── tsconfig.json       # TypeScript config
├── package.json        # Dependencies & scripts
├── middleware.ts       # Next.js middleware
├── postcss.config.js   # PostCSS configuration
├── vitest.config.ts    # Vitest workspace
└── playwright.config.ts # Legacy E2E config
```

## Feature Module Structure

Each feature in `app/_features/` follows this pattern:

```
_features/[feature]/
├── actions.ts           # Server Actions (mutations)
├── queries.ts           # Data fetching functions
├── components/          # Feature-specific UI components
│   ├── index.ts        # Component exports
│   └── [Component].tsx # React components
├── hooks/               # React hooks (client-side state)
├── types.ts            # Feature-specific types
└── utils.ts            # Feature-specific utilities
```

## _lib Module Structure

Each module in `app/_lib/` follows this pattern:

```
_lib/[module]/
├── index.ts            # Public API exports
├── [module].ts         # Main implementation
├── types.ts            # Module types (optional)
└── utils.ts            # Module utilities (optional)
```

## File Naming Conventions

### Components
- **PascalCase:** `UserProfile.tsx`
- **Feature prefix:** `ClientCard.tsx`, `ProjectHeader.tsx`
- **Descriptive:** `BridgeMessagesPageClient.tsx`

### Actions & Queries
- **kebab-case:** `get-client-analytics.ts`
- **Descriptive:** `create-subscription.ts`
- **Group by domain:** `billing/`, `projects/`

### Routes
- **Folders:** kebab-case or (grouped)
- **Route files:** `route.ts`, `page.tsx`, `layout.tsx`
- **Dynamic:** `[id]/`, `[...slug]/`

### Database
- **Migrations:** `00001_description.sql`
- **Tables:** snake_case (`studio_members`)
- **Columns:** snake_case (`created_at`)

## Import Path Conventions

```typescript
// Feature imports (preferred)
import { createProject } from '@/app/_features/projects/actions'
import { ProjectCard } from '@/app/_features/projects/components'

// Infrastructure imports
import { createServerClient } from '@/app/_lib/supabase/server'
import { sendEmail } from '@/app/_lib/email'
import { logger } from '@/app/_lib/logger'

// Component imports
import { Button } from '@/app/_components/ui/button'
import { StatCard } from '@/app/_components/patterns'

// Package imports
import { cn } from '@repo/utils'
import { Button as RepoButton } from '@repo/ui'

// Relative imports (only for same folder)
import { helper } from './helper'
```

## Key Directories by Feature

### Authentication
- **Routes:** `app/(public)/signin/`, `app/api/auth/`
- **Feature:** `app/_features/auth/`
- **Infrastructure:** `app/_lib/supabase/`, `app/_lib/security/`

### Billing
- **Routes:** `app/api/stripe/`, `app/api/webhook/stripe/`
- **Feature:** `app/_features/billing/`
- **Infrastructure:** `app/_lib/stripe/`

### Multi-tenancy
- **Infrastructure:** `app/_lib/tenancy/`, `app/_lib/permissions/`
- **Middleware:** `middleware.ts`
- **Used in:** All authenticated routes

### Client Portal (Bridge)
- **Routes:** `app/(client_portal)/bridge/`
- **Feature:** `app/_features/portal/`
- **Infrastructure:** `app/_lib/bridge/`

### Project Management
- **Routes:** `app/(user_dashboard)/dashboard/projects/`
- **Feature:** `app/_features/projects/`
- **Actions:** `app/actions/projects/`

## Migration from Legacy Structure

**If you see references to these old paths, they should be updated:**

| Old Path | New Path | Status |
|----------|----------|--------|
| `libs/` | `app/_lib/` | ✅ Migrated |
| `components/` | `app/_components/` | ✅ Migrated |
| `hooks/` | `app/_lib/hooks/` | ✅ Migrated |
| `types/` | `packages/shared-types/` | ✅ Migrated |
| Direct API routes | Server Actions in `actions/` | ✅ Migrated |

**Architecture Notes:**
- **Feature-First:** Business logic lives in `_features/`, not scattered in routes
- **Infrastructure Separation:** Technical utilities in `_lib/`, not mixed with features
- **Component Organization:** UI components in `_components/` with clear hierarchy
- **Monorepo Packages:** Shared code in `packages/` for reusability across projects