# Packages Migration Plan

## Executive Summary

This document outlines the migration strategy for extracting reusable code from salt-core into the `packages/` workspace. The goal is to create a clean monorepo structure that maximizes velocity while preserving functionality.

**Key Principle**: Packages are **libraries** (stateless, reusable, zero app imports). Infrastructure stays in the app layer.

---

## 1. Current Template vs Salt-Core Specific Recommendations

### 1.1 Current Template Structure (Scaffolded)

```
packages/
├── auth/           # Empty - generic auth utilities
├── cms/            # Empty - CMS definitions
├── logger/         # Empty - logging utility
├── shared-types/   # Minimal - billing types only
├── ui/             # Empty - UI components
└── CLAUDE.md       # ✅ Good - Library Laws defined
```

### 1.2 Recommended Structure for Salt-Core

Based on codebase analysis, here's the **optimized package structure** for salt-core:

```
packages/
├── CLAUDE.md                    # ✅ Keep (Library Laws)
│
├── utils/                       # NEW - Consolidate utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── cn.ts                # Class name utility (from libs/cn.ts)
│       ├── cn.test.ts
│       ├── rate-limit.ts        # From libs/rate-limit.ts
│       └── rate-limit.test.ts
│
├── shared-types/                # ENHANCE - Add more types
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts             # Barrel export
│       ├── billing.ts           # ✅ Already exists
│       ├── config.ts            # From types/config.ts
│       ├── api-contract.ts      # API request/response types
│       ├── tenancy.ts           # Tenant/workspace types (pure types only)
│       └── permissions.ts       # Permission enums/types
│
├── theme/                       # NEW - Replace generic cms
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts
│       ├── types.ts             # From libs/theme/types.ts
│       ├── accent-presets.ts    # From libs/theme/accent-presets.ts
│       ├── resolve-theme.ts     # From libs/theme/resolve-theme.ts
│       └── resolve-theme.test.ts
│
├── security/                    # NEW - Replace generic auth
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts
│       ├── tokens.ts            # From libs/tokens.ts
│       ├── tokens.test.ts
│       ├── safe-url.ts          # From libs/safe-url.ts
│       ├── safe-redirect.ts     # From libs/safe-redirect.ts
│       └── encryption.ts        # From libs/calendar-encryption.ts
│
├── ui/                          # POPULATE - From components/ui/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── index.ts             # Barrel export all components
│       ├── primitives/          # Shadcn base components
│       │   ├── button.tsx
│       │   ├── input.tsx
│       │   ├── dialog.tsx
│       │   └── ...
│       └── composed/            # Salt-core specific compositions
│           ├── stat-card.tsx
│           ├── glass-card.tsx
│           └── field.tsx
│
├── patterns/                    # NEW - Dashboard patterns
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── app-shell.tsx        # From components/patterns/
│       ├── page-header.tsx
│       ├── empty-state.tsx
│       ├── filter-bar.tsx
│       └── confirm-dialog.tsx
│
└── logger/                      # KEEP - Enhance with structured logging
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── index.ts
        ├── logger.ts            # Structured logging utility
        └── logger.test.ts
```

### 1.3 Packages to REMOVE from Template

| Package | Reason | Alternative |
|---------|--------|-------------|
| `auth/` | Too generic, auth logic is app-specific | Use `security/` for pure crypto utilities |
| `cms/` | Not needed for salt-core | Use `theme/` instead |

### 1.4 Packages to ADD for Salt-Core

| Package | Purpose | Source |
|---------|---------|--------|
| `@repo/utils` | Consolidated utilities (cn, rate-limit) | `libs/cn.ts`, `libs/rate-limit.ts` |
| `@repo/theme` | Theme system (types, presets, resolver) | `libs/theme/*` |
| `@repo/security` | Security utilities (tokens, safe-url, encryption) | `libs/tokens.ts`, `libs/safe-*.ts` |
| `@repo/patterns` | Dashboard UI patterns | `components/patterns/*` |

---

## 2. Template Improvements for Velocity

### 2.1 Package.json Template

Each package should use this standardized template:

```json
{
  "name": "@repo/[package-name]",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "vitest": "^4.0.0"
  }
}
```

**Key Points:**
- `"private": true` - Never publish to npm
- `"type": "module"` - ESM-first
- `exports` - Strict barrel exports (no deep imports)
- `peerDependencies` - React as peer, not dependency

