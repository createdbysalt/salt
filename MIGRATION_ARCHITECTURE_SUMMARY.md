# Migration Architecture Summary

## Key Changes from Original Plan

### 1. Route Organization
- **(user_dashboard)** → Internal studio dashboard for authenticated users
- **(client_bridge)** → External portal for clients with token-based access
- **(public)** → Marketing pages, auth, and client portal entry

### 2. Feature-Driven Architecture
Instead of organizing by technical layer, we organize by business domain:

```
_features/
├── auth/         # Everything auth-related
├── billing/      # All billing functionality
├── workspace/    # Workspace management
├── projects/     # Project features
├── messaging/    # Comments, messages, realtime
└── portal/       # Client portal features
```

### 3. Key Patterns

#### Feature Module Structure
Each feature contains:
- **actions.ts** - Server Actions (mutations)
- **queries.ts** - Data fetching functions
- **components/** - UI components
- **hooks/** - React hooks
- **utils.ts** - Helper functions

#### Cross-Feature Communication
```typescript
// Features can import from other features
import { getSession } from '@/app/_features/auth/queries'
import { sendEmail } from '@/app/_features/messaging/notifications'
```

#### Infrastructure vs Features
- **_features/** - Business logic, domain-specific code
- **_lib/** - Technical infrastructure (database, email service, storage)

### 4. Authentication Split
- **User Dashboard (Studio)**: Session-based auth (Supabase cookies)
- **Client Bridge**: Token-based auth (magic links)

### 5. Workspace-Centric Studio
Studio dashboard routes are workspace-scoped:
```
/(user_dashboard)/[workspaceId]/projects
/(user_dashboard)/[workspaceId]/clients
```

### 6. API Routes Minimal
Only keep API routes for:
- Webhooks (Stripe, GitHub)
- OAuth callbacks
- Cron jobs
- Realtime auth

Everything else becomes Server Actions in feature modules.

## Benefits of This Architecture

1. **Domain Cohesion**: Related code lives together
2. **Feature Independence**: Easy to add/remove features
3. **Clear Boundaries**: Studio dashboard vs Client bridge separation
4. **Scalable**: Features can grow independently
5. **Testable**: Each feature is self-contained

## Migration Priority

1. **Phase 1**: Set up _features structure
2. **Phase 2**: Move auth to feature module (critical path)
3. **Phase 3**: Move billing (webhook dependencies)
4. **Phase 4**: Move workspace & projects
5. **Phase 5**: Move client bridge features
6. **Phase 6**: Clean up routes

## Critical Success Factors

✅ Test after each feature migration
✅ Update all imports immediately
✅ Keep features focused on one domain
✅ Don't split tightly coupled logic
✅ Maintain clear studio/client bridge separation