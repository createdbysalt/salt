# Full-Stack Next.js Migration - File Mapping

## Packages Migration (Phase 1.5 - NEW)

### Foundation Packages (P1)

```
# @repo/utils
FROM: libs/cn.ts                    → packages/utils/src/cn.ts
FROM: lib/utils.ts                  → DELETE (duplicate)
FROM: libs/rate-limit.ts            → packages/utils/src/rate-limit.ts

# @repo/shared-types
FROM: types/config.ts               → packages/shared-types/src/config.ts
FROM: libs/tenancy/types.ts         → packages/shared-types/src/tenancy.ts (types only)
FROM: libs/permissions/types.ts     → packages/shared-types/src/permissions.ts (types only)
KEEP: packages/shared-types/billing.ts (already exists)

# @repo/theme
FROM: libs/theme/types.ts           → packages/theme/src/types.ts
FROM: libs/theme/accent-presets.ts  → packages/theme/src/accent-presets.ts
FROM: libs/theme/resolve-theme.ts   → packages/theme/src/resolve-theme.ts

# @repo/security
FROM: libs/tokens.ts                → packages/security/src/tokens.ts
FROM: libs/safe-url.ts              → packages/security/src/safe-url.ts
FROM: libs/safe-redirect.ts         → packages/security/src/safe-redirect.ts
FROM: libs/calendar-encryption.ts   → packages/security/src/encryption.ts
```

### Component Packages (P2)

```
# @repo/ui (50+ components)
FROM: components/ui/*               → packages/ui/src/primitives/
EXAMPLE:
  components/ui/button.tsx          → packages/ui/src/primitives/button.tsx
  components/ui/dialog.tsx          → packages/ui/src/primitives/dialog.tsx
  components/ui/input.tsx           → packages/ui/src/primitives/input.tsx

# @repo/patterns (7 components)
FROM: components/patterns/app-shell.tsx      → packages/patterns/src/app-shell.tsx
FROM: components/patterns/page-header.tsx    → packages/patterns/src/page-header.tsx
FROM: components/patterns/empty-state.tsx    → packages/patterns/src/empty-state.tsx
FROM: components/patterns/filter-bar.tsx     → packages/patterns/src/filter-bar.tsx
FROM: components/patterns/confirm-dialog.tsx → packages/patterns/src/confirm-dialog.tsx
FROM: components/patterns/stat-card.tsx      → packages/patterns/src/stat-card.tsx
```

### Files NOT to Extract (Stay in app/_lib/)

```
# These violate "Library Laws" - they have app-specific dependencies
KEEP IN APP: libs/supabase/*        → app/_lib/supabase/  (Next.js headers)
KEEP IN APP: libs/tenancy/context.ts → app/_lib/tenancy/  (Supabase client)
KEEP IN APP: libs/tenancy/guards.ts  → app/_lib/tenancy/  (Business logic)
KEEP IN APP: libs/permissions/checks.ts → app/_lib/permissions/ (Business logic)
KEEP IN APP: libs/stripe*.ts         → app/_lib/stripe/   (Config imports)
KEEP IN APP: libs/*-emails.ts        → app/_features/emails/ (Templates)
KEEP IN APP: libs/gpt.ts             → app/_features/ai/  (App-specific)
KEEP IN APP: libs/seo/*              → app/_features/seo/ (Feature domain)
```

### Import Path Updates (193 files)

```typescript
// BEFORE (two different paths!)
import { cn } from "@/lib/utils"     // 53 files
import { cn } from "@/libs/cn"       // 140 files

// AFTER (single canonical path)
import { cn } from "@repo/utils"

// UI Component imports
// BEFORE
import { Button } from "@/components/ui/button"

// AFTER
import { Button } from "@repo/ui"
```

---

## Server Actions Migration

### From Route-Embedded to Domain Features

#### Client Bridge Feature Migration
```
FROM: app/(client_bridge)/requests/actions.ts
TO:   app/_features/messaging/actions.ts (comment functionality)

FROM: app/(client_bridge)/files/actions.ts
TO:   app/_features/portal/actions.ts (document management)

FROM: app/(client_bridge)/select/actions.ts
TO:   app/_features/portal/actions.ts (client selection)

FROM: app/bridge/verify/actions.ts
TO:   app/_features/portal/magic-links.ts (verifyMagicLink)

FROM: app/bridge/requests/actions.ts
TO:   app/_features/messaging/actions.ts (merge with above)

FROM: app/bridge/files/actions.ts
TO:   app/_features/portal/actions.ts (merge with above)
```

