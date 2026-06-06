---
version: "pending-lovable"
status: design-clearance
name: Salt
description: Visual system pending Lovable migration. Do not enforce v2 Ramp/OKLCH tokens.
---

# Design system — pending Lovable migration

**Canonical runbook:** [docs/plans/2026-06-01-lovable-ui-migration.md](docs/plans/2026-06-01-lovable-ui-migration.md)

**Lovable source:** Full Lovable project code is the reference implementation. Production UI ships from `salt-software` after integrate-and-adapt (see [deployment-environments.md](docs/guides/deployment-environments.md)).

## Active rules (until Lovable capture completes)

- Use `@repo/ui` and `@repo/patterns` per [packages/ui/CLAUDE.md](packages/ui/CLAUDE.md) and [packages/patterns/CLAUDE.md](packages/patterns/CLAUDE.md)
- Match existing layouts in `app/_features/shell/` unless a migration wave explicitly replaces them
- When porting from Lovable: adapt to App Router, server actions, DAL, and Supabase RLS — do not copy Lovable data layer as-is
- Do **not** invent token palettes, colors, or typography from training data
- Do **not** enforce Linear Standard, Ramp restraint, or v2 OKLCH rules (historical)

## Phase 2 (next)

When Lovable migration Phase 2 starts, repopulate this file from **Lovable source code** (CSS/Tailwind/theme files) and align `app/tailwind-base.css` in port Wave 1.

## Historical

Previous v2 spec (~1.2k lines) lives in git history and [docs/plans/2026-05-15-design-system-v2-migration.md](docs/plans/2026-05-15-design-system-v2-migration.md) (superseded).
