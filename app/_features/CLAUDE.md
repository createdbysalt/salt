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
| `auth` | Authentication, authorization, session management |
| `billing` | Stripe subscriptions, payments, invoices |
| `workspace` | Studio/workspace management, settings |
| `projects` | Project CRUD, project-level operations |
| `messaging` | Comments, conversations, notifications |
| `portal` | Client bridge features, document sharing |
| `seo` | SEO audits, site analysis |
| `calendar` | Google Calendar integration |

## Server Action Pattern

```typescript
// _features/projects/actions.ts
"use server"

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/libs/supabase/server'
import { getSession } from '@/app/_features/auth/queries'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  workspaceId: z.string().uuid(),
})

export async function createProject(input: z.infer<typeof CreateProjectSchema>) {
  // 1. Validate input
  const data = CreateProjectSchema.parse(input)

  // 2. Check auth
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // 3. Perform mutation
  const supabase = await createServerClient()
  const { data: project, error } = await supabase
    .from('projects')
    .insert({ ...data, created_by: session.user.id })
    .select()
    .single()

  if (error) throw error

  // 4. Revalidate cache
  revalidatePath(`/dashboard/${data.workspaceId}/projects`)

  return project
}
```

## Query Pattern

```typescript
// _features/projects/queries.ts
import { cache } from 'react'
import { createServerClient } from '@/libs/supabase/server'

export const getProjects = cache(async (workspaceId: string) => {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
})

export const getProject = cache(async (id: string) => {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
})
```

## Cross-Feature Imports

Features can import from other features:

```typescript
// _features/billing/actions.ts
import { getSession } from '@/app/_features/auth/queries'
import { sendNotification } from '@/app/_features/messaging/notifications'

export async function createSubscription(planId: string) {
  const session = await getSession()
  // ... billing logic
  await sendNotification(session.user.id, 'subscription_created')
}
```

## Component Pattern

```typescript
// _features/projects/components/ProjectCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui'
import type { Project } from '../types'

interface ProjectCardProps {
  project: Project
  onEdit?: () => void
}

export function ProjectCard({ project, onEdit }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
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
