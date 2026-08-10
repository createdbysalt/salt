# Memory Feature Module

> **See also:** [Memory Care](../../../docs/architecture/memory-care.md) | [Memory Tools](../../_lib/memory-tools/CLAUDE.md) | [Learning](../../_lib/learning/CLAUDE.md)

The Memory feature owns the `/memory` surface and the **Memory Care** background system that keeps records complete without user chore queues.

## Surface: `/memory`

| Tab | Purpose |
|-----|---------|
| **Map** | Relationship graph (`connections` feature components) |
| **Activity** | Transparency: Watching + Handled (P11: Kept out moved to Sources) |
| **Customize** | Semantic steering: per-record-type docs ("What I look for" defaults + "Your customizations"), trust threshold, learned weights |

`/connections` redirects here. Legacy `/plays?filter=learning` redirects to `/memory?tab=activity`; `?tab=filter` is a legacy alias for the Activity tab; `?tab=rules` is a legacy alias for Customize (the pre-2026-08-10 name).

## Customize = semantic steering

Memory → Customize is the **semantic steering** surface (what Salt looks for in existing and incoming records). Sources → Customize is **intake plumbing** (what reaches the stream) — same word family, different layer; don't merge them.

- `customize/` owns the machinery: `memory_customize_entries` (line-by-line, attributed, revertible), `default-guidance.ts` (Zone 1 rendered live from the field registry), `prompt-block.ts` (Track A: capped fenced block injected at the existing LLM reads — cold-intent, email analyzer, generic signal extractor, Ask Salt), `hard-exclusion.ts` + Track B in `actions.ts` (parseable exclusions compile to workspace `connector_rules` deny rules), `write-validation.ts` (refuses never-touch field writes), `correction-routing.ts` + `correction-actions.ts` (the M5 doors: corrections dialog + Ask Salt `remember_customization`).
- Honesty constraint: the same `detectHardExclusion` runs at write time and render time, so the UI badges "I always keep this out" only when a real deny rule exists.
- Care is always on — no capability toggles on the surface. The trust threshold ("How boldly I act") lives here.

## Memory Care (`care/`)

Replaces retired Keeper / `v2/_meta` system playbooks. **Not a playbook** — no Playbooks-tab presence, no approval queues, no `play_runs`.

| Path | Role |
|------|------|
| `care/capabilities/` | records, hygiene, connections, notes — emit proposals only |
| `care/decision-pipeline.ts` | apply / watch / refuse via tiered bars |
| `care/settings.ts` | `getCareThreshold`, capability enablement |
| `care/scheduler.ts` | Cron + signal + scan entry points |
| `care/intake/` | Ask Salt intake for records |

Canonical architecture: **`docs/architecture/memory-care.md`**.

### Correction over approval

Memory mutations auto-apply when confidence clears the tier bar. Users correct from Activity → Handled ("That's wrong") via rollback + `memoryRecordCorrection` / corrections actions. Approvals belong on the act layer (Plays Queue).

### Settings

- Threshold: `workspaces.memory_care_auto_apply_threshold` via `getCareThreshold` — surfaced on Customize as "How boldly I act"
- Enablement: `profile_playbook_settings` slugs `memory-*`; legacy `keeper-*` fallback
- Care is always on from the user's perspective — no capability toggles on the surface

## Directory structure

```
memory/
├── care/                 # Memory Care system
├── customize/            # Customize machinery (entries, prompt block, doors)
├── components/           # Map shell, Filter, Customize, cards
├── actions/              # Admission, handled items, evidence, corrections hooks
├── queries/              # Admission, learning evidence, handled items
├── evidence/             # Classifier + evidence queries
├── taxonomy/             # Field registry (writable contract)
└── utils/                # Learning story / display helpers
```

## Key UI

| Component | Role |
|-----------|------|
| `FilterTab.tsx` | Watching / Handled / Kept out pill |
| `WatchingSection.tsx` | Accumulating evidence |
| `HandledSection.tsx` | Auto-applied audit + correction |
| `CustomizeTab.tsx` | Two-zone doc + trust card + learned weights |
| `RememberThisDialog.tsx` | Corrections door ("Want me to remember this?") |

## Do not

- Create `play_runs` for care outcomes
- Reintroduce `_meta` / Keeper playbook packages
- Frame Filter as a "needs your call" approval queue
- Bypass memory-tools for entity writes
