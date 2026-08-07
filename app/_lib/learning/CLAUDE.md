# Learning Infrastructure

Shared infrastructure for the LEARN → ACT → GROW loop. Evidence accumulation, field tiers, and signal registry powering **Memory Care**, enrichment, and Ask Salt.

## Module Structure

```
app/_lib/learning/
├── types.ts         # Shared types (LearningEntityType, SignalDefinition, etc.)
├── evidence.ts      # Evidence accumulation with log-sigmoid confidence scoring
├── field-tiers.ts   # Tiered bars: standard / sensitive / destructive / never_touch
├── signals.ts       # Signal registry (playbook + care triggers)
├── outcomes.ts      # Outcome tracking and detection
├── calibration.ts   # Confidence calibration & GROW loop
├── queue-budget.ts  # Queue flood prevention (act-layer Plays)
├── emit-signal.ts   # Inline entity signal emission
├── watches.ts       # Cross-entity reactive watches
└── index.ts         # Re-exports
```

## Evidence Accumulation

Stores observations and aggregates confidence until the bar is crossed.

**Key concepts:**
- **Log-sigmoid scoring**: First mentions matter most, diminishing returns
- **Source diversity bonus**: Email + meeting > 2 emails
- **Field-specific TTL**: email = never, role = 30d, classification = 90d
- **Contradiction handling**: Resets confidence, waits for tie-breaker

```typescript
import {
  accumulateEvidence,
  getAggregatedConfidence,
  resolveEvidence,
} from "@/app/_lib/learning";

// Add evidence
const { evidenceId, aggregatedConfidence } = await accumulateEvidence({
  workspaceId: "...",
  entityType: "person",
  entityId: "...",
  fieldPath: "company_name",
  proposedValue: "Acme Corp",
  confidence: 70,
  evidenceType: "email_match",
  sourceType: "gmail",
});

// Check aggregated confidence
const agg = await getAggregatedConfidence(
  workspaceId,
  "person",
  personId,
  "company_name"
);

if (agg && agg.aggregatedConfidence >= 90) {
  // Apply to Memory, resolve evidence
  await resolveEvidence(workspaceId, agg.evidenceIds, "applied");
}
```

## Field Tiers

`field-tiers.ts` is the shared policy for how aggressively a Memory write may apply. Used by Memory Care (`decision-pipeline.ts`) and `memoryUpdateField`.

| Tier | Bar | Examples |
|------|-----|----------|
| standard | Workspace threshold (default 85) | Notes, preferences |
| sensitive | `max(threshold, 95)` | Industry, relationship type, first-time classifications |
| destructive | `max(threshold, 95)` | Status → past_client / completed / void |
| never_touch | Refused | Billing total / amount_paid, money-model fields |

See [Memory Care](../../../docs/architecture/memory-care.md).

## Signal Registry

Single source of truth for triggers. Anti-hallucination via registry-bounded signals.

```typescript
import {
  SIGNAL_REGISTRY,
  isValidSignalKey,
  getActingTriggerSignals,
  getSignalsForSurface,
} from "@/app/_lib/learning";

// Validate a signal key
if (!isValidSignalKey(key)) {
  throw new Error(`Unknown signal: ${key}`);
}

// Get signals that can trigger act playbooks
const actionTriggers = getActingTriggerSignals();

// Get signals for a specific surface
const personSignals = getSignalsForSurface("person");
```

## Confidence Thresholds

Workspace auto-apply bar lives on `workspaces.memory_care_auto_apply_threshold` (default **85**), read via Memory Care `getCareThreshold` / memory-tools `getWorkspaceThreshold`. Tier floors raise sensitive/destructive fields to **95**. Below the bar → Watching (accumulate); never-touch → refuse.

High-stakes **act** actions (email, invoice) still require Plays approval regardless of Memory confidence.

## Entity Types

- `person` — People in Memory
- `organization` — Organizations in Memory
- `work` — Work/projects
- `meeting` — Meetings
- `file` — Files
- `me` — Operator profile
- `billing` — Billing records

## Integration Points

| Consumer | Purpose |
|----------|---------|
| Memory Care | Evidence → tiered apply / watch / refuse → Memory updates |
| Enrichment layer | Connector data → Evidence |
| Ask Salt | Tool execution attribution |
| Memory → Filter | Watching / Handled surfaces |
| Entity CRUD actions | Inline signal emission |
| Watch system | Cross-entity reactive signals |

## Signal Emission

Fire-and-forget signal emission when entities change:

```typescript
import { emitEntitySignal } from "@/app/_lib/learning";

// In a create action
emitEntitySignal({
  workspaceId,
  surface: "person",
  entityId: person.id,
  signal: "person_created",
  entityLabel: person.name,
  evidence: { source: "manual_create" },
});
```

## Entity Watch System

"When X happens, start watching for Y" - enables reactive cross-entity signals:

```typescript
import { registerEntityWatch } from "@/app/_lib/learning";

// When a person is created, watch for emails from them
await registerEntityWatch({
  workspaceId,
  watchedEntity: { type: "person", id: person.id },
  watchForSignals: ["capture_email_received"],
  filterCriteria: { from_email: person.email },
  onMatch: { signal: "person_email_received" },
  expiresInDays: 90,
});
```

## Backward Compatibility

Original locations (`plays/playbooks/evidence-accumulator.ts`, `plays/playbooks/signal-registry.ts`) may re-export from this module. New code should import from `@/app/_lib/learning`.
