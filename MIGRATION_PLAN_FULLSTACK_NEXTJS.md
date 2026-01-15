# Full-Stack Next.js Migration Plan

## Executive Summary
Migrate from scattered API routes and mixed backend logic to a clean, organized full-stack Next.js architecture with Server Actions as the primary mutation method.

## Current State Analysis

> **Note:** Bridge duplication resolved - (client_bridge) deleted, only /bridge remains.
> Package migration (P1-P2) complete as of Jan 15, 2025.

### Existing Structure
```
app/
├── (user_dashboard)/    # Protected studio/admin routes
├── bridge/              # Client portal routes (consolidated)
├── api/                 # Mixed API routes (webhooks + internal)
├── blog/                # Public blog
├── signin/              # Auth route
├── legacy/              # Old dashboard
└── Various scattered actions.ts files
```

### Key Findings
1. **Scattered Server Actions**: actions.ts files mixed within route folders
2. **Mixed API Routes**: Both webhooks and internal data fetching in api/
3. **Multiple Dashboard Versions**: legacy still exists alongside user_dashboard
4. **Inconsistent Organization**: No clear separation of concerns

## Target Architecture

```
app/
├── (user_dashboard)/           # Internal user dashboard
│   ├── layout.tsx             # Dashboard chrome (nav, sidebar)
│   ├── page.tsx               # Dashboard home/overview
│   ├── workspaces/            # Workspace management
│   ├── settings/              # User/platform settings
│   └── [workspaceId]/         # Workspace-specific routes
│       ├── projects/
│       ├── clients/
│       ├── analytics/
│       ├── insights/
│       └── intelligence/
│
├── bridge/                     # External client portal (consolidated)
│   ├── layout.tsx             # Clean portal layout (no internal nav)
│   ├── [token]/               # Token-based access
│   │   ├── page.tsx           # Portal home
│   │   ├── documents/         # Shared files
│   │   ├── approvals/         # Approval workflows
│   │   ├── comments/          # Feedback/messages
│   │   └── invoices/          # Billing access
│   └── error.tsx              # Portal-specific errors
│
├── (public)/                   # Marketing/auth (shared)
│   ├── layout.tsx             # Minimal layout
│   ├── login/                 # Platform login
│   ├── signup/                # Platform signup
│   ├── portal/                # Portal entry (magic link)
│   ├── blog/                  # Public blog
│   ├── privacy-policy/        # Legal pages
│   └── page.tsx               # Landing page
│
├── _features/                  # Domain-driven feature modules
│   ├── auth/                  # Authentication feature
│   │   ├── actions.ts         # Login, logout, register
│   │   ├── queries.ts         # Get session, user profile
│   │   ├── components/        # LoginForm, AuthGuard
│   │   ├── hooks/             # useSession, usePermissions
│   │   └── utils.ts           # Token generation, password hashing
│   │
│   ├── billing/               # Billing & subscriptions
│   │   ├── actions.ts         # Create subscription, update payment
│   │   ├── queries.ts         # Get invoices, usage stats
│   │   ├── components/        # PricingTable, InvoiceList
│   │   ├── webhooks/          # Stripe webhook handlers
│   │   └── plans.ts           # Plan definitions, pricing logic
│   │
│   ├── workspace/             # Workspace management
│   │   ├── actions.ts         # Create, update, delete workspace
│   │   ├── queries.ts         # Get workspaces, members
│   │   ├── components/        # WorkspaceSelector, MemberList
│   │   └── permissions.ts     # Role-based access control
│   │
│   ├── projects/              # Project management
│   │   ├── actions.ts         # CRUD operations
│   │   ├── queries.ts         # List, filter, search
│   │   └── components/        # ProjectCard, ProjectForm
│   │
│   ├── messaging/             # Comments & communications
│   │   ├── actions.ts         # Send message, update status
│   │   ├── queries.ts         # Get conversations, messages
│   │   ├── components/        # MessageThread, ChatInput
│   │   ├── realtime/          # WebSocket/Pusher integration
│   │   └── notifications.ts   # Email/push notification logic
│   │
│   └── portal/                # Client portal features
│       ├── actions.ts         # Approvals, document actions
│       ├── queries.ts         # Portal-specific data fetching
│       ├── components/        # ApprovalFlow, DocumentViewer
│       └── magic-links.ts     # Token generation/validation
│
├── _lib/                       # Infrastructure (NOT features)
│   ├── db/                    # Database client, connection
│   ├── email/                 # Email service wrapper
│   ├── storage/               # S3/upload utilities
│   └── validations/           # Base Zod schemas
│
├── api/                        # External webhooks ONLY
│   ├── webhook/
│   │   ├── stripe/
│   │   └── github/
│   └── auth/
│       └── callback/
│
├── layout.tsx                  # Root layout
├── globals.css
└── middleware.ts
```

## Migration Phases

