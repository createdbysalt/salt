# Folder Structure Reference

**Context:** Salt Core project organization and file locations.

## Root Structure

```
salt-core/
├── app/                    # Next.js 15 App Router
├── components/             # Shared React components
├── libs/                   # Core business logic
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── supabase/              # Database migrations & config
├── public/                # Static assets
├── .claude/               # AI agent configuration
├── docs/                  # Technical documentation
└── [config files]         # Package.json, tsconfig, etc.
```

## App Directory (Routes)

```
app/
├── (core_marketing_site)/  # Public pages
│   ├── page.tsx           # Landing page
│   ├── pricing/           # Pricing page
│   ├── blog/              # Blog system
│   └── legal/             # Terms, privacy
│
├── (user_dashboard)/       # Studio owner area
│   ├── dashboard/         # Main dashboard
│   │   ├── overview/      # Dashboard home
│   │   ├── clients/       # Client management
│   │   ├── projects/      # Project management
│   │   ├── team/          # Team members
│   │   └── settings/      # Studio settings
│   └── layout.tsx         # Dashboard layout
│
├── (client_bridge)/        # Client portal
│   └── bridge/
│       └── [clientSlug]/  # Dynamic client routes
│           ├── page.tsx   # Client dashboard
│           └── projects/  # Client's projects
│
├── api/                    # API routes
│   ├── auth/              # Auth callbacks
│   ├── stripe/            # Payment endpoints
│   ├── webhook/           # Webhook handlers
│   └── actions/           # Server actions
│
├── signin/                 # Authentication pages
├── layout.tsx             # Root layout
├── globals.css            # Global styles (Tailwind)
└── error.tsx              # Error boundary
```

## Components Directory

```
components/
├── ui/                     # shadcn/ui components
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── [30+ components]
│
├── layout/                 # Layout components
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
│
├── features/               # Feature-specific
│   ├── billing/
│   ├── projects/
│   └── clients/
│
├── shared/                 # Shared components
│   ├── LoadingSpinner.tsx
│   ├── ErrorBoundary.tsx
│   └── EmptyState.tsx
│
└── *.tsx                   # Root-level components
    ├── ButtonCheckout.tsx
    ├── ButtonSignin.tsx
    └── UserProfile.tsx
```

## Libs Directory (Business Logic)

```
libs/
├── supabase/               # Database clients
│   ├── client.ts          # Browser client
│   ├── server.ts          # Server client (async)
│   ├── admin.ts           # Service role client
│   └── middleware.ts      # Auth middleware
│
├── tenancy/                # Multi-tenant logic
│   ├── context.ts         # Get tenant context
│   ├── resolver.ts        # Resolve tenant from URL
│   └── guards.ts          # Route guards
│
├── permissions/            # Authorization
│   ├── checks.ts          # Permission validators
│   ├── rls.ts            # RLS helpers
│   └── roles.ts          # Role definitions
│
├── stripe*.ts             # Payment processing
│   ├── stripe-saas.ts     # SaaS billing
│   ├── stripe-connect.ts  # Client billing
│   ├── stripe-client.ts   # Frontend helpers
│   └── stripe-test-guards.ts
│
├── *-emails.ts            # Email templates
│   ├── saas-emails.ts     # Platform emails
│   └── bridge-emails.ts   # Client emails
│
├── api.ts                 # API helpers
├── gpt.ts                 # AI integrations
├── rate-limit.ts          # Rate limiting
└── [utilities]            # Other utilities
```

## Database Structure

```
supabase/
├── migrations/             # SQL migrations (57+)
│   ├── 00001_initial.sql
│   ├── 00002_add_rls.sql
│   └── [chronological migrations]
│
├── functions/             # Edge functions
├── seed.sql              # Seed data
└── config.toml           # Supabase config
```

## Types Directory

```
types/
├── supabase.ts           # Generated DB types
├── stripe.ts             # Stripe type extensions
├── api.ts                # API request/response
└── global.d.ts           # Global type declarations
```

## Configuration Files

```
Root Level:
├── .env.example          # Environment template
├── .env.local           # Local environment (gitignored)
├── next.config.js       # Next.js configuration
├── tailwind.config.ts   # Tailwind v4 config
├── tsconfig.json        # TypeScript config
├── package.json         # Dependencies & scripts
├── middleware.ts        # Next.js middleware
└── postcss.config.js    # PostCSS for Tailwind
```

## Documentation Structure

```
docs/
├── quick-start.md        # Getting started
├── tech-stack.md         # Technology overview
├── CLAUDE.md            # Documentation standards
│
├── architecture/         # System design
│   ├── system-overview.md
│   ├── database-schema.md
│   ├── auth-flow.md
│   ├── payment.md
│   ├── multi-tenancy.md
│   └── security-model.md
│
├── guides/              # How-to guides
│   ├── api-standards.md
│   ├── testing-strategy.md
│   ├── ui-patterns.md
│   ├── nextjs15-patterns.md
│   ├── supabase-patterns.md
│   └── stripe-integration.md
│
├── reference/           # Quick reference
│   ├── environment-variables.md
│   ├── cli-commands.md
│   └── folder-structure.md
│
├── content-model/       # Data structures
└── decision-log/        # ADRs
```

## File Naming Conventions

### Components
- PascalCase: `UserProfile.tsx`
- Prefix with feature: `ButtonCheckout.tsx`
- Layout components: `LayoutDashboard.tsx`

### Libraries
- kebab-case: `stripe-connect.ts`
- Group by feature: `saas-emails.ts`
- Descriptive names: `calendar-encryption.ts`

### Routes
- Folders use kebab-case: `api/create-checkout/`
- Route files: `route.ts` (not `index.ts`)
- Pages: `page.tsx`

### Database
- Migrations: `00001_description.sql`
- Tables: snake_case (`studio_members`)
- Columns: snake_case (`created_at`)

## Import Paths

```typescript
// Absolute imports (preferred)
import { Button } from "@/components/ui/button";
import { createClient } from "@/libs/supabase/server";
import { hasStudioAccess } from "@/libs/permissions/checks";

// Relative imports (only for same folder)
import { helper } from "./helper";
```

## Key Directories by Feature

### Authentication
- Routes: `app/signin/`, `app/api/auth/`
- Logic: `libs/supabase/`
- Components: `components/ButtonSignin.tsx`

### Billing
- Routes: `app/api/stripe/`, `app/api/webhook/stripe/`
- Logic: `libs/stripe*.ts`
- Components: `components/ButtonCheckout.tsx`

### Multi-tenancy
- Logic: `libs/tenancy/`, `libs/permissions/`
- Middleware: `middleware.ts`
- Context: Used in all routes

### Client Portal (Bridge)
- Routes: `app/(client_bridge)/bridge/`
- Emails: `libs/bridge-emails.ts`
- Components: `components/features/bridge/`