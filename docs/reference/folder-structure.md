# Folder Structure Reference

**Context:** Salt project organization and file locations.

## Root Structure

```
salt-software/
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
├── _features/             # Domain-driven feature modules
│   ├── auth/             # Authentication flows, session management
│   ├── billing/          # Stripe subscriptions, pricing
│   ├── people/           # People & relationships (canonical surface)
│   ├── relationships/    # Shared components/actions (not routes)
│   ├── spaces/           # Spaces UI shell
│   ├── hq/               # HQ Today view, inbox, insights
│   ├── plays/            # Plays approval outbox, capture stream in Activity
│   ├── capture/          # Capture stream components (used inside Plays)
│   ├── connections/      # Relationship and context graph
│   ├── meetings/         # Meeting intelligence
│   ├── work/             # Work and project memory
│   ├── memory/           # Memory infra: taxonomy registry, edge store (lib/), entity types
│   ├── me/               # Operator profile, goals, voice (utils/ for activity + voice helpers)
│   ├── shell/            # App shell, navigation, layout
│   ├── marketing/        # Landing pages, lead capture
│   └── onboarding/       # User onboarding flows
│
├── _lib/                  # Shared infrastructure
│   ├── spaces/           # Spaces branding, queries, URLs
│   ├── supabase/         # Database clients (server, client, admin)
│   ├── tenancy/          # Multi-tenant logic
│   ├── email/            # Email sending (Resend)
│   ├── stripe/           # Stripe client utilities
│   ├── security/         # Tokens, safe URLs, encryption
│   ├── seo/              # SEO integrations (Lighthouse, CrUX, LLM info)
│   ├── composio/         # Connector integrations
│   ├── hooks/            # Shared React hooks
│   ├── rate-limit/       # API rate limiting
│   ├── theme/            # Theme resolution and accent presets
│   └── utils/            # General utilities
│
├── _components/           # Shared React components
│   ├── ui/               # shadcn/ui primitives (prefer @repo/ui for new code)
│   ├── layouts/          # Application chrome
│   ├── patterns/         # Reusable patterns
│   └── [global]          # Theme providers, global components
│
├── (product)/             # Authenticated product routes
│   ├── hq/               # Today view, briefings, inbox
│   ├── people/           # People & relationships (canonical)
│   ├── spaces/           # Shared workspaces
│   ├── plays/            # Plays approval outbox
│   ├── connections/      # Connections surface
│   ├── work/             # Work surface
│   ├── billing/          # Billing surface
│   └── ...               # orgs, teams, meetings, me, files, trash, setup
│
├── (settings)/            # Full-page settings routes
│   └── settings/         # Settings UI (modal shell + sections)
│
├── (sandbox)/             # Dev-only routes
│   ├── dev-login/        # Local auth smoke tests
│   └── email-preview/    # Email template previews
│
├── (public)/              # Marketing, auth pages (no auth required)
│   ├── blog/             # Blog system
│   ├── pricing/          # Pricing page
│   ├── signin/           # Authentication
│   └── [legal]/          # Privacy policy, ToS
│
├── api/                   # API routes (webhooks only)
│   ├── auth/             # Auth callbacks
│   ├── cron/             # Scheduled jobs
│   ├── stripe/           # Stripe endpoints
│   └── webhook/          # External webhooks
│
├── globals.css            # Global styles (Tailwind v4)
├── layout.tsx             # Root layout
├── page.tsx              # Landing page
└── error.tsx             # Error boundary
```

## Packages Directory (Shared Libraries)

```
packages/
├── patterns/             # Reusable UI patterns (@repo/patterns)
├── theme/                # Theme utilities and presets
├── ui/                   # shadcn/ui component library (@repo/ui)
└── utils/                # General utilities (@repo/utils)
```

## E2E Testing Directory

```
e2e/
├── playwright.config.ts  # Playwright configuration
├── fixtures/
│   └── auth.json         # Stored authentication states
└── tests/
    ├── auth.setup.ts     # Authentication setup
    └── *.spec.ts         # Test specifications
```

## Database Structure

