# Playbook UI Patterns

**Date:** 2026-06-20  
**Status:** Design direction (implementation deferred)  
**Audience:** Product + engineering  
**Related:** [playbook-formula.md](../architecture/playbook-formula.md)

## Goal

Playbooks should feel like **recipes**, not developer config. Non-technical users see plain language; power users can inspect the machine layer behind an explicit "Advanced" affordance.

## Progressive disclosure (three levels)

Mirrors skill-creator's metadata → body → bundled resources model:

| Level | What the user sees | Source |
|-------|-------------------|--------|
| 1 — Card | Name, Player badge, one-line purpose, reliability pill | Blueprint metadata + eval score |
| 2 — Detail | What it does, when it runs, numbered steps, what you approve | `procedure_md` sections |
| 3 — Advanced | Compiled definition JSON (read-only), required connectors | `definition`, `required_actions` |

**Copy rules:** Do not use "JSON", "assertion", or "definition" in levels 1–2. Say "steps", "checks", "recipe".

## Recipe card (Customize → Playbooks)

Each blueprint card shows:

- **Player badge** — e.g. "Follow-up play" with tone color from Player
- **Title** — blueprint `name`
- **Purpose** — one sentence from `description`
- **Step dots** — count from `definition.steps.length`
- **Reliability pill** — friendly text derived from eval benchmark: `Passes 12/12 checks` (not raw percentages)
- **Version badge** — `v3 · improved twice` when `version > 1`
- **Adopt CTA** — one-click `adoptBlueprint`; show "Adopted" + upgrade prompt when workspace template is behind blueprint version

### Connected apps row

Icons for connectors implied by `required_actions` (Gmail, Stripe, …) — same pattern as current demo `PlaybookTab`.

## Browse and adopt flow

1. Grid grouped by Player (filter popover retained).
2. Search matches name, purpose, Player name.
3. Adopt creates `play_templates` row; toast confirms.
4. If blueprint has newer version than adopted template, show inline **Upgrade available** chip.

## Trust surfaces on Play cards (Queue)

When a play run references a template:

- Footer: `{Player} · {Playbook name}` (real template name, not placeholder "Playbook").
- Expand: "Uses the Quiet Lead Nudge recipe" linking to Customize detail.
- Reliability pill optional on expanded view.

## Improvement review card

When `playbook_improvement_proposals.status = pending`:

- Title: "Salt suggests an improvement to Quiet Lead Nudge"
- Plain-language **before / after** for the changed step (from `procedure_md` diff)
- Benchmark summary: "Still passes 12/12 checks · 1 new edge case covered"
- Actions: **Approve improvement** | **Keep current recipe**

No raw JSON in default view; Advanced toggle reveals proposed `definition` diff.

## Empty states

| State | Copy |
|-------|------|
| No blueprints in registry | Internal/dev only — should not happen in prod |
| No adopted playbooks | "Adopt a recipe below — Salt runs it the same way every time." |
| Mock content off + no templates | Existing `MockContentEmptyState` pattern |

## Components to build (later)

| Component | Location |
|-----------|----------|
| `PlaybookRecipeCard` | `app/_features/plays/components/` |
| `PlaybookDetailSheet` | Same |
| `PlaybookImprovementCard` | Same |
| `PlaybookReliabilityPill` | Same |

Wire `listPlaybookBlueprints()` + `listPlayTemplates()` from [`queries.ts`](../../app/_features/plays/queries.ts) into `PlaysPage` → `CustomizeTab` → `PlaybookTab`.
