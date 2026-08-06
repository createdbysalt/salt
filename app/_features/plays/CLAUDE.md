# Plays Feature Module

> **See also:** [Playbooks Reference](../../../docs/architecture/playbooks.md) | [Primitives Overview](../../../docs/architecture/primitives.md) | [Billing & Metering](../../../docs/architecture/billing-metering.md)

> **Billing:** a play is billable when a tool it executed carries `external_effect`. Do not add billing logic here or to playbook definitions — metering belongs at the spend primitive. Every write of `state: 'ran'` must have a matching ledger row; there are ten such sites and `services/meter-play.ts` covers the non-executor ones.

The Plays surface is where Salt shows proactive intelligence: queued proposals, activity stream, playbook management, and the Trust dashboard.

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
├── playbooks/              # Playbook engine
│   ├── schema/v2/          # YAML schema parser
│   ├── records-engine/     # Learn-layer rule evaluation
│   ├── routing-evals/      # Playbook routing tests
│   └── v2/                 # Playbook package directories
├── play-card/              # Play card components and types
└── analytics/              # Trust dashboard analytics
```

## Terminology Note

**Players are retired.** The old "player" concept (Keeper, Scout, etc.) has been replaced by **sections**. If you see `player_slug` in database queries or old code, that's legacy. New code uses sections.

| Current Term | Purpose |
|--------------|---------|
| **Section** | Domain grouping (relationships, work, billing, etc.) |
| **Layer** | learn (enrich Memory) vs act (create outputs) |
| **System Play** | Atomic operation (`system:create-person`, etc.) |

See `brand-identity/product-internal/terminology-engineering.md` and `section-capabilities.ts`.

## Playbook Engine

The playbook engine handles:

1. **Discovery** — `schema/v2/discovery.ts` finds playbook packages
2. **Parsing** — `schema/v2/parser.ts` validates YAML definitions
3. **Trigger dispatch** — `trigger-dispatch.ts` routes signals to playbooks
4. **Execution** — `scripts/run.ts` in each package
5. **Evidence** — `records-engine/` evaluates fill rules

## Key Files

| File | Purpose |
|------|---------|
| `playbooks/types.ts` | Core types (triggers, blueprints, evals) |
| `playbooks/trigger-dispatch.ts` | Signal → playbook routing |
| `playbooks/execution-router.ts` | Confidence-gated execution |
| `playbooks/records-engine/types.ts` | Signal and field definitions |
| `playbooks/schema/v2/CLAUDE.md` | YAML schema documentation |

## Plays Surface

Routes served under `/plays`:

| Tab | Purpose |
|-----|---------|
| Activity | Capture stream + play runs |
| Playbooks | Manage adopted playbooks |
| Trust | Accuracy metrics, conflicts, corrections |

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
