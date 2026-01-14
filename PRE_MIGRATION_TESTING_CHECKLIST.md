# Pre-Migration Testing Checklist

## Before You Start

### Environment Setup
- [ ] Create feature branch: `git checkout -b fullstack-nextjs-migration`
- [ ] Ensure clean working directory: `git status`
- [ ] Run initial build: `npm run build`
- [ ] Start dev server: `npm run dev`
- [ ] Note any existing errors/warnings

### Backup Creation
- [ ] Create backup directory: `cp -R app app_backup`
- [ ] Create second backup: `cp -R app app_backup_original`
- [ ] Commit backups: `git add app_backup && git commit -m "backup: original app structure"`

## Current State Documentation

### Route Inventory
Create a file `ROUTE_INVENTORY.md` documenting:

#### Public Routes
- [ ] `/` - Homepage
- [ ] `/blog/*` - Blog posts
- [ ] `/privacy-policy`
- [ ] `/signin`
- [ ] `/playground/*`

#### Protected Routes (Studio/Admin)
- [ ] `/dashboard/overview`
- [ ] `/dashboard/projects`
- [ ] `/dashboard/clients`
- [ ] `/dashboard/settings`
- [ ] `/dashboard/intelligence`
- [ ] `/dashboard/insights`
- [ ] `/dashboard/meetings`
- [ ] `/dashboard/messages`

#### Client Portal Routes
- [ ] `/bridge/*` routes
- [ ] `/(client_bridge)/*` routes
- [ ] Client-specific project access
- [ ] Invoice pages

#### API Routes
- [ ] List all `/api/*` endpoints
- [ ] Categorize as webhook vs internal
- [ ] Note authentication requirements

## Automated Tests

### E2E Test Creation
```bash
# Create these E2E tests BEFORE migration
tests/e2e/
├── auth.spec.ts                # Studio sign in/out flows
├── workspace.spec.ts           # Workspace management
├── studio-projects.spec.ts     # Project CRUD in studio
├── studio-clients.spec.ts      # Client management
├── client-bridge-access.spec.ts  # Token-based client access
├── client-bridge-features.spec.ts # Documents, approvals, comments
└── api-webhooks.spec.ts        # Webhook endpoints
```

### Test Coverage Requirements
- [ ] Studio auth flow (signin, signout, session)
- [ ] Workspace creation and switching
- [ ] Studio dashboard data loading
- [ ] Create new project (within workspace)
- [ ] Edit existing project
- [ ] Delete project
- [ ] Create new client
- [ ] Client bridge access via magic link
- [ ] Client token validation
- [ ] Document uploads in client bridge
- [ ] Approval workflows
- [ ] Comment/message functionality
- [ ] Stripe webhook processing

## Manual Testing Scripts

### 1. Studio Authentication Flow
```
1. Navigate to /(public)/login
2. Sign in with test account
3. Verify redirect to /(user_dashboard)
4. Check session cookie exists
5. Navigate to workspace-specific route
6. Verify workspace context maintained
7. Sign out
8. Verify redirect to login
9. Try accessing /(user_dashboard) route (should redirect)
```

### 2. Studio Dashboard Operations
```
1. Load /(user_dashboard) (dashboard home)
2. Check workspace selector works
3. Navigate to /(user_dashboard)/workspaces
4. Create new workspace
5. Switch to workspace
6. Navigate to /(user_dashboard)/[workspaceId]/projects
7. Create new project in workspace
8. Edit project details
9. Navigate to /(user_dashboard)/[workspaceId]/clients
10. Create new client
11. Link client to project
```

### 3. Client Bridge Access (External Clients)
```
1. Navigate to /(public)/portal
2. Enter email for magic link
3. Check email and click link
4. Verify redirect to /(client_bridge)/[token]
5. Check token validation
6. Navigate to /(client_bridge)/[token]/documents
7. Upload a document
8. Navigate to /(client_bridge)/[token]/comments
9. Add a comment
10. Check /(client_bridge)/[token]/approvals
11. Test approval workflow
12. Verify clean client layout (no studio nav)
```

