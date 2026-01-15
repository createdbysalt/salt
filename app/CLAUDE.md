# Salt Core - App Architecture Guide

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
├── api/                # Webhooks only (Stripe, OAuth callbacks)
└── actions/            # Legacy actions (gradually migrating to _features)
```

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

## Import Conventions

```typescript
// Package imports (preferred)
import { Button, Card } from '@repo/ui'
import { cn } from '@repo/utils'

// Feature imports
import { useSession } from '@/app/_features/auth/hooks/useSession'
import { createProject } from '@/app/_features/projects/actions'

// Infrastructure imports
import { createServerClient } from '@/libs/supabase/server'
import { sendEmail } from '@/app/_lib/email'
```

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
