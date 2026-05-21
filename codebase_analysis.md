# Salt - Comprehensive Codebase Analysis

**Generated:** 2026-03-19
**Version:** Next.js 15.1.9 | React 19 | TypeScript 5.9.3

---

## 1. Project Overview

**Salt** is the strategic intelligence system that transforms developers and designers into strategic studio owners who win premium projects—not by doing more work, but by positioning strategically and delivering with measurable excellence.

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15.1.9 (App Router) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui |
| **Language** | TypeScript 5.9.3 (strict mode) |
| **Database** | Supabase (PostgreSQL + Auth + Storage) |
| **Payments** | Stripe (SaaS Billing + Connect) |
| **Testing** | Vitest (unit), Playwright (E2E) |
| **Package Manager** | pnpm 10.x (monorepo) |

### Architecture Summary

- **Full-stack Next.js**: No separate backend server - everything runs on port 3000
- **Server Actions**: Primary data mutation pattern (no REST API for internal use)
- **Feature-driven**: Domain logic organized in `app/_features/`
- **Monorepo**: Workspace packages in `packages/` (@repo/ui, @repo/patterns, etc.)

---

## 2. Directory Structure Analysis

```
salt-core/
├── app/                          # Next.js App Router
│   ├── (studio)/                 # Internal studio dashboard
│   ├── (client_portal)/          # Bridge client portal
│   ├── (public)/                 # Marketing, auth pages
│   ├── (serve)/                  # Client service interface
│   ├── (strategy)/               # Strategy tools
│   ├── (sandbox)/                # Dev tools
│   ├── _features/                # Domain-driven feature modules
│   ├── _lib/                     # Shared infrastructure
│   ├── _components/              # Shared UI components
│   ├── actions/                  # Server Actions (legacy location)
│   ├── api/                      # API routes (webhooks only)
│   └── dashboard/                # Dashboard entry
├── packages/                     # Monorepo workspace packages
│   ├── ui/                       # @repo/ui - shadcn primitives (52 components)
│   ├── patterns/                 # @repo/patterns - composed patterns
│   ├── shared-types/             # @repo/shared-types - Zod schemas
│   ├── utils/                    # @repo/utils - shared utilities
│   ├── theme/                    # @repo/theme - theming
│   ├── security/                 # @repo/security - security utilities
│   └── logger/                   # @repo/logger - logging
├── supabase/                     # Database configuration
│   ├── migrations/               # 122 SQL migration files
│   └── config.toml               # Supabase local config
├── e2e/                          # Playwright E2E tests
├── docs/                         # Architecture & guides
├── brand-identity/               # Brand voice & positioning
└── .claude/                      # Claude Code agents & commands
```

### Route Groups Explained

| Route Group | Path | Purpose |
|-------------|------|---------|
| `(studio)` | `/studio/*` | Internal admin dashboard for studio owners |
| `(client_portal)` | `/bridge/*` | Client-facing portal (magic link auth) |
| `(public)` | `/signin`, `/pricing`, `/blog` | Marketing & public pages |
| `(serve)` | `/serve/*` | Client service interface |
| `(strategy)` | `/strategy/*` | Strategy & intelligence tools |
| `(sandbox)` | `/dev-login`, `/playground` | Development utilities |

---

## 3. Feature Modules (`app/_features/`)

Each feature module contains domain-specific code following this structure:

```
_features/<feature>/
├── actions.ts       # Server Actions
├── queries.ts       # Data fetching (DAL)
├── components/      # React components
├── hooks/           # React hooks
└── types.ts         # TypeScript types
```

### Feature Inventory

| Feature | Purpose | Key Files |
|---------|---------|-----------|
| **auth** | Authentication flows | `actions.ts`, `components/AuthTokenHandler.tsx` |
| **billing** | Stripe SaaS billing | `actions.ts`, `components/` |
| **clients** | Client management | `actions.ts`, `queries.ts`, `components/ClientsDataTable.tsx` |
| **projects** | Project tracking | `actions.ts`, `queries.ts`, `components/` |
| **inbox** | Unified inbox | `queries.ts`, `types.ts`, `components/` |
| **messaging** | Client communication | `actions.ts`, `components/` |
| **meetings** | Calendar integration | `actions.ts`, `components/` |
| **intelligence** | AI-powered insights | `actions.ts`, `components/` |
| **proposals** | Proposal generation | `actions.ts`, `components/` |
| **seo** | SEO monitoring | `actions.ts`, `components/` |
| **shell** | App shell, navigation | `components/SiteHeader.tsx`, `sidebar/` |
| **studio** | Studio settings | `actions.ts`, `hooks/useStudioProfile.ts` |
| **onboarding** | User onboarding | `components/` |
| **knowledge** | Knowledge base | `actions.ts`, `components/` |
| **portfolio** | Portfolio showcase | `actions.ts`, `components/` |
| **services** | Service packages | `actions.ts`, `components/` |

