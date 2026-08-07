# Salt - App Architecture Guide

**Context:** You are working in the main Next.js 15 App Router application.
**Architecture:** Full-stack Next.js with Server Actions, feature-driven organization.

## Directory Structure

```
app/
├── _features/          # Domain-driven feature modules (business logic)
├── _lib/               # Shared infrastructure (technical utilities)
├── (product)/          # Authenticated product routes (HQ, People, Plays, Spaces, etc.)
├── (settings)/         # Full-page settings routes
├── (public)/           # Marketing, auth pages (no auth required)
├── (sandbox)/          # Dev utilities (dev-login only)
├── api/                # Webhooks only (Stripe, OAuth callbacks)
```

## Feature Modules (`_features/`)

Primary surfaces: `hq`, `people`, `plays`, `capture` (stream in Plays Activity), `connections`, `meetings`, `shell`, `spaces`, `marketing`, `onboarding`, `messaging`, `relationships` (shared components/actions), `auth`, `billing`.

Each feature module contains:
- `actions/` or `actions.ts` - Server Actions for mutations (prefer `actions/` directory for multiple files)
- `queries.ts` - Data fetching functions (optional)
- `components/` - Feature-specific React components
- `hooks/` - Custom React hooks (optional)
- `types.ts` - TypeScript types (optional)

## Key Patterns

### 1. Feature-First Organization

Business logic lives in `_features/`, not scattered in routes:

```typescript
// GOOD - Feature module
import { updatePerson } from '@/app/_features/people/actions'

// AVOID - Route-embedded action
import { updatePerson } from './actions'
```

### 2. Server Actions for Mutations

All data mutations use Server Actions, not API routes:

```typescript
// app/_features/people/actions.ts
"use server"

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/app/_lib/supabase/server'

export async function updatePerson(data: PersonInput) {
  const supabase = await createServerClient()
  // ... mutation logic
  revalidatePath('/people')
}
```

### 3. Queries for Data Fetching

Data fetching in Server Components or via query functions:

```typescript
// app/_features/people/queries.ts
import { createServerClient } from '@/app/_lib/supabase/server'

export async function getPeople() {
  const supabase = await createServerClient()
  // ...
}
```

## Primary Routes (canonical)

| Surface | Path |
|---------|------|
| HQ | `/hq` |
| People | `/people` |
| Spaces | `/spaces` |
| Plays | `/plays` |
| Captures (in Plays) | `/plays?tab=activity&view=captures` |
| Memory Map | `/memory` (`/connections` redirects here) |
| Conversations | `/conversations` |
| Meetings | `/meetings` |
| Work | `/work` |
| Me | `/me` |
| Billing | `/billing` |
| Settings | `/settings` |

**Legacy URLs** (`/studio`, `/dashboard`, `/clients`, `/relationships`, `/capture`, `/notes`, `/roundtables`, `/tables`) redirect via `middleware.ts` and `app/_features/shell/routes.ts`. Do not add new routes under retired path prefixes.

## Import Conventions

```typescript
// Features
import { X } from '@/app/_features/<feature>/...'

// Shared lib
import { createServerClient } from '@/app/_lib/supabase/server'

// UI primitives
import { Button } from '@repo/ui/button'
```

## Testing

- Unit tests co-located: `*.test.ts` / `*.test.tsx`
- E2E tests in `e2e/` — use `/hq`, `/people`, `/spaces` as entry points