### 2.2 TSConfig Template

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 2.3 Vitest Config Template

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for UI packages
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/index.ts', '**/*.d.ts']
    }
  }
})
```

### 2.4 Index.ts Barrel Export Template

```typescript
// packages/[name]/src/index.ts

// Re-export all public APIs
export { functionName } from './module-a'
export { ComponentName } from './module-b'
export type { TypeName } from './types'

// NEVER export internal utilities
// NEVER export from ./internal/* or ./lib/*
```

---

## 3. Migration Phases

### Phase P0: Template Cleanup (Pre-requisite)

**Goal**: Clean up scaffolded packages, establish patterns

**Tasks**:
- [ ] Delete empty `packages/auth/` (replace with `security/`)
- [ ] Delete empty `packages/cms/` (replace with `theme/`)
- [ ] Populate package.json files with proper metadata
- [ ] Add tsconfig.json to each package
- [ ] Add proper vitest.config.ts to each package
- [ ] Create root `pnpm-workspace.yaml` if not exists
- [ ] Update root `next.config.js` with `transpilePackages`

**Effort**: 1-2 hours
**Risk**: None (no functionality changes)

---

### Phase P1: Foundation Packages (Critical Path)

**Goal**: Extract zero-dependency utilities first

**Duration**: 2-3 days

#### P1.1: Create `@repo/utils`

**Source Files**:
```
libs/cn.ts           → packages/utils/src/cn.ts
lib/utils.ts         → DELETE (duplicate of cn.ts)
libs/rate-limit.ts   → packages/utils/src/rate-limit.ts
```

**Import Updates Required**: 193 files
```typescript
// BEFORE (two different paths!)
import { cn } from "@/lib/utils"     // 53 files
import { cn } from "@/libs/cn"       // 140 files

// AFTER (single canonical path)
import { cn } from "@repo/utils"
```

**Dependencies**: None (pure utilities)

**Test Coverage**:
```typescript
// packages/utils/src/cn.test.ts
import { describe, it, expect } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges Tailwind conflicts correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
```

---

#### P1.2: Enhance `@repo/shared-types`

**Source Files**:
```
types/config.ts              → packages/shared-types/src/config.ts
types/index.ts               → packages/shared-types/src/index.ts
libs/tenancy/types.ts        → packages/shared-types/src/tenancy.ts (types only)
libs/permissions/types.ts    → packages/shared-types/src/permissions.ts (types only)
```

**Existing Content to Keep**:
```typescript
// packages/shared-types/src/billing.ts (already exists)
export enum SubscriptionPlan {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing'
```

**New Exports**:
```typescript
// packages/shared-types/src/index.ts
export * from './billing'
export * from './config'
export * from './tenancy'
export * from './permissions'
export * from './api-contract'
```

**Dependencies**: None (pure types)

---

#### P1.3: Create `@repo/theme`

**Source Files**:
```
libs/theme/types.ts          → packages/theme/src/types.ts
libs/theme/accent-presets.ts → packages/theme/src/accent-presets.ts
libs/theme/resolve-theme.ts  → packages/theme/src/resolve-theme.ts
libs/theme/index.ts          → packages/theme/src/index.ts
```

**Dependencies**: `@repo/shared-types` (for config types)

---

#### P1.4: Create `@repo/security`

**Source Files**:
```
libs/tokens.ts               → packages/security/src/tokens.ts
libs/safe-url.ts             → packages/security/src/safe-url.ts
libs/safe-redirect.ts        → packages/security/src/safe-redirect.ts
libs/calendar-encryption.ts  → packages/security/src/encryption.ts
```

**Dependencies**: None (pure crypto utilities)

---

### Phase P2: Component Packages

**Goal**: Create reusable UI component library

**Duration**: 5-7 days

#### P2.1: Populate `@repo/ui`

**Source Files**:
```
components/ui/*              → packages/ui/src/primitives/
```

**Component List** (50+ files):
- accordion.tsx
- alert.tsx
- alert-dialog.tsx
- avatar.tsx
- badge.tsx
- button.tsx
- card.tsx
- checkbox.tsx
- combobox.tsx
- command.tsx
- dialog.tsx
- dropdown-menu.tsx
- input.tsx
- label.tsx
- progress.tsx
- select.tsx
- sheet.tsx
- skeleton.tsx
- switch.tsx
- table.tsx
- tabs.tsx
- textarea.tsx
- toast.tsx
- tooltip.tsx
- ... and more

**Critical Import Fix**:
```typescript
// BEFORE (in each UI component)
import { cn } from "@/lib/utils"

// AFTER
import { cn } from "@repo/utils"
```

**Dependencies**: `@repo/utils`

**Barrel Export Structure**:
```typescript
// packages/ui/src/index.ts
export { Button, buttonVariants } from './primitives/button'
export { Input } from './primitives/input'
export { Dialog, DialogContent, DialogHeader } from './primitives/dialog'
// ... all components
```

---

#### P2.2: Create `@repo/patterns`

**Source Files**:
```
components/patterns/app-shell.tsx        → packages/patterns/src/app-shell.tsx
components/patterns/page-header.tsx      → packages/patterns/src/page-header.tsx
components/patterns/page-greeting-header.tsx → packages/patterns/src/page-greeting-header.tsx
components/patterns/empty-state.tsx      → packages/patterns/src/empty-state.tsx
components/patterns/filter-bar.tsx       → packages/patterns/src/filter-bar.tsx
components/patterns/confirm-dialog.tsx   → packages/patterns/src/confirm-dialog.tsx
components/patterns/stat-card.tsx        → packages/patterns/src/stat-card.tsx
```

**Dependencies**: `@repo/ui`, `@repo/utils`

---

### Phase P3: Infrastructure (DEFERRED)

**Status**: **NOT RECOMMENDED** for current state

**Reason**: These modules have heavy app-specific dependencies (Next.js headers, Supabase client, business logic). Extracting them violates the "Library Laws" and provides no benefit without a second app.

**What Stays in App Layer**:
```
libs/supabase/*       → app/_lib/supabase/      (Next.js coupled)
libs/tenancy/*        → app/_lib/tenancy/       (Supabase coupled)
libs/permissions/*    → app/_lib/permissions/   (Business logic)
libs/stripe*.ts       → app/_lib/stripe/        (Config imports)
libs/*-emails.ts      → app/_features/emails/   (Templates)
libs/gpt.ts           → app/_features/ai/       (App-specific)
libs/seo/*            → app/_features/seo/      (Feature domain)
```

---

## 4. Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         PHASE P1                                 │
│                   (No Dependencies)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ @repo/utils  │  │@repo/shared- │  │ @repo/      │            │
│  │              │  │    types     │  │  security   │            │
│  │ • cn()       │  │ • billing    │  │ • tokens    │            │
│  │ • rateLimit  │  │ • config     │  │ • safe-url  │            │
│  └──────────────┘  │ • tenancy    │  │ • encrypt   │            │
│         │          │ • permissions│  └──────────────┘            │
│         │          └──────────────┘                              │
│         │                 │                                      │
├─────────┼─────────────────┼──────────────────────────────────────┤
│         │                 │                                      │
│         ▼                 ▼                                      │
│  ┌──────────────────────────────┐                                │
│  │       @repo/theme            │                                │
│  │  • types                     │                                │
│  │  • accent-presets            │                                │
│  │  • resolve-theme             │                                │
│  └──────────────────────────────┘                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         PHASE P2                                 │
│              (Depends on Phase P1)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     @repo/ui                              │   │
│  │  • button, input, dialog, card, etc.                     │   │
│  │  • Depends on: @repo/utils                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   @repo/patterns                          │   │
│  │  • app-shell, page-header, empty-state, etc.             │   │
│  │  • Depends on: @repo/ui, @repo/utils                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    APP LAYER (Not Extracted)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  app/_lib/                                                       │
│  ├── supabase/        (Next.js headers dependency)              │
│  ├── tenancy/         (Supabase client dependency)              │
│  ├── permissions/     (Business logic, Supabase)                │
│  └── stripe/          (Config imports, business logic)          │
│                                                                  │
│  app/_features/                                                  │
│  ├── auth/            (Session management)                      │
│  ├── billing/         (Stripe webhooks)                         │
│  ├── emails/          (Templates)                               │
│  └── ...                                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Migration Checklist

### Pre-Migration Setup

- [ ] Backup current state: `cp -R libs libs_backup`
- [ ] Create feature branch: `git checkout -b feat/packages-migration`
- [ ] Update `pnpm-workspace.yaml`:
  ```yaml
  packages:
    - 'packages/*'
  ```
- [ ] Update `next.config.js`:
  ```javascript
  module.exports = {
    transpilePackages: [
      '@repo/utils',
      '@repo/shared-types',
      '@repo/theme',
      '@repo/security',
      '@repo/ui',
      '@repo/patterns'
    ]
  }
  ```

### Phase P0 Checklist (Template Cleanup)

- [ ] Delete `packages/auth/` directory
- [ ] Delete `packages/cms/` directory
- [ ] Create `packages/utils/` with proper structure
- [ ] Create `packages/theme/` with proper structure
- [ ] Create `packages/security/` with proper structure
- [ ] Create `packages/patterns/` with proper structure
- [ ] Populate all package.json files
- [ ] Populate all tsconfig.json files
- [ ] Populate all vitest.config.ts files
- [ ] Run `pnpm install` to link workspaces

### Phase P1 Checklist (Foundation)

#### P1.1: @repo/utils
- [ ] Copy `libs/cn.ts` → `packages/utils/src/cn.ts`
- [ ] Copy `libs/rate-limit.ts` → `packages/utils/src/rate-limit.ts`
- [ ] Create `packages/utils/src/index.ts` barrel export
- [ ] Write unit tests for cn()
- [ ] Write unit tests for rateLimiter
- [ ] Run: `pnpm test --filter @repo/utils`
- [ ] Update 193 import statements in app
- [ ] Delete `lib/utils.ts` (duplicate)
- [ ] Run: `pnpm build` (verify no errors)
- [ ] Run: `pnpm test:all` (verify no regressions)

#### P1.2: @repo/shared-types
- [ ] Keep existing `billing.ts`
- [ ] Move `types/config.ts` → `packages/shared-types/src/config.ts`
- [ ] Extract pure types from `libs/tenancy/types.ts`
- [ ] Extract pure types from `libs/permissions/types.ts`
- [ ] Create barrel export
- [ ] Update imports in app
- [ ] Run type check: `pnpm tsc --noEmit`

#### P1.3: @repo/theme
- [ ] Move `libs/theme/*` → `packages/theme/src/`
- [ ] Update imports to use `@repo/shared-types`
- [ ] Create barrel export
- [ ] Write tests for resolve-theme
- [ ] Update imports in app
- [ ] Run tests

#### P1.4: @repo/security
- [ ] Move `libs/tokens.ts` → `packages/security/src/tokens.ts`
- [ ] Move `libs/safe-url.ts` → `packages/security/src/safe-url.ts`
- [ ] Move `libs/safe-redirect.ts` → `packages/security/src/safe-redirect.ts`
- [ ] Move `libs/calendar-encryption.ts` → `packages/security/src/encryption.ts`
- [ ] Create barrel export
- [ ] Write unit tests
- [ ] Update imports in app

### Phase P2 Checklist (Components)

#### P2.1: @repo/ui
- [ ] Move all `components/ui/*` → `packages/ui/src/primitives/`
- [ ] Update all `@/lib/utils` imports to `@repo/utils`
- [ ] Create barrel export with all components
- [ ] Update all app imports to `@repo/ui`
- [ ] Verify component rendering with visual tests
- [ ] Run: `pnpm build`

#### P2.2: @repo/patterns
- [ ] Move all `components/patterns/*` → `packages/patterns/src/`
- [ ] Update imports to use `@repo/ui`
- [ ] Create barrel export
- [ ] Update app imports
- [ ] Run tests

### Post-Migration Validation

- [ ] `pnpm build` succeeds
- [ ] `pnpm test:all` passes
- [ ] `pnpm tsc --noEmit` no errors
- [ ] E2E tests pass: `pnpm test:e2e`
- [ ] Manual smoke test of critical flows
- [ ] Performance baseline maintained
- [ ] Commit and create PR

---

## 6. Import Update Script

Use this script to automate import updates:

```bash
#!/bin/bash
# scripts/migrate-imports.sh

# Phase P1.1: Utils
echo "Updating @repo/utils imports..."
find app components src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|from "@/lib/utils"|from "@repo/utils"|g' {} +
find app components src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|from "@/libs/cn"|from "@repo/utils"|g' {} +

# Phase P2.1: UI
echo "Updating @repo/ui imports..."
find app src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|from "@/components/ui/|from "@repo/ui"|g' {} +

# Phase P2.2: Patterns
echo "Updating @repo/patterns imports..."
find app src -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i '' 's|from "@/components/patterns/|from "@repo/patterns"|g' {} +

echo "Import migration complete. Run 'pnpm build' to verify."
```

---

## 7. Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**:
- Run `pnpm build` and `pnpm test:all` after each file move
- Keep backups until PR is merged
- Use atomic commits for each package

### Risk 2: Circular Dependencies
**Mitigation**:
- Follow dependency graph strictly
- Use `madge --circular packages/` to detect issues
- Never import from `app/` in packages

### Risk 3: Test Coverage Loss
**Mitigation**:
- Each package must have its own test file
- Maintain or improve existing coverage
- Run coverage report before and after

### Risk 4: Runtime Errors
**Mitigation**:
- Manual smoke testing of critical paths
- E2E tests must pass before merge
- Deploy to staging first

---

## 8. Success Metrics

| Metric | Before | After | Measurement |
|--------|--------|-------|-------------|
| Import paths for cn() | 2 | 1 | `rg "import.*cn" -c` |
| Package count | 5 (empty) | 6 (populated) | `ls packages/` |
| Build time | baseline | ±5% | `time pnpm build` |
| Test coverage | X% | ≥X% | `pnpm test:coverage` |
| Type errors | 0 | 0 | `pnpm tsc --noEmit` |

---

## 9. Timeline Estimate

| Phase | Duration | Effort |
|-------|----------|--------|
| P0: Template Cleanup | 2 hours | Low |
| P1: Foundation | 2-3 days | Medium |
| P2: Components | 5-7 days | High |
| **Total** | **~2 weeks** | **Medium-High** |

---

## 10. Integration with App Migration

This packages migration integrates with the main app migration (see `MIGRATION_CHECKLIST.md`):

### Sequencing

1. **First**: Complete Packages Phase P0-P1 (Foundation)
2. **Then**: Begin App Phase 2 (Create Domain Feature Structure)
3. **Parallel**: Packages Phase P2 can run alongside App Phase 3-4
4. **Final**: App Phase 5-6 (Documentation, Testing)

### Dependency

The `app/_features/` structure should import from packages:

```typescript
// app/_features/billing/components/PricingTable.tsx
import { Card, Button } from '@repo/ui'
import { cn } from '@repo/utils'
import type { SubscriptionPlan } from '@repo/shared-types'
```

---

## Appendix A: Package CLAUDE.md Files

Each package should have its own CLAUDE.md. See `packages/CLAUDE.md` for the base template.

### Example: packages/ui/CLAUDE.md

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

export interface MyComponentProps {
  className?: string
  // ...
}

export function MyComponent({ className, ...props }: MyComponentProps) {
  return <div className={cn('base-styles', className)} {...props} />
}

MyComponent.displayName = 'MyComponent'
\`\`\`

Then add to index.ts:
\`\`\`typescript
export { MyComponent } from './primitives/my-component'
\`\`\`

## 3. Testing

Every component needs a test:
\`\`\`typescript
// packages/ui/src/primitives/my-component.test.tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent>Test</MyComponent>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
\`\`\`
```

---

## Appendix B: Files NOT to Extract

These stay in app layer (violate "Library Laws"):

| File | Reason | New Location |
|------|--------|--------------|
| `libs/supabase/*` | Next.js headers | `app/_lib/supabase/` |
| `libs/tenancy/context.ts` | Supabase client | `app/_lib/tenancy/` |
| `libs/tenancy/guards.ts` | Business logic | `app/_lib/tenancy/` |
| `libs/permissions/checks.ts` | Business logic | `app/_lib/permissions/` |
| `libs/stripe*.ts` | Config imports | `app/_lib/stripe/` |
| `libs/*-emails.ts` | Templates | `app/_features/emails/` |
| `libs/gpt.ts` | App-specific | `app/_features/ai/` |
| `libs/seo/*` | Feature domain | `app/_features/seo/` |
| `libs/bridge/*` | Feature domain | `app/_features/portal/` |
| `libs/api.ts` | Toast UI import | `app/_lib/api/` |
| `libs/user-dashboard.ts` | Feature helper | `app/_features/dashboard/` |

---

**Document Version**: 1.0
**Created**: January 15, 2025
**Status**: Ready for Implementation
