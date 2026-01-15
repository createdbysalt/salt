# CLAUDE.md Placement Guide

## Purpose
Strategic placement of CLAUDE.md files throughout the codebase to provide AI assistants with contextual understanding and enforce architectural patterns.

## File Locations and Content

### 1. app/CLAUDE.md
**Purpose:** Root-level architecture and overall patterns

```markdown
# 📱 Salt Core Application Guide

**Context:** You are working within the Salt Core full-stack Next.js application.
**Architecture:** Full-stack Next.js 15 with App Router, Server Actions preferred over API routes, feature-based organization.

## 1. 🏗️ Application Structure

- `(user_dashboard)/` - Internal studio dashboard
- `(client_bridge)/` - External client portal
- `(public)/` - Marketing and auth pages
- `_features/` - Domain-driven feature modules
- `_lib/` - Infrastructure and utilities

## 2. 🔐 Authentication Patterns

Two distinct auth systems:
- **Studio**: Session-based (Supabase cookies)
- **Client Bridge**: Token-based (magic links)

## 3. 🚀 Development Standards

- Server Components by default
- Server Actions for mutations
- Direct Supabase access with RLS
- Feature modules for business logic
```

### 2. app/(user_dashboard)/CLAUDE.md
**Purpose:** Studio-specific patterns and behaviors

```markdown
# 🏢 Studio Dashboard Guide

**Context:** Internal dashboard for authenticated studio users.
**Architecture:** Workspace-scoped routes, session-based auth, full platform capabilities.

## 1. 🏗️ Workspace-Centric Design

All routes follow pattern: `[workspaceId]/feature`
- Projects belong to workspaces
- Clients belong to workspaces
- Always check workspace membership

## 2. 🔐 Security Requirements

```typescript
// Every page must verify session
const session = await getSession()
if (!session) redirect('/login')

// Check workspace access
const hasAccess = await checkWorkspaceAccess(workspaceId, session.user.id)
```

## 3. 🎨 UI Patterns

- Sidebar navigation with workspace selector
- Breadcrumb navigation
- Rich data tables with filtering
- Full CRUD operations
```

### 3. app/(client_bridge)/CLAUDE.md
**Purpose:** Client portal specific patterns

```markdown
# 🌉 Client Bridge Guide

**Context:** External portal for client access.
**Architecture:** Token-based auth, limited scope, clean minimal UI.

## 1. 🔑 Token-Based Access

All routes use: `/[token]/feature`
- Tokens are time-limited
- No cookies or sessions
- Verify token on every request

## 2. 🎨 UI Principles

- Minimal, clean interface
- No internal navigation exposed
- Limited to client-relevant features
- Read-heavy, limited mutations

## 3. 🚫 Restrictions

Never expose:
- Workspace switching
- Internal user data
- Admin features
- Platform settings
```

### 4. app/(public)/CLAUDE.md
**Purpose:** Public pages and authentication

```markdown
# 🌐 Public Pages Guide

**Context:** Marketing pages, auth flows, and public content.
**Architecture:** No auth required, SEO-optimized, performant.

## 1. 🏗️ Page Types

- `/` - Landing page
- `/login` - Studio authentication
- `/signup` - New studio users
- `/portal` - Client magic link entry
- `/blog` - Content marketing

## 2. 🎯 SEO Requirements

- Static generation where possible
- Metadata for all pages
- Structured data
- OpenGraph tags

## 3. 🔐 Auth Flows

Two distinct flows:
1. Studio users → `/login` → session cookie
2. Clients → `/portal` → magic link → token
```

### 5. app/_features/CLAUDE.md
**Purpose:** Feature module patterns

```markdown
# 🧩 Feature Module Guide

**Context:** Domain-driven feature modules.
**Architecture:** Self-contained business capabilities with clear boundaries.

## 1. 📦 Required Structure

```
feature/
├── actions.ts       # Server mutations
├── queries.ts       # Data fetching
├── components/      # UI components
├── hooks/           # React hooks
├── types.ts         # TypeScript types
└── utils.ts         # Helper functions
```

## 2. 🔄 Feature Principles

- Single business domain per feature
- Can import from other features
- Avoid circular dependencies
- Colocate related code

## 3. 📝 Example Feature

```typescript
// _features/billing/actions.ts
"use server"