#### Workspace Feature Migration
```
FROM: app/(user_dashboard)/dashboard/clients/new/actions.ts
TO:   app/_features/workspace/actions.ts (createClient)

FROM: app/(user_dashboard)/dashboard/clients/[id]/actions.ts
TO:   app/_features/workspace/actions.ts (updateClient, deleteClient)

FROM: app/(user_dashboard)/dashboard/settings/domains/actions.ts
TO:   app/_features/workspace/actions.ts (updateDomains)

FROM: app/(user_dashboard)/dashboard/overview/actions/*
TO:   app/_features/workspace/queries.ts (dashboard data fetching)
```

#### Projects Feature Migration
```
FROM: app/(user_dashboard)/dashboard/projects/new/actions.ts
TO:   app/_features/projects/actions.ts (createProject)

FROM: app/(user_dashboard)/dashboard/projects/[id]/*/actions.ts
TO:   app/_features/projects/actions.ts (all project operations)
```

#### Auth Components Migration
```
FROM: app/signin/page.tsx (login form component)
TO:   app/_features/auth/components/LoginForm.tsx

FROM: Various auth hooks scattered in codebase
TO:   app/_features/auth/hooks/useSession.ts
      app/_features/auth/hooks/usePermissions.ts
```

## API Routes Migration

### Routes to Convert to Server Actions

```
FROM: app/api/user/settings/route.ts
TO:   app/_features/workspace/actions.ts
UPDATE: Direct form action instead of API call

FROM: app/api/stripe/create-checkout/route.ts
TO:   app/_features/billing/actions.ts (createCheckoutSession)
UPDATE: Server Action with redirect

FROM: app/api/stripe/create-portal/route.ts
TO:   app/_features/billing/actions.ts (createCustomerPortal)
UPDATE: Server Action with redirect

FROM: app/api/lead/route.ts
TO:   app/_features/auth/actions.ts (captureLead)
UPDATE: Form action on landing page

FROM: app/api/cron/seo-audits/route.ts
TO:   Keep as API route (needed for Vercel Cron)
      But move logic to: app/_features/projects/seo-audit.ts
```

### Routes to Keep (Webhooks/External)

```
KEEP: app/api/webhook/stripe/route.ts
KEEP: app/api/webhook/stripe-connect/route.ts
KEEP: app/api/auth/callback/route.ts
KEEP: app/api/calendar/google/callback/route.ts
KEEP: app/api/calendar/google/start/route.ts
KEEP: app/api/auth/dev-login/route.ts (if needed for dev)
KEEP: app/api/cron/seo-audits/route.ts (Vercel Cron)
```

## Route Structure Migration

### Public Routes (Including Auth)
```
FROM: app/signin/
TO:   app/(public)/login/

FROM: app/dev-login/
TO:   app/(public)/login/dev/ (if keeping dev login)

FROM: app/blog/
TO:   app/(public)/blog/

FROM: app/privacy-policy/
TO:   app/(public)/privacy-policy/

FROM: app/playground/
TO:   app/(public)/playground/

ADD:  app/(public)/page.tsx (landing page - move root page.tsx)
ADD:  app/(public)/portal/page.tsx (client portal entry)
ADD:  app/(public)/signup/page.tsx (if not exists)
```

### User Dashboard Routes (Internal Studio)
```
FROM: app/(user_dashboard)/dashboard/overview/
TO:   app/(user_dashboard)/page.tsx (dashboard home)

FROM: app/(user_dashboard)/dashboard/settings/
TO:   app/(user_dashboard)/settings/

FROM: app/(user_dashboard)/dashboard/projects/*
TO:   app/(user_dashboard)/[workspaceId]/projects/*

FROM: app/(user_dashboard)/dashboard/clients/*
TO:   app/(user_dashboard)/[workspaceId]/clients/*

FROM: app/(user_dashboard)/dashboard/intelligence/*
TO:   app/(user_dashboard)/[workspaceId]/intelligence/*

FROM: app/(user_dashboard)/dashboard/insights/*
TO:   app/(user_dashboard)/[workspaceId]/insights/*

ADD:  app/(user_dashboard)/workspaces/page.tsx (workspace management)
```

### Client Bridge Routes (External Client Access)
```
FROM: app/(client_bridge)/*
TO:   app/(client_bridge)/[token]/*

FROM: app/bridge/*
TO:   app/(client_bridge)/[token]/* (merge duplicates)

EXAMPLE MAPPINGS:
  FROM: app/(client_bridge)/projects/[id]/
  TO:   app/(client_bridge)/[token]/page.tsx (portal home shows projects)

  FROM: app/(client_bridge)/files/
  TO:   app/(client_bridge)/[token]/documents/

  FROM: app/(client_bridge)/messages/
  TO:   app/(client_bridge)/[token]/comments/

  FROM: app/(client_bridge)/invoices/
  TO:   app/(client_bridge)/[token]/invoices/

ADD:  app/(client_bridge)/[token]/approvals/ (new approval workflows)
```

