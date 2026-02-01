# Studio Dashboard Guide

**Context:** You are working within the internal studio dashboard for authenticated users.
**Architecture:** Workspace-scoped routes, session-based auth, full platform access.

---

## 🎨 Design System Quick Reference

**Before building ANY page, read these docs:**

| Priority | Doc | Purpose |
|----------|-----|---------|
| 1 | `docs/guides/agent-component-guide.md` | **START HERE** - AI decision trees |
| 2 | `docs/guides/page-templates.md` | ListPage, DetailPage, FormPage skeletons |
| 3 | `docs/guides/component-cookbook.md` | Real-world usage examples |
| 4 | `docs/guides/integration-patterns.md` | Server Actions, Suspense, forms |

---

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

## Page Header System (MANDATORY)

**All dashboard pages MUST use one of the two standardized header components.**

### Decision Tree: Which Header to Use?

```
Is this a MAIN LIST PAGE (Clients, Projects, Proposals, Messages, etc.)?
├── YES → Use PageGreetingHeader (animated greeting + rotating subtitle)
└── NO → Is this a DETAIL PAGE (Client Detail, Project Detail, etc.)?
    ├── YES → Use PageHeader (static title + optional description)
    └── NO → Is this a FORM PAGE (New Client, New Project, Edit, etc.)?
        └── YES → Use PageHeader with breadcrumbs
```

### Component 1: PageHeader (Static Headers)

**Use for:** Detail pages, forms, settings, sub-pages

```typescript
import { PageHeader } from '@repo/patterns'

// Basic usage
<PageHeader
  title="New Project"
  description="Create a new project for a client"
  noBorder
/>

// With breadcrumbs (for sub-pages)
<PageHeader
  title="Knowledge Base"
  description="12 items for Acme Corp"
  breadcrumbs={
    <Link href="/dashboard/clients/123">← Back to Acme Corp</Link>
  }
  noBorder
/>

// With actions (for pages with primary action)
<PageHeader
  title="Project Settings"
  description="Configure project preferences"
  actions={<Button>Save Changes</Button>}
/>

// Dynamic title (for entity detail pages)
<PageHeader
  title={client.name}
  description={client.email || undefined}
/>
```

### Component 2: PageGreetingHeader (Animated Greetings)

**Use for:** Main list pages where users spend time (Clients, Projects, etc.)

**Features:**
- Time-based greeting ("Good morning, Sarah")
- Rotating subtitles from `brand-identity/voice/greetings.md`
- Staggered word animation (respects prefers-reduced-motion)
- LocalStorage-based rotation to avoid repetition

```typescript
import { PageGreetingHeader } from '@/app/_components/patterns/page-greeting-header'

// Standard list page with greeting
<PageGreetingHeader
  page="clients"          // Must match GreetingPageKey type
  viewer={{ firstName: 'Sarah' }}
  variant="dashboard"
  mode="greeting"         // Shows "Good morning, Sarah"
/>

// Title mode (page name instead of greeting)
<PageGreetingHeader
  page="clients"
  variant="dashboard"
  mode="title"           // Shows "Clients" instead of greeting
/>
```

**Valid page keys:** `overview`, `clients`, `projects`, `proposals`, `tasks`,
`meetings`, `insights`, `intakes`, `studio`, `settings`, `support`, `inbox`

### Greetings Content Location

Greetings are defined in two places:

1. **Content Catalog:** `brand-identity/voice/greetings.md`
   - Philosophy and guidelines
   - All greeting variations per page
   - Research and rationale

2. **Implementation:** `app/_features/shell/greetings/greetings.ts`
   - Page titles and subtitles arrays
   - Time bucket logic
   - Subtitle rotation logic

**To add greetings for a new page:**
1. Add page key to `GreetingPageKey` type
2. Add title to `dashboardPageTitles`
3. Add subtitles array to `dashboardSubtitles`
4. Update `brand-identity/voice/greetings.md`

### Typography Standard (Linear-inspired)

Both components use identical typography:
- **Title:** 20px, font-weight 500, tracking-tight
- **Description/Subtitle:** 14px, text-muted-foreground

This is defined in:
- `packages/patterns/src/page-header.tsx` (PageHeader)
- `app/_components/patterns/page-greeting-header.tsx` (PageGreetingHeader)

### ❌ NEVER Use Inline Headers

```typescript
// ❌ WRONG - inconsistent, hard to maintain
<h1 className="text-3xl font-bold">Clients</h1>
<h1 className="text-4xl font-medium tracking-tight">Projects</h1>
<h1 className="text-2xl font-semibold">Settings</h1>

// ✅ CORRECT - consistent, maintainable
<PageHeader title="Settings" />
<PageGreetingHeader page="clients" variant="dashboard" />
```

### Quick Reference Table

| Page Type | Component | Example |
|-----------|-----------|---------|
| Main list (Clients, Projects) | PageGreetingHeader | `page="clients"` |
| Detail view (Client detail) | PageHeader | `title={client.name}` |
| Sub-page (Knowledge Base) | PageHeader + breadcrumbs | `breadcrumbs={<Link>}` |
| Form (New Project) | PageHeader | `title="New Project"` |
| Settings pages | PageHeader or PageGreetingHeader | Depends on depth |

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
