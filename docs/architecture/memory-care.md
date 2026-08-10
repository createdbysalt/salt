# Memory Care

> **Memory Care is the learn-layer system that keeps Memory complete, clean, connected, and noted.** It replaces the retired Keeper / system-playbook packages (`v2/_meta/`). It is not a playbook.

Canonical module: **`app/_features/memory/care/`**.

---

## Concept

Salt maintains Memory in the background. Capabilities emit **proposals only**. A shared decision pipeline applies, watches, or refuses each proposal by tiered confidence bars. Users never approve Memory mutations up front — they correct wrong Handled writes from Memory → Activity. Approvals stay on the act layer (Plays Queue).

| Concern | Owner |
|---------|--------|
| Enrich / relate / maintain / journal | Four care capabilities |
| Apply / watch / refuse | Decision pipeline + field tiers |
| Entity writes | `app/_lib/memory-tools` |
| Configuration | Memory → Rules |
| Transparency | Memory → Activity (`?tab=filter` is a legacy alias) |

---

## Flow

```mermaid
flowchart LR
    subgraph intake [Sources]
        Stream["Stream — captures arrive"]
    end
    subgraph care ["Memory Care - background, not playbooks"]
        Caps["4 capabilities emit proposals only: records / hygiene / connections / notes"]
        Gate["Shared decision pipeline: threshold gate"]
        Caps --> Gate
    end
    subgraph memory [Memory]
        Map["Map"]
        Filter["Filter — Watching / Handled (P11: Kept out in Sources)"]
        Rules["Rules — capabilities on/off + threshold (blocklist in Sources)"]
    end
    Stream -->|"evidence"| Caps
    Gate -->|"confidence >= bar"| Handled["Auto-applied - reversible - Handled"]
    Gate -->|"below bar"| Watching["Watching — evidence accumulates"]
    Gate -->|"never-touch fields"| Blocked["Never auto-written"]
    Watching -->|"crosses bar later"| Handled
    Rules -->|"shapes"| Gate
    Filter -->|"corrections become lessons"| Rules
```

---

## Module layout

```
app/_features/memory/care/
├── index.ts                 # Public API
├── types.ts                 # Capabilities, proposals, decisions
├── settings.ts              # Threshold + enablement accessors
├── decision-pipeline.ts     # apply / watch / refuse + P8 weight lookup
├── scheduler.ts             # Cron + signal + on-demand entry points
├── actions.ts               # Server actions for Rules UI
├── capabilities/
│   ├── records.ts
│   ├── hygiene.ts
│   ├── connections.ts
│   └── notes.ts
├── reflection/              # P8 pattern-level learning
│   ├── types.ts             # ReflectionTrigger, SignalSourceWeight
│   ├── triggers.ts          # incrementReflectionTrigger
│   ├── weights.ts           # getSignalSourceWeight
│   ├── reflection-pass.ts   # runReflectionPass, weekly scan
│   └── index.ts
└── intake/                  # Ask Salt intake for records (chat.yaml + PLAYBOOK.md)
```

Entry points:

| Caller | Function |
|--------|----------|
| Cron (`playbook-schedules`) | `runDueCareCapabilities` |
| Signal dispatch | `runCareForSignal` |
| Sync & Scan | `runCareCapability` / `runRecordsForWorkspace` |

Activity metadata uses `source: "memory-care"` only (no `player_slug`). Plays Activity excludes these rows — Care transparency lives on Memory → Activity and record Activity timelines.

**Ask Salt:** record creation uses `load_memory_intake` + `parse_intake` against `care/intake/`. It is not a playbook and must not call `propose_play`.

---

## Capabilities

Capabilities **never write Memory directly**. They emit `CareProposal`s into `processCareProposal` (or call `memoryUpdateField` with a bar from `getCareFieldBar`).

| Capability | Settings slug | Role |
|------------|---------------|------|
| `records` | `memory-records` | Keep people / org / work / billing / meeting fields complete (scheduled scan covers all five; files enrich event-driven only — classifier on ingest, signature webhooks — since no file signal is DB-derivable) |
| `hygiene` | `memory-hygiene` | Merges, formatting, stale/orphan cleanup |
| `connections` | `memory-connections` | Infer and strengthen entity links |
| `notes` | `memory-notes` | Synthesize durable notes |

**Capabilities can be disabled.** Memory → Rules toggles persist in `profile_playbook_settings` (`blueprint_slug` = settings slug). Missing rows mean **enabled** (opt-out). Legacy `keeper-*` slugs are read as fallbacks in `care/settings.ts`.

> Historical note: migration `20260711160000_playbook_enabled_flag.sql` commented that system playbooks cannot be disabled. That comment is obsolete. The live contract is Rules toggles + `isCareCapabilityEnabled`.

---

## Enrichment modes (founder-locked, 2026-08-08)

Two modes, decided by **who initiated** (memory-vision W2):

| Mode | When | Behavior |
|------|------|----------|
| **Active** | Record creation via Ask Salt | The intake procedure mandates `enrich_entity` (Composio search across connected providers) before every `memory_create_*`. `apply_enrichment` then routes each field through `memoryUpdateField` — confident fields apply, uncertain fields land in Watching. |
| **Passive** | Everything ongoing | Salt learns only from captures as they arrive. Background scans (cron, Sync & Scan) evaluate **already-known** signals — they never search connected accounts. Gaps without inbound data stay gaps. |

Rationale: proactive background searching feels invasive and burns connector API spend. A user asking Salt about an entity in chat may trigger enrichment — that is user-initiated, not proactive.