### Phase 1: Preparation & Testing Infrastructure (Day 1)
1. **Create Migration Tracking**
   - Set up migration checklist
   - Document all existing routes
   - Create test suite for critical paths

2. **Backup Current State**
   - Create app_backup/ folder
   - Copy entire app/ directory
   - Commit to feature branch

3. **Set Up Testing**
   - Write E2E tests for critical user flows
   - Test auth flow
   - Test data mutations
   - Test client portal access

### Phase 2: Create Domain Feature Structure (Days 2-3)
1. **Create Feature & Infrastructure Directories**
   ```
   # Feature modules
   mkdir -p app/_features/{auth,billing,workspace,projects,messaging,portal}
   mkdir -p app/_features/auth/{components,hooks}
   mkdir -p app/_features/billing/{components,webhooks}
   mkdir -p app/_features/workspace/components
   mkdir -p app/_features/projects/components
   mkdir -p app/_features/messaging/{components,realtime}
   mkdir -p app/_features/portal/components

   # Infrastructure
   mkdir -p app/_lib/{db,email,storage,validations}
   ```

2. **Extract & Organize by Feature** (ONE FEATURE AT A TIME)
   - Move related actions, queries, and components together
   - Group by business domain, not technical layer
   - Update imports to use feature modules
   - Test each feature after migration

3. **Migration Pattern**
   ```
   # Auth Feature
   OLD: app/(user_dashboard)/dashboard/clients/new/actions.ts (auth logic)
   NEW: app/_features/auth/actions.ts

   # Workspace Feature
   OLD: app/(user_dashboard)/dashboard/settings/domains/actions.ts
   NEW: app/_features/workspace/actions.ts

   # Portal Feature
   OLD: app/bridge/verify/actions.ts
   NEW: app/_features/portal/magic-links.ts

   # Messaging Feature
   OLD: app/(client_bridge)/messages/actions.ts
   NEW: app/_features/messaging/actions.ts
   ```

### Phase 3: Clean Up API Routes (Day 4)
1. **Categorize Existing API Routes**
   ```
   KEEP (External):
   - /api/webhook/stripe
   - /api/webhook/stripe-connect
   - /api/auth/callback
   - /api/calendar/google/callback

   CONVERT TO FEATURE ACTIONS:
   - /api/user/settings → _features/workspace/actions.ts
   - /api/stripe/create-checkout → _features/billing/actions.ts
   - /api/stripe/create-portal → _features/billing/actions.ts
   - /api/lead → _features/auth/actions.ts (lead capture)

   EVALUATE:
   - /api/cron/seo-audits (might need to stay for Vercel Cron)
   ```

2. **Convert Internal APIs to Server Actions**
   - One endpoint at a time
   - Update all references
   - Test thoroughly

### Phase 4: Reorganize Route Structure (Days 5-6)
1. **Create New Route Groups**
   ```bash
   # Create structure
   mkdir -p app/{platform,portal,public}
   mkdir -p app/(client_bridge)/[token]
   mkdir -p app/(user_dashboard)/[workspaceId]
   ```

2. **Move Routes** (IN THIS ORDER)
   ```
   Step 1: Public routes (including auth)
   - app/signin → app/(public)/login
   - app/blog → app/(public)/blog
   - app/privacy-policy → app/(public)/privacy-policy
   - app/playground → app/(public)/playground
   - Create app/(public)/portal for client entry

   Step 2: User dashboard routes (internal studio)
   - app/(user_dashboard)/dashboard/overview → app/(platform)/page.tsx
   - app/(user_dashboard)/dashboard/projects/* → app/(platform)/[workspaceId]/projects/*
   - app/(user_dashboard)/dashboard/clients/* → app/(platform)/[workspaceId]/clients/*
   - app/(user_dashboard)/dashboard/settings → app/(platform)/settings
   - Create app/(platform)/workspaces for workspace management

   Step 3: Client bridge routes (external clients)
   - app/(client_bridge)/* → app/(portal)/[token]/*
   - app/bridge/* → app/(portal)/[token]/*
   - Consolidate duplicate functionality
   - Implement token-based routing

   Step 4: Handle legacy
   - app/legacy/* → Remove if deprecated, or merge into platform
   ```

3. **Update Authentication Patterns**
   - User Dashboard: Session-based auth (Supabase)
   - Client Bridge: Token-based auth (magic links)
   - Update middleware for new paths

### Phase 5: Add CLAUDE.md Documentation (Day 7)
1. **Create Strategic CLAUDE.md Files**
   ```
   # Root app directory
   app/CLAUDE.md - Overall Next.js architecture and patterns

   # Route group specific
   app/(user_dashboard)/CLAUDE.md - Studio dashboard patterns
   app/(client_bridge)/CLAUDE.md - Client portal patterns
   app/(public)/CLAUDE.md - Marketing and auth patterns

   # Feature and infrastructure
   app/_features/CLAUDE.md - Feature module patterns
   app/_lib/CLAUDE.md - Infrastructure patterns

   # API specific
   app/api/CLAUDE.md - Webhook patterns
   ```

