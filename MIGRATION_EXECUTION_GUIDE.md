# Migration Execution Guide

## Strategy: Packages First, Then App

### Why This Order?

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION ORDER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PACKAGES (Foundation) ──────────────────────┐               │
│     • Zero app dependencies                      │               │
│     • Can test in isolation                      │               │
│     • App still works during migration           │               │
│                                                  ▼               │
│  2. APP (Uses Packages) ────────────────────────────────────────│
│     • Import from @repo/utils, @repo/ui         │               │
│     • Features have stable foundation           │               │
│     • Can validate incrementally                │               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key insight**: If you migrate packages first, the app continues to work the entire time because you're only *adding* new import sources. Then you gradually update imports from old paths to new paths.

---

## 4-Layer Validation Gate Protocol

For each migration step, run these gates **before moving to the next step**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION GATES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  GATE 1: Static Analysis (instant)                              │
│  └─ pnpm tsc --noEmit                                           │
│     └─ Catches: Import errors, type mismatches                  │
│                                                                  │
│  GATE 2: Unit Tests (fast, ~30s)                                │
│  └─ pnpm test                                                   │
│     └─ Catches: Logic regressions, broken utils                 │
│                                                                  │
│  GATE 3: Build (medium, ~2min)                                  │
│  └─ pnpm build                                                  │
│     └─ Catches: Bundle issues, SSR problems                     │
│                                                                  │
│  GATE 4: E2E Smoke Test (slower, ~5min)                         │
│  └─ pnpm test:e2e tests/smoke.spec.ts                           │
│     └─ Catches: Runtime breaks, navigation issues               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Commands

```bash
# Quick validation (after each change)
pnpm tsc --noEmit && pnpm test

# Full validation (at checkpoints)
pnpm build && pnpm test:e2e tests/smoke.spec.ts

# Complete validation (before committing)
pnpm test:all
```

---

## Phase P0: Template Cleanup

**Status**: ✅ COMPLETE (Jan 15, 2025)

### Checklist

