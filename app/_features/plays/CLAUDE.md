# Plays Feature Module

> **See also:** [Playbooks Reference](../../../docs/architecture/playbooks.md) | [Primitives Overview](../../../docs/architecture/primitives.md) | [Billing & Metering](../../../docs/architecture/billing-metering.md)

> **Billing:** a play is billable when a tool it executed carries `external_effect`. Do not add billing logic here or to playbook definitions — metering belongs at the spend primitive. Every write of `state: 'ran'` must have a matching ledger row; `services/meter-play.ts` covers the non-executor ones.

The Plays surface is where Salt shows proactive act-layer intelligence: the approval queue, the playbook library, and the activity log of what Salt did.

> **Playbooks are act-layer only.** Learn-layer memory enrichment (the retired Keeper / `_meta` "system playbooks") now lives in **Memory Care** (`app/_features/memory/care/`) — see `docs/architecture/memory-care.md`. Memory care never creates play_runs; action findings (risk, routing) still surface here in the Queue.

## Architecture

Plays is built on the **Playbooks** primitive (see `docs/architecture/playbooks.md`):

| Concept       | Description                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| **Playbook**  | Reusable orchestration logic (signals → tools), declared in `definition.yaml` |
| **Play Run**  | Single execution instance, attributed via `source_context.playbook_slug`      |
| **Play Card** | UI representation of a queued/running play                                    |

There is no "play template" / adoption layer — playbooks are discovered from the repo and enabled per workspace via a settings toggle.

## Directory Structure

```
plays/
├── actions.ts              # Server Actions (mutations) — return ActionResult<T>
├── queries.ts              # Data fetching (incl. getPlaybookRunStats / getWorkspaceRunStats)
├── run-stats.ts            # Pure stats math (windows, medians, value estimates)
├── load-plays-page-data.ts # Page data loading
├── components/             # UI components
├── playbooks/              # Playbook engine (act-layer only)
│   ├── schema/v2/          # YAML schema parser + executor
│   ├── records-engine/     # Field/signal definitions + historical-slug display mapping
│   ├── memory-monopoly.ts  # Memory-write guardrail (parse + runtime)
│   ├── trigger-dispatch.ts # Signal → playbook dispatch (through the executor)
│   └── v2/                 # Playbook package directories (no _meta — retired)
├── play-card/              # Play card components and types
└── analytics/              # Play event tracking (play-events.ts)
```

## Terminology Note

**Players are retired.** The old "player" concept (Keeper, Scout, etc.) has been replaced by **sections**. If you see `player_slug` in database queries or old code, that's legacy. New code uses sections.

**Keeper (the memory system) is also retired.** Learn-layer memory upkeep is Memory Care (`app/_features/memory/care/`), not playbooks. Historical rows with `player_slug: "keeper"` or `keeper-*` slugs are provenance — display mapping lives in `playbooks/records-engine/memory-care-display.ts`.

| Current Term    | Purpose                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Section**     | Domain grouping (relationships, work, billing, etc.)                                                              |
| **Layer**       | `act` (create outputs). `learn` remains in the schema enum but no playbook uses it — Memory Care owns enrichment. |
| **System Play** | Atomic operation (`system:create-person`, etc.)                                                                   |

See `brand-identity/product-internal/terminology-engineering.md` and `section-capabilities.ts`.

## Playbook Engine

The playbook engine handles:

1. **Discovery** — `schema/v2/discovery.ts` finds playbook packages
2. **Parsing** — `schema/v2/parser.ts` validates YAML definitions (signals, section metadata, `tools:` allowlist, memory monopoly)
3. **Trigger dispatch** — `trigger-dispatch.ts` routes signals to playbooks and runs them through the executor (no bare-row insertion)
4. **Execution** — `schema/v2/executor.ts` runs the declarative `steps:` (fetch / classify / draft / action / branch) with per-step `approval: auto | ask` gates; `run-recording.ts` writes activity entries (`player_slug: "playbook"`)

Playbooks may **read** Memory (`memory.*` fetch steps) but never write it — `playbooks/memory-monopoly.ts` rejects mutating slugs at parse and runtime. Memory mutations belong to Memory Care and the protected memory tools.

## Key Files

| File                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `playbooks/types.ts`                | Core types (triggers, definitions)       |
| `playbooks/trigger-dispatch.ts`     | Signal → playbook dispatch               |
| `playbooks/memory-monopoly.ts`      | Memory-write guardrail (parse + runtime) |
| `playbooks/records-engine/types.ts` | Signal and field definitions             |
| `playbooks/schema/v2/CLAUDE.md`     | YAML schema documentation                |

## Plays Surface

Routes served under `/plays`:

| Tab       | Purpose                                                                         |
| --------- | ------------------------------------------------------------------------------- |
| Queue     | Needs You (findings + queued play runs) / Auto-handled                          |
| Playbooks | The playbook library (renamed from Customize; connectors moved to Sources)      |
| Activity  | Actions audit trail (play runs; the capture stream moved to Sources → Activity) |

Memory-admission decisions are **not** here — they live in Memory → Activity (`/memory?tab=activity`). Legacy `/plays?filter=learning` redirects there.

## Integration with Memory Tools

Playbooks **read** Memory via `memory.*` fetch steps. They must not call the
mutating memory tools — the monopoly guard rejects `memory_create_*` /
`memory_update_*` / link/unlink slugs in playbook definitions at parse time
and refuses them at runtime. Memory writes are owned by Memory Care and
`app/_lib/memory-tools/` (Ask Salt's human-in-chat path).

## Related

- **Primitives**: `docs/architecture/primitives.md` — Signals, Tools, Playbooks
- **Playbooks**: `docs/architecture/playbooks.md` — Playbook structure
- **Memory Tools**: `app/_lib/memory-tools/CLAUDE.md` — Protected mutations
- **Playbook Packages**: `docs/plans/2026-07-11-playbook-packages.md` — Architecture plan
- **Trust Layer**: `docs/plans/2026-07-11-memory-trust-layer.md` — Evidence chains, conflicts