2. **CLAUDE.md Template Structure**
   ```markdown
   # [Icon] [Area] Guide

   **Context:** [Define AI's role in this directory]
   **Architecture:** [Key architectural decisions for this area]

   ## 1. 🏗️ [Area] Patterns

   [Code examples specific to this directory]

   ## 2. 🔄 [Specific Pattern]

   [More examples and patterns]

   ## 3. 🛡️ Best Practices

   [Do's and Don'ts for this area]
   ```

### Phase 6: Testing & Validation (Day 8)
1. **Comprehensive Testing**
   - Run full E2E test suite
   - Manual testing of all routes
   - Check auth flows
   - Verify Server Actions
   - Test webhooks

2. **Performance Check**
   - Build time comparison
   - Bundle size analysis
   - Runtime performance

3. **Clean Up**
   - Remove legacy folders
   - Update documentation
   - Clean up imports

## Feature Module Pattern

### Core Principle
Each feature is self-contained with everything it needs:

```typescript
// app/_features/billing/actions.ts
"use server";

import { getSession } from '@/app/_features/auth/queries';
import { sendInvoiceEmail } from './notifications';

export async function createSubscription(data: SubscriptionInput) {
  const session = await getSession(); // Cross-feature import

  // Billing logic here
  await sendInvoiceEmail(session.user.email);

  revalidatePath('/settings/billing');
}
```

### Feature Structure Guidelines
1. **Self-Contained**: Each feature has its own actions, queries, components, hooks
2. **Cross-Feature Imports**: Features can import from other features when needed
3. **Infrastructure Separation**: Technical utilities go in `_lib/`, not features
4. **Domain Grouping**: Group by business capability, not technical layer

### When to Create a New Feature
- It represents a distinct business capability
- It has its own data model and operations
- Multiple routes/pages use it
- It could theoretically be extracted into a service

### Realtime Integration Pattern
```typescript
// app/_features/messaging/realtime/client.ts
"use client";

import { createClient } from '@/app/_lib/realtime'; // Pusher/WebSocket wrapper

export function useRealtimeMessages(conversationId: string) {
  const channel = createClient().subscribe(`conversation.${conversationId}`);

  channel.on('message.new', (data) => {
    // Handle new message
  });

  return () => channel.unsubscribe();
}

// app/api/realtime/route.ts
import { handleRealtimeAuth } from '@/app/_features/messaging/realtime';

export async function POST(req: Request) {
  // Delegate auth to feature module
  return handleRealtimeAuth(req);
}
```

## Critical Migration Rules

### DO:
- ✅ Test after EVERY file move
- ✅ Keep app_backup/ until fully validated
- ✅ Update imports immediately after moves
- ✅ Maintain git history with proper commits
- ✅ Run `pnpm build` after each phase
- ✅ Group related functionality into features

### DON'T:
- ❌ Move multiple files at once
- ❌ Delete anything without testing
- ❌ Skip import updates
- ❌ Mix Server Actions with API routes
- ❌ Rush the migration
- ❌ Split tightly coupled logic across features

## Testing Checklist

### Before Each Phase:
- [ ] `pnpm build` passes
- [ ] `pnpm dev` works
- [ ] No TypeScript errors
- [ ] E2E tests pass

### Critical User Flows to Test:
1. **Authentication**
   - [ ] Sign in works
   - [ ] Sign out works
   - [ ] Protected routes redirect
   - [ ] Session persists

2. **Dashboard**
   - [ ] Overview loads
   - [ ] Projects CRUD works
   - [ ] Clients CRUD works
   - [ ] Settings save

3. **Client Portal**
   - [ ] Magic link login
   - [ ] Project access
   - [ ] Message functionality
   - [ ] File uploads

4. **Webhooks**
   - [ ] Stripe webhooks process
   - [ ] OAuth callbacks work

## Rollback Strategy

### If Issues Occur:
1. **Phase 1-2 Issues**: Revert individual Server Action moves
2. **Phase 3 Issues**: Restore API routes from backup
3. **Phase 4 Issues**: Restore entire app/ from app_backup/
4. **Critical Failure**: `git reset --hard` to pre-migration commit

### Rollback Commands:
```bash
# Restore from backup
cp -R app_backup/* app/

# Or git reset
git reset --hard pre-migration-commit-hash
```

## Success Metrics
- ✅ All routes accessible
- ✅ No 404 errors
- ✅ Server Actions working
- ✅ Webhooks processing
- ✅ Build succeeds
- ✅ No runtime errors
- ✅ E2E tests pass

## Post-Migration
1. Delete app_backup/
2. Update all documentation
3. Update CLAUDE.md files
4. Team training on new structure
5. Monitor for issues

## Notes
- This migration maintains all functionality
- Zero downtime approach
- Each phase is reversible
- Testing is mandatory