```
supabase/
├── migrations/           # SQL migrations (chronological)
└── config.toml          # Supabase configuration
```

## Feature Module Structure

Each feature in `app/_features/` follows this pattern:

```
_features/[feature]/
├── actions/             # Server Actions directory (preferred for multiple files)
│   └── index.ts         # Barrel exports
├── actions.ts           # Single-file actions (small features)
├── queries.ts           # Data fetching functions
├── components/          # Feature-specific UI components
├── hooks/               # React hooks (client-side state)
├── types.ts            # Feature-specific types
└── utils.ts            # Feature-specific utilities
```

**Action locations by feature:**

| Feature | Path |
|---------|------|
| HQ / Insights | `app/_features/hq/actions/` |
| People | `app/_features/people/actions/` |
| Connectors | `app/_features/connectors/actions/` |
| Billing (SaaS) | `app/_features/billing/actions/` |
| Messaging | `app/_features/messaging/actions/` |
| Meetings | `app/_features/meetings/actions/` |
| Intelligence | `app/_features/intelligence/actions/` |
| Auth / Profile | `app/_features/auth/actions/` |
| Tags | `app/_features/shared/actions/` |
| Work | `app/_features/work/actions/` (retainer actions removed with the Bridge retirement) |

## Import Path Conventions

```typescript
// Feature imports (preferred)
import { updatePerson } from '@/app/_features/people/actions'
import { PersonCard } from '@/app/_features/people/components'

// Infrastructure imports
import { createServerClient } from '@/app/_lib/supabase/server'
import { sendEmail } from '@/app/_lib/email'

// UI primitives (preferred)
import { Button } from '@repo/ui/button'
import { PageHeader } from '@repo/patterns'

// Package imports
import { cn } from '@repo/utils'
```

## Key Directories by Feature

### Authentication
- **Routes:** `app/(public)/signin/`, `app/api/auth/`
- **Feature:** `app/_features/auth/`
- **Infrastructure:** `app/_lib/supabase/`, `app/_lib/security/`

### Billing
- **Routes:** `app/(product)/billing/`, `app/api/stripe/`
- **Feature:** `app/_features/billing/`
- **Infrastructure:** `app/_lib/stripe/`

### Multi-tenancy
- **Infrastructure:** `app/_lib/tenancy/`
- **Middleware:** `middleware.ts`
- **Used in:** All authenticated routes

### Spaces (shared workspaces)
- **Routes:** `app/(product)/spaces/`
- **Feature:** `app/_features/spaces/`
- **Infrastructure:** `app/_lib/spaces/`

### Work
- **Routes:** `app/(product)/work/`
- **Feature:** `app/_features/work/`
- **Actions:** `app/_features/work/actions` (when present) or feature-specific mutations

## Legacy redirects

| Legacy path | Canonical |
|-------------|-----------|
| `/studio`, `/dashboard` | `/hq` |
| `/clients`, `/relationships` | `/people` |
| Legacy `/capture` | `/plays?tab=activity&view=captures` |
| `/notes` | `/me` |
| `/roundtables`, `/tables` | `/spaces` |

See `docs/architecture/legacy-naming.md` for full redirect map.

## Migration from Legacy Structure

| Old Path | New Path | Status |
|----------|----------|--------|
| `libs/` | `app/_lib/` | Migrated |
| `app/(hq)/` | `app/(product)/` | Migrated |
| `app/(billing)/` | `app/(product)/billing/` | Merged |
| `app/(studio)/settings/` | `app/(settings)/settings/` | Migrated |
| `app/_features/table-command-center/` | `app/_features/spaces/` | Migrated |
| `app/_lib/spaces/` | `app/_lib/spaces/` | Migrated |
| Direct API routes | Server Actions in `_features/*/actions/` | Migrated |

**Architecture Notes:**
- **Feature-First:** Business logic lives in `_features/`, not scattered in routes
- **Infrastructure Separation:** Technical utilities in `_lib/`, not mixed with features
- **Monorepo Packages:** Shared UI in `packages/` (`@repo/ui`, `@repo/patterns`)