### 4. API Endpoints
```
# Test each API endpoint
curl http://localhost:3000/api/webhook/stripe
curl http://localhost:3000/api/auth/callback
# ... test all endpoints
```

## Performance Baseline

### Metrics to Record
- [ ] Build time: `time npm run build`
- [ ] Bundle sizes: Check `.next/analyze/` output
- [ ] Dev server startup: `time npm run dev`
- [ ] Page load times (use Chrome DevTools)
  - [ ] Dashboard: ___ms
  - [ ] Projects list: ___ms
  - [ ] Client portal: ___ms

### Database Queries
- [ ] Count queries on dashboard load
- [ ] Check for N+1 query issues
- [ ] Note any slow queries

## Critical Path Validation

### Server Actions Currently Working
List all Server Actions and test:
- [ ] `app/(client_bridge)/requests/actions.ts`
- [ ] `app/(client_bridge)/files/actions.ts`
- [ ] `app/(client_bridge)/select/actions.ts`
- [ ] `app/bridge/verify/actions.ts`
- [ ] ... (list all)

### Forms Using Server Actions
Document forms and their actions:
- [ ] New client form → createClient action
- [ ] New project form → createProject action
- [ ] File upload → uploadFile action
- [ ] ... (list all)

## Browser Testing

### Browsers to Test
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on Mac)
- [ ] Mobile responsive

### Console Checks
- [ ] No console errors on page load
- [ ] No console errors during navigation
- [ ] No console errors during form submission

## Data Integrity Checks

### Before Migration
- [ ] Export list of all projects
- [ ] Export list of all clients
- [ ] Count total users
- [ ] Note any active sessions

### After Each Phase
- [ ] Verify same data accessible
- [ ] Check data mutations still work
- [ ] Ensure no data loss

## Monitoring Setup

### Error Tracking
- [ ] Set up Sentry or similar
- [ ] Monitor for new errors during migration
- [ ] Set up alerts for 500 errors

### Logging
- [ ] Enable debug logging
- [ ] Monitor server logs during migration
- [ ] Check for unusual warnings

## Rollback Verification

### Practice Rollback
Before starting actual migration:
1. [ ] Make a small change
2. [ ] Practice restoring from backup
3. [ ] Verify rollback works correctly
4. [ ] Document rollback time

## Documentation Verification

### CLAUDE.md Files Created
- [ ] app/CLAUDE.md - Root app architecture
- [ ] app/(user_dashboard)/CLAUDE.md - Studio patterns
- [ ] app/(client_bridge)/CLAUDE.md - Client portal patterns
- [ ] app/(public)/CLAUDE.md - Marketing/auth patterns
- [ ] app/_features/CLAUDE.md - Feature module guide
- [ ] app/_lib/CLAUDE.md - Infrastructure patterns
- [ ] app/api/CLAUDE.md - Webhook patterns

### Each CLAUDE.md Contains
- [ ] Context statement defining AI's role
- [ ] Architecture overview for that area
- [ ] Code examples specific to directory
- [ ] Best practices and patterns
- [ ] Clear do's and don'ts

## Sign-offs

### Pre-Migration Checklist Complete
- [ ] All automated tests written and passing
- [ ] Manual test scripts documented
- [ ] Performance baseline recorded
- [ ] Backup strategy tested
- [ ] Team notified of migration window
- [ ] CLAUDE.md documentation structure planned

### Ready to Proceed
- [ ] Dev environment stable
- [ ] No blocking issues identified
- [ ] Rollback plan tested
- [ ] Migration plan reviewed

---

## Emergency Contacts

- Lead Developer: ___________
- DevOps: ___________
- On-call: ___________

## Migration Window

- Start Date/Time: ___________
- Expected Duration: ___________
- Point of No Return: ___________