import { getSession } from '@/app/_features/auth/queries'
import { createCheckoutSession as stripeCheckout } from './stripe'

export async function createCheckoutSession(planId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const checkoutUrl = await stripeCheckout({
    customerId: session.user.stripeId,
    planId
  })

  redirect(checkoutUrl)
}
```
```

### 6. app/_lib/CLAUDE.md
**Purpose:** Infrastructure and utilities

```markdown
# 🔧 Infrastructure Guide

**Context:** Technical infrastructure and utilities.
**Architecture:** Framework-agnostic utilities, service wrappers, base configurations.

## 1. 📁 Structure

- `db/` - Database client and utilities
- `email/` - Email service wrapper
- `storage/` - File upload utilities
- `validations/` - Base Zod schemas

## 2. ⚠️ Important Rules

- NO business logic here
- Only technical utilities
- Must work across features
- Minimal dependencies

## 3. 📝 Example

```typescript
// _lib/email/client.ts
import { Resend } from 'resend'

export const email = new Resend(process.env.RESEND_API_KEY)

// Simple wrapper, no business logic
export async function sendEmail(to: string, subject: string, html: string) {
  return email.emails.send({
    from: 'noreply@saltcore.io',
    to,
    subject,
    html
  })
}
```
```

### 7. app/api/CLAUDE.md
**Purpose:** API routes for webhooks only

```markdown
# 🔗 API Routes Guide

**Context:** Webhook handlers and external integrations.
**Architecture:** Minimal API routes, only for webhooks and OAuth callbacks.

## 1. ⚡ Webhook Pattern

```typescript
// api/webhook/stripe/route.ts
export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get('stripe-signature')

  // Verify webhook
  const event = verifyStripeWebhook(body, sig)

  // Delegate to feature
  const { handleWebhook } = await import('@/app/_features/billing/webhooks')
  return handleWebhook(event)
}
```

## 2. 🚫 Never Use API Routes For

- Internal data fetching
- User mutations
- File uploads
- Auth operations (except OAuth callbacks)

Use Server Actions instead!
```

### 8. packages/CLAUDE.md (Already Exists)
**Purpose:** Monorepo packages governance - "Library Laws"

Already documented in `packages/CLAUDE.md`. Key rules:
- Zero App Imports
- Barrel Export Pattern
- Raw TypeScript consumption

### 9. packages/ui/CLAUDE.md (NEW)
**Purpose:** UI component library patterns

```markdown
# 🎨 UI Component Library

**Context:** Shadcn-based UI primitives for salt-core.
**Role:** Provide reusable, accessible components.

## 1. Component Pattern

All components must:
- Use `@repo/utils` for cn()
- Export from barrel (index.ts)
- Include displayName for DevTools
- Support className prop for customization

## 2. Adding New Components

\`\`\`typescript
// packages/ui/src/primitives/my-component.tsx
import { cn } from '@repo/utils'

export function MyComponent({ className, ...props }) {
  return <div className={cn('base-styles', className)} {...props} />
}
MyComponent.displayName = 'MyComponent'
\`\`\`

Then add to index.ts.

## 3. Testing

Every component needs a test file.
```

---

## Implementation Notes

1. **Consistency**: All CLAUDE.md files follow the same structure
2. **Context First**: Always define the AI's role immediately
3. **Examples**: Include real code examples from the codebase
4. **Patterns**: Focus on patterns specific to that directory
5. **Warnings**: Clearly state what NOT to do

## Benefits

1. **Faster Onboarding**: AI understands context immediately
2. **Consistent Patterns**: Enforces architectural decisions
3. **Reduced Errors**: Clear do's and don'ts prevent mistakes
4. **Better Suggestions**: Context-aware code generation