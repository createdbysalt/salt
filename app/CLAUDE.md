# Salt - App Architecture Guide

**Context:** You are working in the main Next.js 15 App Router application.
**Architecture:** Full-stack Next.js with Server Actions, feature-driven organization.

## Directory Structure

```
app/
├── _features/          # Domain-driven feature modules (business logic)
├── _lib/               # Shared infrastructure (technical utilities)
├── (user_dashboard)/   # Internal studio/admin routes (session auth)
├── bridge/             # External client portal (token auth)
├── (public)/           # Marketing, auth pages (no auth required)
├── (sandbox)/          # Dev tools & playground (dev-login, design-system)
├── api/                # Webhooks only (Stripe, OAuth callbacks)
└── actions/            # Billing actions (Stripe checkout, portal)
```

## Feature Modules (`_features/`)

```
_features/
├── auth/           # Authentication flows, session management
├── billing/        # Stripe subscriptions, portal, pricing
├── intelligence/   # AI/ML features, embeddings
├── marketing/      # Landing pages, lead capture
├── onboarding/     # User onboarding flows
├── portal/         # Bridge/client portal components
├── shared/         # Cross-feature utilities
├── shell/          # App shell, navigation, layout
├── studio/         # Workspace management
└── tasks/          # Task management features
```

Each feature module contains:
- `actions.ts` - Server Actions for mutations
- `queries.ts` - Data fetching functions (optional)
- `components/` - Feature-specific React components
- `hooks/` - Custom React hooks (optional)
- `types.ts` - TypeScript types (optional)

## Key Patterns

### 1. Feature-First Organization

Business logic lives in `_features/`, not scattered in routes:

```typescript
// GOOD - Feature module
import { createProject } from '@/app/_features/projects/actions'

// AVOID - Route-embedded action
import { createProject } from './actions'
```

### 2. Server Actions for Mutations

All data mutations use Server Actions, not API routes:

```typescript
// app/_features/projects/actions.ts
"use server"

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/libs/supabase/server'

export async function createProject(data: ProjectInput) {
  const supabase = await createServerClient()
  // ... mutation logic
  revalidatePath('/dashboard/projects')
}
```

### 3. Queries for Data Fetching

Data fetching in Server Components or via query functions:

```typescript
// app/_features/projects/queries.ts
import { createServerClient } from '@/libs/supabase/server'

export async function getProjects(workspaceId: string) {
  const supabase = await createServerClient()
  return supabase.from('projects').select('*').eq('workspace_id', workspaceId)
}
```

## Authentication Patterns

| Route Group | Auth Type | Implementation |
|-------------|-----------|----------------|
| `(user_dashboard)` | Session-based | Supabase Auth via cookies |
| `bridge/` | Token-based | Magic links, JWT tokens |
| `(public)` | None | Public pages |
| `(sandbox)` | Dev bypass | Hardcoded dev credentials |

## Import Conventions

```typescript
// Package imports (preferred)
import { Button, Card } from '@repo/ui'
import { PageBanner, FilterBar, EmptyState } from '@repo/patterns'
import { cn } from '@repo/utils'

// App patterns
import { PageGreetingHeader } from '@/app/_components/patterns/page-greeting-header'

// Feature imports
import { useSession } from '@/app/_features/auth/hooks/useSession'
import { createProject } from '@/app/_features/projects/actions'

// Infrastructure imports
import { createServerClient } from '@/libs/supabase/server'
import { sendEmail } from '@/app/_lib/email'
```

## Design System References

**Before building UI, consult these docs:**

| Priority | Doc | Purpose |
|----------|-----|---------|
| 1 | `docs/guides/agent-component-guide.md` | **START HERE** - AI-optimized quick reference |
| 2 | `docs/guides/component-decision-matrix.md` | WHEN to use each component |
| 3 | `docs/guides/component-cookbook.md` | HOW to use with real examples |
| 4 | `docs/guides/page-templates.md` | ListPage, DetailPage, FormPage skeletons |
| 5 | `docs/guides/integration-patterns.md` | Server Actions, Suspense, forms |
| 6 | `brand-identity/product/ux-standards.md` | Linear Standard philosophy |

### Quick Rules

| Rule | Do | Don't |
|------|-----|-------|
| **Headers** | `PageGreetingHeader` (lists), `PageHeader` (detail/forms) | Inline `<h1>` tags |
| **Loading** | `Skeleton` matching final layout | `Spinner` for content |
| **Empty** | `EmptyState` component | Custom empty divs |
| **Colors** | `bg-primary`, `text-muted-foreground` | `bg-blue-500`, `text-gray-600` |
| **Forms** | Server Actions + RHF + Zod | API routes, useState |
| **Buttons** | One `default` variant per view | Multiple primary buttons |

## Do's and Don'ts

### Do:
- Use Server Actions for all mutations
- Organize by feature domain, not technical layer
- Use @repo/* packages for shared code
- Validate with Zod at action boundaries
- Use `revalidatePath` after mutations

### Don't:
- Create new API routes (except webhooks)
- Mix business logic with route handlers
- Import from `_features` in packages
- Skip type validation on inputs
- Use client-side fetching when Server Components work