### Legacy Routes
```
FROM: app/legacy/*
TO:   Analyze each route:
      - If platform feature → merge into (user_dashboard)
      - If deprecated → DELETE
      - If client feature → merge into (client_bridge)
```

## Component Updates Required

### Import Path Updates

#### Feature-Based Imports
```typescript
// OLD - Scattered imports
import { createClient } from './actions'
import { useAuth } from '../../../hooks/useAuth'
import { LoginForm } from '../../components/LoginForm'

// NEW - Feature-based imports
import { createClient } from '@/app/_features/workspace/actions'
import { useSession } from '@/app/_features/auth/hooks/useSession'
import { LoginForm } from '@/app/_features/auth/components/LoginForm'
```

#### API Call Conversions
```typescript
// OLD - Client Component with API call
async function handleSubmit(data) {
  const res = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

// NEW - Feature-based Server Action
import { createCheckoutSession } from '@/app/_features/billing/actions'

<form action={createCheckoutSession}>
  <button type="submit">Checkout</button>
</form>
```

#### Cross-Feature Imports
```typescript
// Features can import from other features
import { getSession } from '@/app/_features/auth/queries'
import { sendNotification } from '@/app/_features/messaging/notifications'

// Infrastructure imports
import { db } from '@/app/_lib/db'
import { uploadFile } from '@/app/_lib/storage'
```

## Layout Files to Update

```
FROM: app/(user_dashboard)/layout.tsx
TO:   app/(user_dashboard)/layout.tsx (dashboard chrome with sidebar)

FROM: app/(client_bridge)/layout.tsx
TO:   app/(client_bridge)/layout.tsx (clean portal layout)

FROM: app/bridge/layout.tsx
TO:   MERGE into portal layout

CREATE: app/(public)/layout.tsx (minimal layout for marketing/auth)
UPDATE: app/layout.tsx (root layout - keep minimal)
```

## Middleware Updates

```typescript
// Update path matchers in middleware.ts
// OLD
matcher: [
  '/dashboard/:path*',
  '/(user_dashboard)/:path*',
  '/bridge/:path*',
  '/(client_bridge)/:path*'
]

// NEW
matcher: [
  '/(user_dashboard)/:path*',    // Session-based auth (studio)
  '/(client_bridge)/:path*'       // Token-based auth (clients)
]

// Different auth strategies
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith('/(user_dashboard)')) {
    // Check Supabase session
    return handleStudioAuth(req);
  }

  if (path.startsWith('/(client_bridge)')) {
    // Verify client token
    return handleClientAuth(req);
  }
}
```

## Environment Variables

No changes needed - Server Actions have access to all env vars

## Database/Supabase Updates

No changes - Server Actions use same Supabase client

## File Organization After Migration

