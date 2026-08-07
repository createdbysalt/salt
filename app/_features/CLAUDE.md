# Feature Modules Guide

**Context:** You are working with domain-driven feature modules.
**Architecture:** Self-contained features with actions, queries, components, and hooks.

---

## 🎨 Design System for Feature Components

When building components in `_features/[domain]/components/`, consult:

| Doc | Purpose |
|-----|---------|
| `docs/guides/agent-component-guide.md` | **START HERE** - Quick reference |
| `docs/guides/component-cookbook.md` | Real-world patterns and examples |
| `docs/guides/integration-patterns.md` | Server Actions, forms, loading states |

**Key Rules:**
- Import primitives from `@repo/ui` (Button, Card, Input, etc.)
- Import patterns from `@repo/patterns` (PageHeader, FilterBar, EmptyState)
- Use semantic colors only (`bg-primary`, not `bg-blue-500`)
- Always handle loading states with `Skeleton`
- Always handle empty states with `EmptyState`

---

## Memory record Activity parity

**Rule:** Overview sections and editable fields must also emit Activity timeline events. See **`docs/guides/memory-activity-parity.md`** for the checklist, work reference table, and files to touch.

Work pattern: provenance fields → `getWorkActivity`; structured surfaces (blockers, tags, …) → mappers in `work/utils/activity.ts` + `getWorkSupplementalActivity` → `WorkActivityTab`.

---

## Feature Structure

Each feature follows this structure:

```
_features/[feature]/
├── actions.ts          # Server Actions (mutations)
├── queries.ts          # Data fetching functions
├── components/         # Feature-specific UI components
├── hooks/              # React hooks (client-side state)
├── types.ts            # Feature-specific types
└── utils.ts            # Feature-specific utilities
```

## Available Features

| Feature | Purpose |
|---------|---------|
| `hq` | Daily operating home, inbox, insights, dashboard analytics actions |
| `plays` | Approval outbox, playbooks, players, capture stream in Activity |
| `people` | People CRUD, profile fields, activity |
| `connections` | Memory Map graph (`/memory`) + per-record Connections tabs |
| `spaces` | Role-aware shared workspaces |
| `work` | Work and project memory |
| `meetings` | Meeting intelligence |
| `shell` | App shell, sidebar, command palette, routes |
| `auth` | Authentication, authorization, session management |
| `billing` | **Client** invoices/payments (`billing_records`). Salt's own SaaS metering lives in `app/_lib/usage/` — see `docs/architecture/billing-metering.md` |
| `messaging` | Comments, conversations |
| `relationships` | Shared relationship components/actions (legacy infra) |
| `capture` | Capture stream components (used inside Plays) |
| `intelligence` | Ambient intelligence generators, feed actions |
| `marketing` | Public marketing pages and components |
| `onboarding` | Setup and onboarding flows |

## Server Action Pattern

```typescript
// _features/people/actions.ts
"use server"

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/app/_lib/supabase/server'
import { getSession } from '@/app/_features/auth/queries'

const UpdatePersonSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
})

export async function updatePerson(input: z.infer<typeof UpdatePersonSchema>) {
  const data = UpdatePersonSchema.parse(input)

  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const supabase = await createServerClient()
  const { data: person, error } = await supabase
    .from('people')
    .update({ display_name: data.displayName })
    .eq('id', data.id)
    .select()
    .single()

  if (error) throw error

  revalidatePath('/people')
  revalidatePath(`/people/${data.id}`)

  return person
}
```

## Query Pattern

```typescript
// _features/people/queries.ts
import { cache } from 'react'
import { createServerClient } from '@/app/_lib/supabase/server'

export const getPeople = cache(async (workspaceId: string) => {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
})
```

## Cross-Feature Imports

Features can import from other features:

```typescript
// _features/billing/actions/
import { getSession } from '@/app/_features/auth/queries'

export async function createSubscription(planId: string) {
  const session = await getSession()
  // ... billing logic
}
```

## Component Pattern

```typescript
// _features/people/components/PersonCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui/card'
import type { Person } from '../types'

interface PersonCardProps {
  person: Person
  onEdit?: () => void
}

export function PersonCard({ person, onEdit }: PersonCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{person.display_name}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* ... */}
      </CardContent>
    </Card>
  )
}
```

## Rules

1. **Self-Contained**: Features should not depend on route-specific code
2. **Cross-Feature OK**: Features can import from other features
3. **No Circular Deps**: Avoid A imports B imports A
4. **Infrastructure in _lib**: Technical utilities go in `_lib/`, not features
5. **Types Collocated**: Feature types live in the feature, not in global types/
