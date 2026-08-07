# Memory Feature Module

> **See also:** [Memory Care](../../../docs/architecture/memory-care.md) | [Memory Tools](../../_lib/memory-tools/CLAUDE.md) | [Learning](../../_lib/learning/CLAUDE.md)

The Memory feature owns the `/memory` surface and the **Memory Care** background system that keeps records complete without user chore queues.

## Surface: `/memory`

| Tab | Purpose |
|-----|---------|
| **Map** | Relationship graph (`connections` feature components) |
| **Filter** | Transparency: Watching / Handled / Kept out |
| **Rules** | Care capability toggles, auto-apply threshold, blocklist |

`/connections` redirects here. Legacy `/plays?filter=learning` redirects to `/memory?tab=filter`.

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

Memory mutations auto-apply when confidence clears the tier bar. Users correct from Filter → Handled ("That's wrong") via rollback + `memoryRecordCorrection` / corrections actions. Approvals belong on the act layer (Plays Queue).

### Settings

- Threshold: `workspaces.memory_care_auto_apply_threshold` via `getCareThreshold`
- Enablement: `profile_playbook_settings` slugs `memory-*`; legacy `keeper-*` fallback
- Capabilities **can** be disabled from Rules (migration comment saying otherwise is historical)

## Directory structure

```
memory/
├── care/                 # Memory Care system
├── components/           # Map shell, Filter, Rules, cards
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
| `RulesTab.tsx` | Capabilities + threshold + blocklist |
| `CareCapabilityToggle.tsx` | Per-capability on/off |

## Do not

- Create `play_runs` for care outcomes
- Reintroduce `_meta` / Keeper playbook packages
- Frame Filter as a "needs your call" approval queue
- Bypass memory-tools for entity writes