```
app/
├── (user_dashboard)/                # Internal user dashboard
│   ├── layout.tsx            # Dashboard chrome (nav, sidebar)
│   ├── page.tsx              # Dashboard home
│   ├── workspaces/           # Workspace management
│   │   ├── page.tsx          # List workspaces
│   │   └── new/
│   ├── settings/             # Platform settings
│   │   ├── profile/
│   │   ├── billing/
│   │   └── domains/
│   └── [workspaceId]/        # Workspace-specific routes
│       ├── page.tsx          # Workspace overview
│       ├── projects/
│       ├── clients/
│       ├── analytics/
│       ├── insights/
│       └── intelligence/
│
├── (client_bridge)/                  # External client portal
│   ├── layout.tsx            # Clean portal layout
│   ├── error.tsx             # Portal error handling
│   └── [token]/              # Token-based access
│       ├── page.tsx          # Portal home
│       ├── documents/
│       ├── approvals/
│       ├── comments/
│       └── invoices/
│
├── (public)/                  # Marketing/auth
│   ├── layout.tsx            # Minimal layout
│   ├── page.tsx              # Landing page
│   ├── login/                # Studio login
│   ├── signup/               # Studio signup
│   ├── portal/               # Client portal entry
│   ├── blog/
│   └── privacy-policy/
│
├── _features/                 # Domain-driven feature modules
│   ├── auth/
│   │   ├── actions.ts        # Login, logout, register
│   │   ├── queries.ts        # Get session, user profile
│   │   ├── components/       # LoginForm, AuthGuard
│   │   ├── hooks/            # useSession, usePermissions
│   │   └── utils.ts          # Token generation, validation
│   │
│   ├── billing/
│   │   ├── actions.ts        # Subscription management
│   │   ├── queries.ts        # Get invoices, usage
│   │   ├── components/       # PricingTable, InvoiceList
│   │   ├── webhooks/         # Stripe webhook handlers
│   │   └── plans.ts          # Plan definitions
│   │
│   ├── workspace/
│   │   ├── actions.ts        # CRUD operations, settings
│   │   ├── queries.ts        # Get workspaces, members
│   │   ├── components/       # WorkspaceSelector
│   │   └── permissions.ts    # Role-based access
│   │
│   ├── projects/
│   │   ├── actions.ts        # Project CRUD
│   │   ├── queries.ts        # List, search projects
│   │   ├── components/       # ProjectCard, ProjectForm
│   │   └── seo-audit.ts      # SEO functionality
│   │
│   ├── messaging/
│   │   ├── actions.ts        # Send messages, comments
│   │   ├── queries.ts        # Get conversations
│   │   ├── components/       # MessageThread, ChatInput
│   │   ├── realtime/         # WebSocket integration
│   │   └── notifications.ts  # Email/push notifications
│   │
│   └── portal/
│       ├── actions.ts        # Document, approval actions
│       ├── queries.ts        # Portal data fetching
│       ├── components/       # ApprovalFlow, DocumentViewer
│       └── magic-links.ts    # Token management
│
├── _lib/                      # Infrastructure (NOT features)
│   ├── db/                   # Database client
│   ├── email/                # Email service wrapper
│   ├── storage/              # S3/upload utilities
│   └── validations/          # Base Zod schemas
│
├── api/                       # Webhooks ONLY
│   ├── webhook/
│   │   ├── stripe/
│   │   └── stripe-connect/
│   ├── auth/
│   │   └── callback/         # OAuth
│   └── cron/
│       └── seo-audits/
│
├── layout.tsx                 # Root layout
├── globals.css                # Global styles
└── middleware.ts              # Auth middleware
```

## Webhook Integration Pattern

### How Webhooks Use Feature Modules

```typescript
// app/api/webhook/stripe/route.ts
import { handleSubscriptionUpdate } from '@/app/_features/billing/webhooks'
import { verifyStripeSignature } from '@/app/_features/billing/utils'

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  const event = verifyStripeSignature(body, signature)

  // Delegate to feature module
  switch (event.type) {
    case 'checkout.session.completed':
      return handleSubscriptionUpdate(event)
  }
}
```

### Feature Webhook Handlers

```typescript
// app/_features/billing/webhooks/index.ts
export async function handleSubscriptionUpdate(event: StripeEvent) {
  // All business logic lives in the feature
  const { updateSubscription } = await import('../actions')

  await updateSubscription({
    customerId: event.data.object.customer,
    status: 'active'
  })

  return Response.json({ received: true })
}
```

## CLAUDE.md File Examples

### app/(user_dashboard)/CLAUDE.md
```markdown
# 🏢 Studio Dashboard Guide

**Context:** You are working within the internal studio dashboard for authenticated users.
**Architecture:** Workspace-scoped routes, session-based auth, full platform access.

## 1. 🏗️ Dashboard Patterns

All routes are workspace-scoped:
- Use `[workspaceId]` dynamic segments
- Check workspace membership before operations
- Maintain workspace context in navigation

## 2. 🔐 Security

- Always verify session with `getSession()`
- Check workspace permissions
- Use RLS policies as final guard
```

### app/(client_bridge)/CLAUDE.md
```markdown
# 🌉 Client Bridge Guide

**Context:** You are working within the external client portal.
**Architecture:** Token-based auth, limited access, clean UI without internal navigation.

## 1. 🔑 Token Authentication

- All routes use `[token]` dynamic segment
- Verify token validity on every request
- Tokens expire after configurable period
- No session cookies here

## 2. 🎨 UI Patterns

- Clean, minimal layouts
- No workspace selector
- Limited navigation options
- Focus on client-relevant features
```

### app/_features/CLAUDE.md
```markdown
# 🧩 Feature Module Guide

**Context:** You are working with domain-driven feature modules.
**Architecture:** Self-contained features with actions, queries, components, and hooks.

## 1. 📦 Feature Structure

Each feature must have:
- `actions.ts` - Server mutations
- `queries.ts` - Data fetching
- `components/` - UI components
- `hooks/` - React hooks (optional)

## 2. 🔄 Cross-Feature Communication

Features can import from other features:
\```typescript
import { getSession } from '@/app/_features/auth/queries'
\```

But avoid circular dependencies.
```

## Critical Files Not to Touch

- `middleware.ts` - Update paths only
- `layout.tsx` (root) - Keep as is
- `globals.css` - No changes needed
- Any files outside of `/app`