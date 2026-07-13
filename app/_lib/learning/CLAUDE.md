# Learning Infrastructure

Shared infrastructure for the LEARN → ACT → GROW loop. Evidence accumulation and signal registry powering Keeper playbooks, enrichment, and Ask Salt.

## Module Structure

```
app/_lib/learning/
├── types.ts        # Shared types (LearningEntityType, SignalDefinition, etc.)
├── evidence.ts     # Evidence accumulation with log-sigmoid confidence scoring
├── signals.ts      # Signal registry (all playbook triggers)
├── promotion.ts    # Evidence → Play promotion (Phase 5)
├── outcomes.ts     # Outcome tracking and detection (Phase 6)
├── calibration.ts  # Confidence calibration & GROW loop (Phase 7)
├── queue-budget.ts # Queue flood prevention (Phase 8)
└── index.ts        # Re-exports
```

## Evidence Accumulation

Stores observations and aggregates confidence until threshold is crossed.

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

## Signal Registry

Single source of truth for all playbook triggers. Anti-hallucination via registry-bounded signals.

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

// Get signals that can trigger action playbooks
const actionTriggers = getActingTriggerSignals();

// Get signals for a specific surface
const personSignals = getSignalsForSurface("person");
```

## Confidence Thresholds

| Use Case | Threshold |
|----------|-----------|
| Auto-apply to Memory | ≥ 90 |
| Suggest to user | 70-89 |
| Keep accumulating | < 70 |

High-stakes actions (email, invoice) may require higher thresholds regardless of confidence.

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
| Keeper playbooks | Evidence → Memory updates |
| Enrichment layer | Connector data → Evidence |
| Ask Salt | Tool execution attribution |
| Learning Tab UI | Surface accumulating evidence |
| Promotion service | Evidence → Play creation |
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

Original locations (`plays/playbooks/evidence-accumulator.ts`, `plays/playbooks/signal-registry.ts`) re-export from this module. New code should import from `@/app/_lib/learning`.
