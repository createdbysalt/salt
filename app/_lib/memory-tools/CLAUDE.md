# Memory Tools

> **See also:** [Primitives Overview](../../../docs/architecture/primitives.md) | [Tools Reference](../../../docs/architecture/tools.md)

Protected tools for Memory record mutations. These enforce workspace confidence thresholds regardless of caller (playbook, Ask Salt, UI, enrichment).

## Key Insight

**Protection lives in the tools, not the callers.**

```
Before (scattered):
  Playbook → checks threshold → applies change
  Ask Salt → different path → might bypass

After (unified):
  Playbook → calls memoryUpdateField → tool checks threshold
  Ask Salt → calls memoryUpdateField → same tool, same check
```

## Available Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `memoryUpdateField` | Update a field with threshold check | **Primary tool** - use this for all Memory updates |
| `memoryAccumulateEvidence` | Add evidence without applying | When gathering observations before a decision |
| `memoryGetFacts` | Get current entity state + signals | Before evaluating rules |
| `memoryGetEvidence` | Get pending (unresolved) evidence | To see what's accumulating |
| `memoryResolveEvidence` | Mark evidence as applied/dismissed | Usually automatic via memoryUpdateField |

## Usage

```typescript
import {
  memoryUpdateField,
  memoryGetFacts,
  memoryGetEvidence,
} from "@/app/_lib/memory-tools";

// Get current facts and signals
const { facts, signals } = await memoryGetFacts({
  workspaceId,
  entityType: "person",
  entityId,
});

// Update a field (threshold-gated)
const result = await memoryUpdateField({
  workspaceId,
  entityType: "person",
  entityId,
  field: "relationship_type",
  value: "client",
  confidence: 95,
  because: "Payment received",
  source: "playbook",
  sourceDetails: {
    playbookSlug: "memory-records",
    ruleId: "people-rel-payment-client",
  },
});

// result.action === "applied" if 95 >= threshold (85)
// result.action === "accumulated" if 95 < threshold
```

## How Threshold Works

1. **Tool receives call** with field, value, confidence, reason
2. **Tool gets threshold** from workspace/playbook settings (default: 85%)
3. **If confidence >= threshold** → Apply to Memory, resolve evidence
4. **If confidence < threshold** → Accumulate evidence, wait for more signals

## Threshold Sources

Priority order:
1. Per-playbook setting (`profile_playbook_settings.auto_apply_threshold`)
2. Workspace default (future: `workspace_settings.default_confidence_threshold`)
3. Global default: **85%**

## Entity Types

- `person` — People records
- `organization` — Organization records
- `work` — Work/project records
- `billing` — Billing records
- `meeting` — Meeting records
- `file` — File records
- `me` — Operator profile

## Tool Sources

Track who/what initiated the change:

- `playbook` — Playbook rule execution
- `ask_salt` — Ask Salt conversation
- `manual` — User direct edit
- `enrichment` — Connector enrichment
- `cron` — Scheduled job

## Integration Points

| Consumer | How to Use |
|----------|------------|
| Playbook scripts | Call `memoryUpdateField` with rule confidence |
| Ask Salt | Call `memoryUpdateField` when user requests changes |
| Manual UI | Call `memoryUpdateField` with confidence: 100 |
| Enrichment layer | Call `memoryAccumulateEvidence` for observations |

## Result Actions

| Action | Meaning |
|--------|---------|
| `applied` | Change applied to Memory (threshold crossed) |
| `accumulated` | Evidence stored, waiting for more signals |
| `rejected` | Value invalid or field doesn't exist |
| `contradicted` | Conflicting evidence detected |

## Relation to Learning Module

This module **uses** `@/app/_lib/learning` for evidence accumulation but adds:
- Threshold enforcement
- Direct Memory table updates
- Provenance recording
- Unified tool interface

## Trust Layer Tools

Additional tools for the Memory Trust Layer:

| Tool | Purpose |
|------|---------|
| `memoryRollbackField` | Revert a field to previous value |
| `memoryRecordCorrection` | Record user correction for calibration |
| `memoryGetConflicts` | Get field conflicts for workspace |
| `memoryCompareDuplicates` | Compare potential duplicate records |
| `memoryMergeRecords` | Merge duplicate records |
| `memoryLinkEntities` | Create/remove entity relationships |
| `memoryArchiveRecord` | Archive a record |
| `memoryGetIncomplete` | Get incomplete records (hygiene) |
| `memoryGetStale` | Get stale records (hygiene) |
| `memoryGetOrphan` | Get orphan records (hygiene) |
| `memoryGetSimilar` | Find similar records (duplicate detection) |

## Ask-First Fields

Fields that ALWAYS require approval regardless of confidence:

```typescript
// From execution-router.ts
const ASK_FIRST_FIELDS = {
  person: ["industry", "preferred_channel"],
  organization: ["industry", "industry_parent"],
  work: ["work_type", "billing_model"],
  me: ["business_model", "pricing_model"],
  billing: ["total", "amount_paid"],
};
```

## Related Plans

- [Memory Trust Layer](../../../docs/plans/2026-07-11-memory-trust-layer.md) — Evidence chains, conflicts, rollback
- [Playbook Packages](../../../docs/plans/2026-07-11-playbook-packages.md) — Protection at tool layer architecture