---

## 4. Shared Libraries (`app/_lib/`)

Infrastructure utilities shared across features:

| Module | Purpose |
|--------|---------|
| `supabase/` | Database clients (server, client, admin, middleware) |
| `stripe/` | Payment integration (SaaS billing, Connect) |
| `security/` | Auth tokens, safe redirects, URL validation |
| `permissions/` | RLS helpers and permission checks |
| `tenancy/` | Multi-tenant context and guards |
| `email/` | Resend integration for transactional emails |
| `bridge/` | Bridge portal utilities (branding, queries) |
| `hooks/` | Shared React hooks (realtime, unread counts) |
| `theme/` | Theme resolution and accent presets |
| `ai/` | GPT integration |
| `rate-limit/` | API rate limiting |
| `seo/` | Lighthouse and CrUX integrations |
| `gmail/` | Gmail integration |
| `animations/` | Framer Motion utilities |

---

## 5. Packages (Monorepo)

### @repo/ui (52 Components)

Vanilla shadcn/ui primitives with minimal customization.

| Category | Components |
|----------|------------|
| **Layout** | `card`, `separator`, `accordion`, `sidebar`, `app-sidebar`, `collapsible`, `resizable`, `section-cards` |
| **Forms** | `button`, `input`, `input-group`, `textarea`, `select`, `checkbox`, `switch`, `radio-group`, `label`, `form`, `toggle`, `toggle-group`, `slider`, `phone-input`, `calendar`, `date-picker`, `combobox` |
| **Feedback** | `badge`, `alert`, `progress`, `skeleton`, `sonner`, `toast` |
| **Overlays** | `dialog`, `sheet`, `drawer`, `alert-dialog`, `dropdown-menu`, `tooltip`, `command`, `popover` |
| **Data** | `table`, `data-table`, `tabs`, `avatar`, `chart`, `chart-area-interactive` |
| **Navigation** | `breadcrumb`, `nav-main`, `nav-secondary`, `nav-documents`, `nav-projects`, `nav-user`, `site-header` |
| **Typography** | `typography` |

**Import Convention:**
```typescript
import { Button, Card, Input } from "@repo/ui"
```

### @repo/patterns

Composed UI patterns built on @repo/ui primitives.

### @repo/shared-types

Zod schemas and TypeScript types shared across packages.

### @repo/utils

Common utilities (formatters, validators, etc.).

---

## 6. Database (Supabase)

### Configuration
- **122 migration files** in `supabase/migrations/`
- Local development via `supabase/config.toml`
- Row Level Security (RLS) enforced

### Recent Migrations (Last 10)
```
20260304140000_add_studio_location.sql
20260304150000_simplify_portfolio_tags.sql
20260304160000_add_client_and_project_tags.sql
20260304180000_add_meeting_notes_file_tag.sql
20260310120000_add_archive_delete_to_services.sql
20260310140000_add_service_categories.sql
20260311000000_align_service_categories.sql
20260311100000_add_retainer_fields_to_services.sql
20260311100001_seed_default_retainer_packages.sql
20260313000000_add_profile_contact_fields.sql
```

### Key Tables (from schema docs)
- `studios` - Studio/agency accounts
- `profiles` - User profiles
- `clients` - Client records
- `projects` - Project tracking
- `conversations` - Messaging threads
- `messages` - Individual messages
- `retainers` - Retainer agreements
- `invoices` - Billing records
- `proposals` - Proposal documents
- `services` - Service packages

---

## 7. Authentication Architecture

### Two Auth Flows

| Flow | Route Group | Method | Use Case |
|------|-------------|--------|----------|
| **Session-based** | `(studio)` | Supabase Auth (email/password, OAuth) | Studio owners |
| **Magic Link** | `(client_portal)` | OTP via email | Client portal access |