Both modes end at the same gate: enrichment writes go through the protected memory tools (threshold, tiers, correction blocklist). Implementation: **`app/_lib/composio/enrichment/`** (search) and **`app/_lib/composio/enrichment/apply.ts`** (threshold routing).

---

## Decision pipeline

`decision-pipeline.ts` + `app/_lib/learning/field-tiers.ts` replace the retired playbook `execution-router` / confidence-gate approval path.

| Outcome | When | Effect |
|---------|------|--------|
| `apply` | Aggregated confidence ≥ tier bar | Caller writes via memory-tools; pipeline records learning + Handled activity |
| `watch` | Below bar | Evidence in `entity_evidence`; Watching activity; **no** `play_runs` |
| `refuse` | Never-touch field, or value previously corrected by the user | No write, no evidence, no queue. The correction blocklist (**`app/_lib/learning/correction-blocklist.ts`**, 6-month TTL) is checked before anything accumulates; manual user writes bypass it |

### Tiered bars

| Tier | Bar | Examples |
|------|-----|----------|
| standard | Workspace threshold (default **85**) | Notes, preferences, addresses |
| sensitive | `max(threshold, 95)` | Industry, relationship type, first-time classifications |
| destructive | `max(threshold, 95)` + provenance snapshot | Status → `past_client` / `completed` / `void` |
| never_touch | Refused at any confidence | Billing `total` / `amount_paid`, money-model fields |

Low-risk observation fields (names, emails, `last_contacted_at`, …) bypass gating (`isAlwaysAutoField`).

There is **no** `approval_required` path in the learn layer. Correction replaces approval.

### P8 Reflection Pass (Pattern-Level Learning)

When corrections cluster on a signal source + field type (e.g., "email signature role extractions"), Salt learns to be more cautious without blocking the source entirely.

```
correction_events (with signal_source)
        ↓
  reflection_triggers (workspace, category, count)
        ↓ threshold=5
  reflection_pass.ts → compute weight adjustment
        ↓
  signal_source_weights (workspace, source, field, weight)
        ↓
  decision-pipeline.ts reads weight, applies to confidence
```

**Weight formula:** `weight = max(0.5, 1 - (correction_count * 0.1))`

- Floor of **0.5** — source stays useful, just more cautious
- 5 corrections trigger reflection; 3+ in a cluster to adjust

**Trigger conditions:**
1. **Threshold-based:** 5 corrections on a category triggers immediate reflection
2. **Weekly batch:** Sunday 4am cron catches low-activity workspaces

**Module:** `app/_features/memory/care/reflection/`

| File | Role |
|------|------|
| `types.ts` | `ReflectionTrigger`, `SignalSourceWeight`, config constants |
| `triggers.ts` | `incrementReflectionTrigger` — called from corrections |
| `weights.ts` | `getSignalSourceWeight` — called from decision pipeline |
| `reflection-pass.ts` | `runReflectionPass`, `runPendingReflections`, `runFullReflectionScan` |
| `index.ts` | Re-exports |

**Cron:** `/api/cron/memory-reflection` — weekly full scan

---

## No play_runs

Memory Care never creates `play_runs`. Historical keeper / memory-records runs may remain in the DB for audit; UI display maps them to Memory Care labels. Act-layer risk/routing findings still use the Plays Queue.

---

## Memory surface

Route: `/memory`

| Tab | Role |
|-----|------|
| **Map** | Graph of records and relationships |
| **Activity** | Transparency: **Watching** / **Handled** (`?tab=filter` is a legacy alias) |
| **Rules** | Capability toggles + auto-apply threshold |

**Kept out** (admission noise/drop/held) and the admission **blocklist** live on **Sources → Activity**, not here — they describe what never entered Memory.

### Activity

- **Watching** — evidence below bar; optional nudges teach, never chore queues
- **Handled** — auto-applied writes with why + **"That's wrong"** → rollback + correction → lesson

Activity is a window into what Salt is doing, not a work queue. No nav/HQ badge counts for Watching.

### Rules

- Capability on/off (`getCareCapabilityStates` / Rules UI)
- Workspace threshold slider → `workspaces.memory_care_auto_apply_threshold`
- Blocklist management links out to Sources → Activity → Kept Out (where it lives)

---

## Settings

Owned by **`care/settings.ts`**:

| Setting | Storage | Accessor |
|---------|---------|----------|
| Auto-apply threshold | `workspaces.memory_care_auto_apply_threshold` (renamed from `keeper_auto_execute_threshold`) | `getCareThreshold` |
| Capability enablement | `profile_playbook_settings` with slugs `memory-records` / `memory-hygiene` / `memory-connections` / `memory-notes`; legacy `keeper-*` fallback | `getCareCapabilityStates`, `isCareCapabilityEnabled` |

`memoryUpdateField` reads the same column via `getWorkspaceThreshold` (`source: "care"`). Per-playbook threshold overrides are retired.

Tool calls from care use `source: "care"`.

---

## Hard constraints

1. Capabilities emit proposals; memory-tools perform writes.
2. Never create `play_runs` for Memory Care.
3. Never auto-write never-touch (money) fields.
4. Meter LLM spend at `_lib/ai` primitives — not at capabilities.
5. Care ops are internal (no `external_effect`); not billable as Plays.
6. Do not reintroduce `_meta` playbook packages or Keeper naming in new code.

---

## See also

- [Primitives Overview](primitives.md)
- [Playbooks Reference](playbooks.md) — act-layer only
- [Legacy naming](legacy-naming.md) — Keeper / `_meta` retirement
- [Memory Tools](../../app/_lib/memory-tools/CLAUDE.md)
- [Learning Infrastructure](../../app/_lib/learning/CLAUDE.md)
- [Memory feature](../../app/_features/memory/CLAUDE.md)
