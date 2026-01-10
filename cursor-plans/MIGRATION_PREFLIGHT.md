# Design System Migration - Preflight Analysis

## Dependencies to Install

New dependencies from `salt-core-design-system`:
- `@base-ui/react: ^1.0.0`
- `cmdk: ^1.1.1`
- `next-themes: ^0.4.6`
- `sonner: ^2.0.7`
- `tw-animate-css: ^1.4.0`

## Import Path Strategy

**Decision: Use compatibility re-export approach**
- Create `lib/utils.ts` that re-exports from `@/libs/cn`
- This avoids bulk rewrites and maintains backward compatibility
- New components can import from `@/lib/utils`, old code continues to work

## Legacy CSS Class Usage Inventory

Found 187 matches across 55 files using legacy classnames (`.btn`, `.card`, `.input`, etc.)

**Critical files using legacy classes:**
- Marketing: `components/Pricing.tsx`, `components/Hero.tsx`, `components/CTA.tsx`, etc.
- Bridge: `app/(client_bridge)/*` pages (login, select, invoices, projects)
- Auth: Login/signin flows
- Dashboard (old): Forms and UI components

**Strategy**: Add compatibility layer in new `globals.css` to map legacy classes to new tokens

## Files to Copy from `salt-core-design-system` to `salt-core`

### Core Design System
- `components/ui/*` (all primitives - button, card, dialog, etc.)
- `components/patterns/*` (app-shell, stat-card, page-header, etc.)
- `components/theme-provider.tsx`
- `components/theme-toggle.tsx`
- `lib/utils.ts`

### Dashboard Features (to adapt)
- `src/features/shell/components/DashboardSidebar.tsx`
- `src/features/shell/components/DashboardHeader.tsx`
- `src/features/shell/components/CommandPalette.tsx`
- `src/features/shell/components/NavItem.tsx`
- `src/features/shell/components/Kbd.tsx`
- `src/features/shell/hooks/useGlobalHotkeys.ts`

### Supporting Types/Hooks
- `src/features/shared/hooks/useTagManagement.ts`
- `src/features/shared/types/tags.ts`

## Dashboard Route Mapping

### Existing (salt-core) → New (design-system)
- `/dashboard` → Keep, replace UI with new overview design
- `/dashboard/clients` → Keep URL, replace UI
- `/dashboard/clients/new` → Keep URL, replace UI with new form
- `/dashboard/clients/[id]` → Keep URL, adapt new UI
- `/dashboard/projects` → Keep URL, replace UI
- `/dashboard/projects/new` → Keep URL, replace UI with new form
- `/dashboard/settings/billing` → Keep as-is, wrap in new shell
- `/dashboard/settings/domains` → Keep as-is, wrap in new shell
- `/dashboard/style-guide` → Keep for reference

### New pages (not in production yet - can be placeholders)
- `/dashboard/inbox` → Create placeholder
- `/dashboard/insights` → Create placeholder
- `/dashboard/studio` → Create placeholder
- `/dashboard/tasks` → Create placeholder
- `/dashboard/account-setup` → Skip (not needed in Phase 1)

## Theme Migration Details

### Old System (`salt-core`)
- Uses `data-theme="light|dark"` and `data-accent="ocean|violet|emerald|..."`
- Applied server-side in `app/layout.tsx` via `libs/theme/*`
- Reads from Supabase `profiles.ui_theme` and `bridge_portals.theme_config`
- CSS tokens in `app/globals.css` use `rgb(var(--primary))` pattern

### New System (`salt-core-design-system`)
- Uses `.dark` class on `<html>`
- Managed client-side via `ThemeProvider` + localStorage
- CSS tokens use same `--primary` etc. naming but with `oklch()` values
- No accent preset system (single color palette)

### Migration Approach
1. Replace `app/globals.css` entirely with new system
2. Add compatibility layer for legacy `.btn`, `.card`, etc. classes
3. Update `app/layout.tsx` to:
   - Keep `ClientLayout` wrapper (Crisp, toasts, tooltips)
   - Replace theme attributes logic with ThemeProvider
   - Apply `.dark` class based on user preference (default to light)
   - Remove `libs/theme/*` dependency for now (can re-add accent presets in Phase 3)

## Compatibility Layer CSS (to add to new globals.css)

```css
/* Legacy class compatibility layer - Phase 1 temporary */
@layer components {
  /* Button compat */
  .btn {
    @apply inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2;
  }
  .btn-primary {
    @apply bg-primary text-primary-foreground hover:bg-primary/90;
  }
  .btn-secondary {
    @apply bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }
  .btn-ghost {
    @apply hover:bg-muted hover:text-foreground;
  }
  
  /* Card compat */
  .card {
    @apply bg-card text-card-foreground border border-border rounded-lg;
  }
  
  /* Input/Select compat */
  .input, .select, .textarea {
    @apply flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50;
  }
  
  .select {
    @apply h-9;
  }
  
  /* Badge compat */
  .badge {
    @apply inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80;
  }
  .badge-secondary {
    @apply border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80;
  }
  .badge-ghost {
    @apply border-transparent bg-transparent;
  }
  .badge-outline {
    @apply text-foreground;
  }
}
```

## File Operations Checklist

### Phase 1 - Step 1: Move Legacy Dashboard
```bash
mkdir -p app/legacy
mv app/(user_dashboard)/dashboard app/legacy/dashboard
```

### Phase 1 - Step 2: Install Dependencies
```bash
npm install @base-ui/react@^1.0.0 cmdk@^1.1.1 next-themes@^0.4.6 sonner@^2.0.7 tw-animate-css@^1.4.0
```

### Phase 1 - Step 3: Copy New Design System
```bash
mkdir -p lib components/patterns src/features/shell src/features/shared/hooks src/features/shared/types

# UI primitives
cp -R /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/components/ui ./components/

# Patterns
cp -R /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/components/patterns ./components/

# Theme components
cp /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/components/theme-provider.tsx ./components/
cp /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/components/theme-toggle.tsx ./components/

# Utils
cp /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/lib/utils.ts ./lib/

# Shell features
cp -R /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/src/features/shell ./src/features/

# Shared features
mkdir -p src/features/shared/hooks src/features/shared/types
cp /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/src/features/shared/hooks/useTagManagement.ts ./src/features/shared/hooks/
cp /Users/gabriellamartins/Documents/GitHub/SALT/salt-core-design-system/src/features/shared/types/tags.ts ./src/features/shared/types/
```

## Risk Mitigation Notes

1. **Legacy CSS classes**: 55 files use old classes - compatibility layer is critical
2. **Theme switching**: Bridge portals expect `data-accent` - temporarily accepting default theme
3. **Import paths**: New components use `@/lib/utils` - create re-export to avoid breaks
4. **Charts**: Keep existing recharts-based charts, don't migrate those yet
5. **Forms**: Reuse existing server actions, just restyle the UI

## Success Criteria (Phase 0 Complete)

- [x] Dependencies identified
- [x] Import strategy defined
- [x] Legacy class usage inventoried
- [x] File copy/move commands documented
- [x] Compatibility layer CSS drafted
- [x] Risk assessment complete