### Implementation Files

| Concept | Location |
|---------|----------|
| Edge Protection | `middleware.ts` |
| Session Schema | `packages/shared-types/src/auth/session.schema.ts` |
| Login Page (Studio) | `app/(public)/signin/page.tsx` |
| Login Page (Bridge) | `app/(client_portal)/bridge/login/page.tsx` |
| Auth Hooks | `app/_features/auth/hooks/` |

### Hard Constraints
1. NO localStorage for tokens (httpOnly cookies only)
2. Edge middleware cannot use Node.js modules
3. Use `@repo/shared-types` for User/Session types
4. Client-side hooks are UI-only (real protection is server-side)

---

## 8. API Routes

API routes are used **only for webhooks** - internal data operations use Server Actions.

| Route | Purpose |
|-------|---------|
| `/api/webhook/stripe/` | Stripe webhook handler |
| `/api/webhook/stripe-connect/` | Stripe Connect webhooks |
| `/api/webhooks/cal/` | Cal.com webhooks |
| `/api/webhooks/fireflies/` | Fireflies.ai webhooks |
| `/api/webhooks/gmail/` | Gmail push notifications |
| `/api/auth/callback/` | OAuth callback handler |
| `/api/auth/google/callback/` | Google OAuth callback |
| `/api/cron/seo-audits/` | Scheduled SEO audits |

---

## 9. Testing Strategy

### Toolchain
- **Unit Tests**: Vitest (co-located with source files)
- **E2E Tests**: Playwright (isolated in `e2e/`)
- **Never**: Jest or Cypress

### File Patterns
```
app/_features/auth/components/
├── AuthTokenHandler.tsx
└── AuthTokenHandler.test.tsx   # Unit test (co-located)

e2e/tests/
└── auth.setup.ts               # E2E test (isolated)
```

### Commands
```bash
pnpm test              # Unit tests
pnpm test:watch        # Unit tests (watch mode)
pnpm test:e2e          # E2E tests
pnpm test:e2e --ui     # E2E debug mode
pnpm test:all          # All tests
```

### Key Rules
- Port 3000 required for E2E tests
- Use role-based locators (`getByRole`, `getByLabel`, `getByText`)
- Never CSS selectors or XPath
- Test behavior, not implementation

---

## 10. Configuration Files

