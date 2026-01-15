# Studio Dashboard Guide

**Context:** You are working within the internal studio dashboard for authenticated users.
**Architecture:** Workspace-scoped routes, session-based auth, full platform access.

## Route Structure

```
(user_dashboard)/
├── layout.tsx                    # Dashboard chrome (sidebar, nav)
├── dashboard/
│   ├── overview/                 # Dashboard home
│   ├── projects/                 # Project management
│   │   ├── page.tsx              # List projects
│   │   ├── new/                  # Create project
│   │   └── [id]/                 # Project detail/edit
│   ├── clients/                  # Client management
│   ├── settings/                 # User & workspace settings
│   ├── intelligence/             # AI features
│   ├── insights/                 # Analytics
│   └── meetings/                 # Calendar integration
```

## Authentication

All routes in this group require session authentication:

```typescript
// Middleware handles auth redirect
// In components, get session:
import { getSession } from '@/app/_features/auth/queries'

export default async function Page() {
  const session = await getSession()
  if (!session) redirect('/signin')
  // ...
}
```

## Workspace Context

Routes are workspace-scoped. Always check workspace membership:

```typescript
import { getTenantContext } from '@/libs/tenancy/context'

export default async function ProjectsPage() {
  const tenant = await getTenantContext()

  // Use tenant.workspaceId for queries
  const projects = await getProjects(tenant.workspaceId)
  // ...
}
```

## Data Fetching Pattern

Use Server Components for data fetching:

```typescript
// app/(user_dashboard)/dashboard/projects/page.tsx
import { getProjects } from '@/app/_features/projects/queries'
import { getTenantContext } from '@/libs/tenancy/context'
import { ProjectList } from '@/app/_features/projects/components/ProjectList'

export default async function ProjectsPage() {
  const tenant = await getTenantContext()
  const projects = await getProjects(tenant.workspaceId)

  return <ProjectList projects={projects} />
}
```

## Mutations via Server Actions

Use actions from `_features/` for mutations:

```typescript
// In a Client Component
"use client"

import { createProject } from '@/app/_features/projects/actions'

export function CreateProjectForm() {
  const handleSubmit = async (formData: FormData) => {
    await createProject({
      name: formData.get('name') as string,
      workspaceId: workspaceId,
    })
  }

  return <form action={handleSubmit}>...</form>
}
```

## UI Components

Import from packages for consistency:

```typescript
import { Button, Card, Input } from '@repo/ui'
import { PageHeader, FilterBar } from '@repo/patterns'
```

## Security Rules

1. **Always verify session** before sensitive operations
2. **Check workspace membership** for workspace-scoped data
3. **Use RLS policies** as the final guard (Supabase)
4. **Never expose internal IDs** in URLs unnecessarily

## Do's and Don'ts

### Do:
- Use workspace context for all queries
- Import actions from `_features/`
- Use Server Components for data fetching
- Show loading states with Suspense

### Don't:
- Embed business logic in route handlers
- Skip workspace validation
- Use client-side fetching when Server Components work
- Create new API routes for internal operations
