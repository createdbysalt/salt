# Phase 0: Foundations - Complete ✅

## What Was Built

### 1. Route Group Architecture
- Created `app/(core_marketing_site)`, `app/(user_dashboard)`, `app/(client_bridge)` route groups
- Moved dashboard to `app/(user_dashboard)/dashboard`
- Set up clean separation for three distinct experiences

### 2. Centralized Tenant/Permissions Layer (`libs/tenancy/*`)
**Files created:**
- `libs/tenancy/types.ts` - Core tenant types (ActorType, TenantContext, TenantRole)
- `libs/tenancy/context.ts` - Tenant resolution logic (the "single source of truth")
- `libs/tenancy/guards.ts` - Server-side guard functions (requireStudioMember, requireClientUser)
- `libs/tenancy/index.ts` - Central export

**Key Features:**
- Determines if user is `studioMember | clientUser | anonymous`
- Resolves context from host/path (e.g., app.saltcore.dev vs bridge.saltcore.dev)
- Loads studio or client context from database
- Returns `TenantResolution` with access decision + optional redirect

**Safety Rail:**
This prevents AI (and future developers) from re-implementing auth logic inconsistently. Every route MUST use `getTenantContext()`.

### 3. Centralized Permissions Layer (`libs/permissions/*`)
**Files created:**
- `libs/permissions/types.ts` - Permission types (ResourceType, Action, role hierarchy)
- `libs/permissions/checks.ts` - Role-based permission checks (`can()`, `hasMinRole()`)
- `libs/permissions/rls.ts` - RLS query helpers (`withStudioScope()`, `withTenantScope()`)
- `libs/permissions/index.ts` - Central export

**Key Features:**
- Implements Salt Core's role model: owner > admin > member > viewer
- Provides RLS helpers to scope Supabase queries
- Helper functions for verifying RLS is enabled (dev/test)

### 4. Multi-Tenant Database Schema
**Migration:** `supabase/migrations/20251228010000_multi_tenant_architecture.sql`

**Tables created:**
- `studios` - The Salt Core customers (devs/designers)
- `studio_members` - Team members within a studio (roles: owner/admin/member/viewer)
- `clients` - The studio's customers
- `client_users` - Users who can access the Bridge portal
- `projects` - Redefined with studio_id + client_id (multi-tenant)
- `bridge_portals` - One per client, stores theme/subdomain
- `portal_domains` - Custom domain support (Phase 4)

**RLS Policies:**
- Studio members can only see their studio's data
- Client users can only see their client's data
- Proper isolation enforced at database level

**Triggers:**
- Auto-create studio + studio_member on user signup
- Updates existing `handle_new_user()` function

**Helper Functions:**
- `get_user_studio_id()` - Get user's studio context
- `is_studio_member()` - Check studio membership
- `is_client_user()` - Check client membership

### 5. Enhanced Middleware
**File:** `middleware.ts`

**Features:**
- Refreshes Supabase auth session
- Resolves tenant context on every request
- Enforces access control (redirects if not allowed)
- Adds tenant metadata to headers for server components
- Works with both studio and client routes

