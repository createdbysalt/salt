---
name: frontend-design
description: Build production UI for Salt using @repo/ui during Lovable migration. Use when building components, pages, or porting Lovable screens into salt-software.
---

# Frontend design (Lovable migration period)

**Status:** Design clearance active. Visual canon is pending Lovable capture — see [DESIGN.md](../../DESIGN.md) and [docs/plans/2026-06-01-lovable-ui-migration.md](../../docs/plans/2026-06-01-lovable-ui-migration.md).

## Before coding

1. Read [DESIGN.md](../../DESIGN.md) (stub until Phase 2).
2. If porting a screen: locate the equivalent in **Lovable source code** first; adapt, do not paste blindly.
3. Read [packages/ui/CLAUDE.md](../../packages/ui/CLAUDE.md) and [docs/guides/agent-component-guide.md](../../docs/guides/agent-component-guide.md).
4. Match patterns in the target feature under `app/_features/<feature>/`.

## Stack (production)

| Layer | Use |
|-------|-----|
| Components | `@repo/ui`, `@repo/patterns` |
| Styling | Tailwind utilities; no inline styles |
| Layout | Existing shell (`DashboardLayoutWrapper`, sidebars) unless wave replaces it |
| Data | DAL + server actions; `Result<T, E>` |
| Loading | `<Loader2 className="animate-spin" />` from lucide-react |

## Port from Lovable

- **Integrate and adapt** Lovable JSX/layout into this repo’s App Router structure.
- Wire real auth, tenancy, and Supabase queries — Lovable mocks are not production.
- Prefer `@repo/ui` primitives over Lovable-only component libraries when equivalent exists.
- One surface per PR when possible; land on `staging` when that branch exists.

## Do not

- Enforce Linear Standard, Ramp restraint, or v2 OKLCH mandates (historical).
- Reference Bridge / Studio / Strategy / Serve / Client Portal splits (retired product shape).
- Add `any`, `@ts-ignore`, or placeholder comments.
- Create large custom design-token systems until `DESIGN.md` is repopulated from Lovable.

## Surfaces (current product)

| Surface | Routes |
|---------|--------|
| App | `/hq`, `/people`, `/plays`, `/spaces`, `/memory`, `/work`, `/me`, `/billing`, … |
| Marketing | `/`, `/pricing`, legal pages under `(public)/` |
| Auth | `/signin`, onboarding |

## Checklist

- [ ] Lovable source path or component named in PR (if port)
- [ ] `@repo/ui` imports
- [ ] Co-located tests updated if behavior changed
- [ ] E2E locators updated if user-visible text or roles changed
