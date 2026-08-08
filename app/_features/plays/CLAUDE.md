# Plays Feature Module

> **See also:** [Playbooks Reference](../../../docs/architecture/playbooks.md) | [Primitives Overview](../../../docs/architecture/primitives.md) | [Billing & Metering](../../../docs/architecture/billing-metering.md)

> **Billing:** a play is billable when a tool it executed carries `external_effect`. Do not add billing logic here or to playbook definitions — metering belongs at the spend primitive. Every write of `state: 'ran'` must have a matching ledger row; there are ten such sites and `services/meter-play.ts` covers the non-executor ones.

The Plays surface is where Salt shows proactive act-layer intelligence: the approval queue, the playbook library, and the activity log of what Salt did.

> **Playbooks are act-layer only.** Learn-layer memory enrichment (the retired Keeper / `_meta` "system playbooks") now lives in **Memory Care** (`app/_features/memory/care/`) — see `docs/architecture/memory-care.md`. Memory care never creates play_runs; action findings (risk, routing) still surface here in the Queue.

## Architecture

Plays is built on the **Playbooks** primitive (see `docs/architecture/playbooks.md`):

| Concept | Description |
|---------|-------------|
| **Playbook** | Reusable orchestration logic (signals → tools) |
| **Play Template** | Workspace adoption of a playbook blueprint |
| **Play Run** | Single execution instance of a template |
| **Play Card** | UI representation of a queued/running play |

## Directory Structure

```
plays/
├── actions.ts              # Server Actions (mutations)
├── queries.ts              # Data fetching
├── load-plays-page-data.ts # Page data loading
├── components/             # UI components
├── playbooks/              # Playbook engine (act-layer only)
│   ├── schema/v2/          # YAML schema parser
│   ├── records-engine/     # Field/signal definitions + historical-slug display mapping
│   ├── routing-evals/      # Playbook routing tests
│   └── v2/                 # Playbook package directories (no _meta — retired)
├── play-card/              # Play card components and types
└── analytics/              # Play analytics
```

## Terminology Note

**Players are retired.** The old "player" concept (Keeper, Scout, etc.) has been replaced by **sections**. If you see `player_slug` in database queries or old code, that's legacy. New code uses sections.

**Keeper (the memory system) is also retired.** Learn-layer memory upkeep is Memory Care (`app/_features/memory/care/`), not playbooks. Historical rows with `player_slug: "keeper"` or `keeper-*` slugs are provenance — display mapping lives in `playbooks/records-engine/memory-care-display.ts`.

| Current Term | Purpose |
|--------------|---------|
| **Section** | Domain grouping (relationships, work, billing, etc.) |
| **Layer** | `act` (create outputs). `learn` remains in the schema enum but no playbook uses it — Memory Care owns enrichment. |
| **System Play** | Atomic operation (`system:create-person`, etc.) |

See `brand-identity/product-internal/terminology-engineering.md` and `section-capabilities.ts`.

## Playbook Engine

The playbook engine handles:

1. **Discovery** — `schema/v2/discovery.ts` finds playbook packages
2. **Parsing** — `schema/v2/parser.ts` validates YAML definitions
3. **Trigger dispatch** — `trigger-dispatch.ts` routes signals to playbooks
4. **Execution** — package scripts + `run-recording.ts` writes activity entries (`player_slug: "playbook"`)

Memory-directed writes from playbooks go through the protected memory tools (below), which enforce tiered confidence bars — the same gate Memory Care uses.

## Key Files

| File | Purpose |
|------|---------|
| `playbooks/types.ts` | Core types (triggers, blueprints, evals) |
| `playbooks/trigger-dispatch.ts` | Signal → playbook routing |
| `playbooks/execution-router.ts` | Confidence-gated routing (`auto_execute` / `accumulate`) — shared substrate with Memory Care |
| `playbooks/records-engine/types.ts` | Signal and field definitions |
| `playbooks/schema/v2/CLAUDE.md` | YAML schema documentation |

## Plays Surface

Routes served under `/plays`:

| Tab | Purpose |
|-----|---------|
| Queue | Needs You (findings + queued play runs) / Auto-handled |
| Playbooks | The playbook library (renamed from Customize; connectors moved to Sources) |
| Activity | Actions audit trail (play runs; the capture stream moved to Sources → Activity) |

Memory-admission decisions are **not** here — they live in Memory → Filter (`/memory?tab=filter`). Legacy `/plays?filter=learning` redirects there.

## Integration with Memory Tools

Plays uses the protected Memory tools from `app/_lib/memory-tools/`:

```typescript
import { memoryUpdateField, memoryGetFacts } from "@/app/_lib/memory-tools";

// Playbooks call these — tools enforce thresholds
const result = await memoryUpdateField({
  workspaceId,
  entityType: "person",
  field: "relationship_type",
  value: "client",
  confidence: 95,
  because: "Payment received",
  source: "playbook",
});
```

## Related

- **Primitives**: `docs/architecture/primitives.md` — Signals, Tools, Playbooks
- **Playbooks**: `docs/architecture/playbooks.md` — Playbook structure
- **Memory Tools**: `app/_lib/memory-tools/CLAUDE.md` — Protected mutations
- **Playbook Packages**: `docs/plans/2026-07-11-playbook-packages.md` — Architecture plan
- **Trust Layer**: `docs/plans/2026-07-11-memory-trust-layer.md` — Evidence chains, conflicts