### 6. GitHub + Linear Workflow
**Files created:**
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/ISSUE_TEMPLATE/improvement.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/LINEAR_GITHUB_WORKFLOW.md`

**Workflow established:**
- GitHub Issues for public/external reports
- Linear for internal planning (projects, sprints, roadmap)
- Twice-weekly triage ritual (25 min)
- Branch naming: `SC-{issue}-{description}`
- Conventional Commits format
- Standard PR gates: typecheck + lint + tests

---

## How This Enables Safe Agentic Building

### The "Safety Rails"
1. **Single tenant resolution path** - `libs/tenancy/context.ts` is the only way to resolve who is making a request
2. **RLS as backstop** - Even if app-level checks fail, database policies enforce isolation
3. **Type-safe permissions** - TypeScript ensures role checks are consistent
4. **Scoped queries** - `withTenantScope()` prevents accidental cross-tenant data leaks

### For AI/Cursor
When AI generates code:
- It MUST use `getTenantContext()` (not ad-hoc auth)
- It MUST use `withTenantScope()` for multi-tenant queries
- It MUST check permissions with `can()` or `requireMinRole()`
- Middleware catches errors before they hit routes

### Three Build Modes
1. **Architect Mode** - Ask AI to design before coding
2. **Implementer Mode** - Constrain AI with clear boundaries
3. **Reviewer Mode** - Ask AI to find security/perf issues

---

## Data Model (Current State)

```mermaid
erDiagram
    STUDIOS ||--o{ STUDIO_MEMBERS : has
    STUDIOS ||--o{ CLIENTS : owns
    STUDIOS ||--o{ PROJECTS : manages
    
    CLIENTS ||--o{ CLIENT_USERS : has
    CLIENTS ||--o{ PROJECTS : receives
    CLIENTS ||--|| BRIDGE_PORTALS : has
    
    BRIDGE_PORTALS ||--o{ PORTAL_DOMAINS : has
    
    STUDIOS {
        uuid id PK
        text name
        text slug UK
        uuid owner_id FK
        text stripe_customer_id
        text subscription_status
    }
    
    STUDIO_MEMBERS {
        uuid id PK
        uuid studio_id FK
        uuid user_id FK
        text role
    }
    
    CLIENTS {
        uuid id PK
        uuid studio_id FK
        text name
        text slug
        text status
    }
    
    CLIENT_USERS {
        uuid id PK
        uuid client_id FK
        uuid user_id FK
        text role
    }
    
    PROJECTS {
        uuid id PK
        uuid studio_id FK
        uuid client_id FK
        text name
        text status
    }
    
    BRIDGE_PORTALS {
        uuid id PK
        uuid client_id FK UK
        uuid studio_id FK
        text subdomain
        jsonb theme
    }
```

---

## What's Next (Phase 1+)

### Phase 1: Core Marketing Site
- Landing page with positioning
- Pricing page
- Docs/MDX setup
- Waitlist/lead capture

### Phase 2: User Dashboard MVP
- Studio onboarding flow
- Client CRUD
- Project CRUD
- Auto-provision Bridge on project create

### Phase 3: Client Bridge MVP
- Client sign-in
- Portal context resolution
- Project list/detail
- Request workflow

### Phase 4: Custom Domains
- Domain connect flow
- DNS verification
- SSL/TLS provisioning
- Host-based tenant resolution

---

## Testing the Foundation

### Verify Migration
```bash
# If using Supabase CLI locally:
supabase db reset

# Or push to remote:
supabase db push
```

### Verify Tenant Resolution
```typescript
import { getTenantContext } from "@/libs/tenancy";

export default async function Page() {
  const { context } = await getTenantContext();
  console.log("Actor type:", context.actorType);
  console.log("Studio:", context.studio);
  console.log("Client:", context.client);
  
  return <div>Check console</div>;
}
```

### Verify RLS
```typescript
import { createClient } from "@/libs/supabase/server";
import { getTenantContext } from "@/libs/tenancy";
import { withStudioScope } from "@/libs/permissions";

export default async function Page() {
  const { context } = await getTenantContext();
  const supabase = await createClient();
  
  // This query is automatically scoped to user's studio via RLS
  const query = supabase.from("clients").select("*");
  const scopedQuery = withStudioScope(query, context);
  const { data, error } = await scopedQuery;
  
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Tenant resolution | `libs/tenancy/context.ts` |
| Tenant guards | `libs/tenancy/guards.ts` |
| Permission checks | `libs/permissions/checks.ts` |
| RLS helpers | `libs/permissions/rls.ts` |
| Database schema | `supabase/migrations/20251228010000_multi_tenant_architecture.sql` |
| Middleware | `middleware.ts` |
| Workflow guide | `.github/LINEAR_GITHUB_WORKFLOW.md` |

---

## Checklist for Next Developer (or AI Agent)

Before starting Phase 1/2/3 work:
- [ ] Understand the tenant hierarchy: Studio → Clients → Projects
- [ ] Always use `getTenantContext()` for auth checks
- [ ] Always use `withTenantScope()` for multi-tenant queries
- [ ] Check RLS policies when adding new tables
- [ ] Follow the PR template checklist
- [ ] Keep PRs small (< 400 lines)
- [ ] Test with different user types (studio member vs client user)

---

**Phase 0 Status:** ✅ Complete  
**Next Phase:** Phase 1 (Core Marketing Site) or Phase 2 (User Dashboard MVP)  
**Last Updated:** December 28, 2025  
**Owner:** Gabriella Martins

