# Next.js Full-Stack Migration Checklist

## Phase 1: Preparation & Testing Infrastructure ✅ (90% Complete)

### 1.1 Migration Tracking
- [x] Create migration checklist (this file) ✅
- [x] Document all existing routes ✅ (see EXISTING_ROUTES_INVENTORY.md)
- [x] Create test suite for critical paths ✅ (see CRITICAL_PATH_TESTS.md)
- [ ] Set up feature branch

### 1.2 Pre-Migration Cleanup (from Review Report)
- [x] Resolve bridge duplication (DONE - deleted (client_bridge))
- [x] Fix performance issues (DONE - parallel queries, cached context)
- [x] Rename apps folder to apps.old (DONE - excluded from build)

### 1.3 Backup Current State
- [x] Create app_backup/ folder ✅
- [x] Copy entire app/ directory ✅ (232 files backed up)
- [x] Commit to feature branch ✅ (feature/nextjs-fullstack-migration)

### 1.4 Test Current Functionality
- [ ] Test auth flows (signin, magic links)
- [ ] Test dashboard access
- [ ] Test client portal access
- [ ] Document any existing issues

## Phase 1.5: Packages Migration (NEW) 📦

**See:** [`PACKAGES_MIGRATION_PLAN.md`](./PACKAGES_MIGRATION_PLAN.md) for detailed implementation

### 1.5.1 Template Cleanup (Phase P0)
- [ ] Delete empty `packages/auth/` (replaced by `security/`)
- [ ] Delete empty `packages/cms/` (replaced by `theme/`)
- [ ] Create `packages/utils/` structure
- [ ] Create `packages/theme/` structure
- [ ] Create `packages/security/` structure
- [ ] Create `packages/patterns/` structure
- [ ] Populate all package.json files
- [ ] Update `next.config.js` with `transpilePackages`

### 1.5.2 Foundation Packages (Phase P1)
- [ ] Extract `@repo/utils` (cn, rate-limit) - 193 import updates
- [ ] Enhance `@repo/shared-types` (config, tenancy types, permissions types)
- [ ] Create `@repo/theme` (from libs/theme/*)
- [ ] Create `@repo/security` (tokens, safe-url, encryption)
- [ ] Write unit tests for each package
- [ ] Verify: `pnpm build` and `pnpm test:all`

### 1.5.3 Component Packages (Phase P2)
- [ ] Populate `@repo/ui` (50+ components from components/ui/)
- [ ] Create `@repo/patterns` (7 components from components/patterns/)
- [ ] Update all imports to use package names
- [ ] Verify component rendering

### 1.5.4 Post-Packages Cleanup
- [ ] Delete `lib/utils.ts` (duplicate of cn.ts)
- [ ] Move infrastructure to `app/_lib/` (supabase, tenancy, permissions)
- [ ] Run full E2E test suite

---

## Phase 2: Create Domain Feature Structure 🔨

### 2.1 Create Feature Directories
- [ ] Create app/_features directory
- [ ] Create feature subdirectories:
  - [ ] auth (authentication & authorization)
  - [ ] billing (Stripe, payments, subscriptions)
  - [ ] workspace (studio/workspace management)
  - [ ] projects (project management)
  - [ ] messaging (conversations, notifications)
  - [ ] portal (client bridge features)
  - [ ] seo (SEO audit system)
  - [ ] calendar (Google Calendar integration)

### 2.2 Actions Migration Strategy (Gradual Approach)
- [ ] Keep existing app/actions/ directory
- [ ] Create proxy exports in _features/[feature]/actions.ts
- [ ] Migrate actions only when modifying features
- [ ] Phase out app/actions/ gradually

### 2.3 Create Infrastructure Directories
- [ ] Create app/_lib directory
- [ ] Create infrastructure subdirectories:
  - [ ] db (database utilities)
  - [ ] email (email templates & sending)
  - [ ] storage (file storage)
  - [ ] validations (shared validators)

### 2.3 Create Initial CLAUDE.md Files
- [ ] app/CLAUDE.md (overall architecture)
- [ ] app/_features/CLAUDE.md (feature patterns)
- [ ] app/_lib/CLAUDE.md (infrastructure patterns)

## Phase 3: Clean Up API Routes 🧹

### 3.1 Categorize API Routes
- [ ] List all /api routes
- [ ] Mark routes to KEEP (webhooks, external callbacks)
- [ ] Mark routes to CONVERT to Server Actions
- [ ] Mark routes to EVALUATE

### 3.2 Convert Internal APIs
- [ ] /api/user/settings → _features/workspace/actions.ts
- [ ] /api/stripe/create-checkout → _features/billing/actions.ts
- [ ] /api/stripe/create-portal → _features/billing/actions.ts
- [ ] /api/lead → _features/auth/actions.ts

## Phase 4: Reorganize Route Structure 🏗️

### 4.1 Create New Route Groups
- [ ] Keep existing (user_dashboard)
- [ ] Keep existing (client_bridge)
- [ ] Create (public) for marketing/auth

### 4.2 Move Routes
- [ ] Move signin/signup to (public)
- [ ] Move pricing, blog, tos to (public)
- [ ] Keep dashboard routes in (user_dashboard)
- [ ] Keep bridge routes in (client_bridge)

## Phase 5: Add CLAUDE.md Documentation 📚

### 5.1 Route-Specific Documentation
- [ ] app/(user_dashboard)/CLAUDE.md
- [ ] app/(client_bridge)/CLAUDE.md
- [ ] app/(public)/CLAUDE.md

### 5.2 Feature-Specific Documentation
- [ ] One CLAUDE.md per feature in _features

## Phase 6: Testing & Validation ✅

### 6.1 Comprehensive Testing
- [ ] Run E2E test suite
- [ ] Manual testing of all routes
- [ ] Check auth flows
- [ ] Verify Server Actions
- [ ] Test webhooks

### 6.2 Performance Check
- [ ] Build time comparison
- [ ] Bundle size analysis
- [ ] Lighthouse scores

## Phase 7: Cleanup 🧹

### 7.1 Remove Old Code
- [ ] Delete app_backup/
- [ ] Remove old API routes
- [ ] Clean up unused imports

### 7.2 Update Documentation
- [ ] Update README.md
- [ ] Update deployment docs
- [ ] Update environment variables

## Rollback Plan 🔄

### If Issues Occur:
- Phase 1-2: Safe, no rollback needed
- Phase 3: Restore individual API routes
- Phase 4: Restore from app_backup/
- Critical: `git reset --hard` to pre-migration commit

## Patterns to Preserve (from Review Report)

### Keep As-Is:
- **libs/supabase/** - Well-organized client/server/admin structure
- **libs/tenancy/** - Multi-tenant context system
- **libs/hooks/** - Cross-cutting realtime hooks
- **types/** - Shared type definitions

### Integrate Into Features:
- **Realtime subscriptions** - Add to messaging feature
- **Email templates** - Move to _lib/email or features
- **SEO audit system** - Create dedicated feature
- **Calendar integration** - Create dedicated feature

## Notes & Issues

### Discovered During Migration:
- Bridge duplication resolved (deleted (client_bridge))
- Performance issues fixed with parallel queries
- Apps folder renamed to apps.old

### Performance Improvements:
- Tenant context cached with React cache()
- Database queries parallelized
- Page load times reduced from 5s to 1-2s

### Breaking Changes:
- _(Document any breaking changes)_

---

**Started:** January 14, 2025
**Target Completion:** _TBD_
**Status:** Phase 1 In Progress