- [x] Delete empty `packages/auth/` (replaced by `security/`)
- [x] Delete empty `packages/cms/` (replaced by `theme/`)
- [x] Create `packages/utils/` structure
- [x] Create `packages/theme/` structure
- [x] Create `packages/security/` structure
- [x] Create `packages/patterns/` structure
- [x] Populate all package.json files
- [x] Populate all tsconfig.json files
- [x] Populate all vitest.config.ts files
- [x] Update `next.config.js` with `transpilePackages`
- [x] Update `tsconfig.json` with @repo/* paths
- [x] Create `pnpm-workspace.yaml`
- [x] Run `pnpm install` to link workspaces
- [x] Validate: `pnpm tsc --noEmit` (packages pass)
- [x] Validate: `pnpm build` (build succeeds)

### Expected Result

```
packages/
├── CLAUDE.md              ✅ Keep
├── shared-types/          ✅ Keep & enhance
├── logger/                ✅ Keep
├── ui/                    ✅ Keep & populate
├── utils/                 🆕 Create
├── theme/                 🆕 Create
├── security/              🆕 Create
└── patterns/              🆕 Create
```

---

## Phase P1: Foundation Packages

**Status**: ⏳ PENDING

### P1.1: @repo/utils

| Step | Action | Validation |
|------|--------|------------|
| 1 | Copy `libs/cn.ts` → `packages/utils/src/cn.ts` | Gate 1 |
| 2 | Copy `libs/rate-limit.ts` → `packages/utils/src/rate-limit.ts` | Gate 1 |
| 3 | Create barrel export `index.ts` | Gate 1 |
| 4 | Write unit tests | Gate 2 |
| 5 | Update 10 test files to `@repo/utils` | Gates 1-3 |
| 6 | Run E2E smoke | Gate 4 |
| 7 | Update remaining 183 files | Gates 1-4 |
| 8 | Delete `lib/utils.ts` (duplicate) | Gates 1-4 |

### P1.2: @repo/shared-types

| Step | Action | Validation |
|------|--------|------------|
| 1 | Move `types/config.ts` | Gate 1 |
| 2 | Extract types from `libs/tenancy/types.ts` | Gate 1 |
| 3 | Extract types from `libs/permissions/types.ts` | Gate 1 |
| 4 | Update barrel export | Gate 1 |
| 5 | Update app imports | Gates 1-3 |

### P1.3: @repo/theme

| Step | Action | Validation |
|------|--------|------------|
| 1 | Move `libs/theme/*` | Gate 1 |
| 2 | Update imports to `@repo/shared-types` | Gate 1 |
| 3 | Write tests | Gate 2 |
| 4 | Update app imports | Gates 1-3 |

### P1.4: @repo/security

| Step | Action | Validation |
|------|--------|------------|
| 1 | Move `libs/tokens.ts` | Gate 1 |
| 2 | Move `libs/safe-url.ts` | Gate 1 |
| 3 | Move `libs/safe-redirect.ts` | Gate 1 |
| 4 | Move `libs/calendar-encryption.ts` | Gate 1 |
| 5 | Write tests | Gate 2 |
| 6 | Update app imports | Gates 1-3 |

---

## Phase P2: Component Packages

**Status**: ⏳ PENDING

### P2.1: @repo/ui

| Step | Action | Validation |
|------|--------|------------|
| 1 | Move 5 core components (button, input, dialog, card, badge) | Gates 1-3 |
| 2 | Visual smoke test | Gate 4 + screenshot |
| 3 | Move remaining components in batches of 10 | Gates 1-3 per batch |
| 4 | Full E2E suite | Gate 4 (all tests) |

### P2.2: @repo/patterns

| Step | Action | Validation |
|------|--------|------------|
| 1 | Move all pattern components | Gates 1-3 |
| 2 | Update app imports | Gates 1-3 |
| 3 | E2E validation | Gate 4 |

---

## Phase P3: App Reorganization

**Status**: ⏳ PENDING (After P1-P2)

### Sequence

1. Create `app/_lib/` structure
2. Move infrastructure (supabase, tenancy, permissions, stripe)
3. Create `app/_features/` structure
4. Move feature modules
5. Clean up routes

---

## Rollback Procedures

### If Gate 1 Fails (Type Errors)
```bash
# Check what changed
git diff

# Revert specific file
git checkout -- path/to/file.ts
```

### If Gate 3 Fails (Build Error)
```bash
# Check build output for specific error
pnpm build 2>&1 | head -50

# Common fix: missing transpilePackages entry
# Update next.config.js
```

### If Gate 4 Fails (E2E)
```bash
# Run with UI to debug
pnpm test:e2e --ui

# Check specific test
pnpm test:e2e tests/smoke.spec.ts --debug
```

### Full Rollback
```bash
# Reset to last known good state
git reset --hard HEAD~1

# Or reset to specific commit
git reset --hard <commit-hash>
```

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| P0: Template Cleanup | ✅ Complete | Jan 15, 2025 | Jan 15, 2025 |
| P1.1: @repo/utils | ✅ Complete | Jan 15, 2025 | Jan 15, 2025 |
| P1.2: @repo/shared-types | ✅ Complete | Jan 15, 2025 | Jan 15, 2025 |
| P1.3: @repo/theme | ✅ Complete | Jan 15, 2025 | Jan 15, 2025 |
| P1.4: @repo/security | ⏳ Pending | - | - |
| P2.1: @repo/ui | ⏳ Pending | - | - |
| P2.2: @repo/patterns | ⏳ Pending | - | - |
| P3: App Reorganization | ⏳ Pending | - | - |

---

## Notes

- **Port 3000**: E2E tests require dev server on port 3000
- **Atomic Commits**: Commit after each successful validation gate
- **No Parallel Changes**: One package at a time to isolate issues