| File | Purpose |
|------|---------|
| `next.config.js` | Next.js configuration |
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.js` | Tailwind CSS 4 configuration |
| `postcss.config.js` | PostCSS (Tailwind integration) |
| `eslint.config.mjs` | ESLint flat config |
| `vitest.config.ts` | Vitest test configuration |
| `playwright.config.ts` | Playwright E2E configuration |
| `velite.config.js` | MDX content configuration |
| `components.json` | shadcn/ui configuration |
| `pnpm-workspace.yaml` | pnpm workspace packages |
| `.npmrc` | npm/pnpm configuration |

---

## 11. Environment Setup

### Required Environment Variables
See `.env.example` and `docs/reference/environment-variables.md`

Key variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Development Commands
```bash
pnpm install           # Install dependencies
pnpm dev               # Start dev server (port 3000)
pnpm build             # Production build
pnpm lint --fix        # Lint and fix
pnpm dlx supabase db push  # Push database changes
```

### Subdomain Development
| Production | Local |
|------------|-------|
| `app.usesalt.io` | `localhost:3000/studio` or `app.lvh.me:3000` |
| `bridge.usesalt.io` | `localhost:3000/bridge` or `bridge.lvh.me:3000` |

---

## 12. Visual Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Salt                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Route Groups                                                        │
│  ├── (studio)        → Internal studio/admin dashboard              │
│  ├── (client_portal) → Bridge client portal (magic link auth)       │
│  ├── (public)        → Marketing, auth pages                        │
│  ├── (serve)         → Client service interface                     │
│  ├── (strategy)      → Strategy & intelligence tools                │
│  └── (sandbox)       → Dev tools (dev-login, playground)            │
├─────────────────────────────────────────────────────────────────────┤
│  Feature Modules (_features/)                                        │
│  ├── auth, billing, clients, projects, messaging, etc.              │
│  └── Each: actions.ts, queries.ts, components/, hooks/              │
├─────────────────────────────────────────────────────────────────────┤
│  Shared Libraries (_lib/)                                            │
│  ├── supabase/  → Database clients                                  │
│  ├── stripe/    → Payment integration                               │
│  ├── email/     → Transactional emails (Resend)                     │
│  ├── bridge/    → Client portal utilities                           │
│  └── security/, tenancy/, permissions/                              │
├─────────────────────────────────────────────────────────────────────┤
│  Packages (@repo/*)                                                  │
│  ├── ui           → shadcn primitives (52 components)               │
│  ├── patterns     → Composed UI patterns                            │
│  ├── shared-types → Zod schemas & TypeScript types                  │
│  ├── utils        → Shared utilities                                │
│  └── theme, security, logger                                        │
├─────────────────────────────────────────────────────────────────────┤
│  Infrastructure                                                      │
│  ├── Supabase    → Auth, Database (PostgreSQL), Storage             │
│  ├── Stripe      → SaaS billing, Connect for client payments        │
│  └── Resend      → Transactional emails                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 13. CI/CD & DevOps

### GitHub Actions Workflows
| Workflow | Purpose |
|----------|---------|
| `claude-code-security-review.yml` | AI security review |
| `claude-code-review.yml` | AI code review |
| `codeql.yml` | CodeQL security scanning |
| `daily-bip.yml` | Daily build/integration |
| `claude-interactive.yml` | Interactive Claude sessions |

### Deployment
- Vercel deployment (`.vercel/` config present)
- Production at `usesalt.io` with subdomains

---

## 14. Documentation Structure

### Architecture Docs (`docs/architecture/`)
- `auth-flow.md` - Authentication architecture
- `database-schema.md` - Database design
- `security-model.md` - Security patterns

### Guide Docs (`docs/guides/`)
- `agent-component-guide.md` - AI-optimized component reference
- `component-decision-matrix.md` - When to use each component
- `component-cookbook.md` - Real-world usage patterns
- `testing-strategy.md` - Testing philosophy
- `api-standards.md` - API conventions
- `coding-conventions.md` - Code style
- `error-handling.md` - Error patterns
- `stripe-integration.md` - Payments guide

### Brand Identity (`brand-identity/`)
| Folder | Purpose |
|--------|---------|
| `foundation/` | Constitutional docs (brand essence, voice, audience) |
| `positioning/` | Strategic positioning |
| `product/` | Product docs (roadmap, UX standards, pricing) |
| `voice/` | Applied voice (terminology, copy snippets) |
| `research/` | Evidence archive |

---

## 15. Key Insights & Recommendations

### Code Quality Assessment
- **Strong**: TypeScript strict mode, clear feature boundaries, comprehensive testing setup
- **Good**: Server Actions pattern, RLS enforcement, monorepo structure
- **Area for improvement**: Some legacy code in `app/actions/` could be migrated to `_features/*/actions.ts`

### Security Considerations
- RLS enforced on all Supabase tables
- httpOnly cookies for authentication
- Edge middleware for route protection
- Service role key properly isolated

### Performance Optimizations
- Server Components by default (React 19)
- Streaming with Suspense boundaries
- Image optimization via Next.js
- Code splitting via route groups

### Maintainability
- Feature-driven architecture scales well
- CLAUDE.md files provide AI-accessible documentation
- Clear separation between packages and app code
- Comprehensive testing strategy

---

## 16. Quick Reference

### Common Operations
```bash
# Development
pnpm dev                    # Start server
pnpm build                  # Build for production
pnpm lint --fix             # Lint and fix

# Testing
pnpm test                   # Unit tests
pnpm test:e2e               # E2E tests

# Database
pnpm dlx supabase db push   # Push migrations

# Packages
pnpm add <pkg>              # Add dependency
pnpm add <pkg> -w           # Add to root
pnpm add <pkg> --filter @repo/ui  # Add to package
```

### Key File Locations
| Need | Location |
|------|----------|
| Add a feature | `app/_features/<name>/` |
| Add UI component | `packages/ui/src/primitives/` |
| Add migration | `supabase/migrations/` |
| Add E2E test | `e2e/tests/` |
| Add documentation | `docs/guides/` or `docs/architecture/` |

---

*Analysis generated by Claude Code on 2026-03-19*
