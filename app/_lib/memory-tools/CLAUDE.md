# Memory Tools

> **See also:** [Primitives Overview](../../../docs/architecture/primitives.md) | [Memory Care](../../../docs/architecture/memory-care.md) | [Tools Reference](../../../docs/architecture/tools.md)

Protected tools for Memory record mutations. These enforce workspace confidence thresholds and field tiers regardless of caller (Memory Care, Ask Salt, UI, enrichment).

## Key Insight

**Protection lives in the tools, not the callers.**

```
Before (scattered):
  Caller → checks threshold → applies change
  Ask Salt → different path → might bypass

After (unified):
  Memory Care → calls memoryUpdateField → tool checks threshold + tiers
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
  source: "care",
  sourceDetails: {
    playbookSlug: "memory-records",
    ruleId: "people-rel-payment-client",
  },
});

// result.action === "applied" if confidence clears the bar
// result.action === "accumulated" if below bar
```

## How Threshold Works

1. **Tool receives call** with field, value, confidence, reason
2. **Never-touch fields** → Hard refuse at any confidence (money fields)
3. **Correction blocklist** → User-dismissed values refused for automated callers
4. **Tool gets threshold** from `workspaces.memory_care_auto_apply_threshold` via `getWorkspaceThreshold` (default **85**; result `source: "care"`)
5. **Always-auto observation fields** (email, name, phone, contact timestamps) → bar is **0**, they apply at any confidence
6. **One user-controlled bar** — every other gated field is held to the workspace threshold; tiers never raise it
7. **If confidence >= bar** → Apply to Memory, resolve evidence
8. **If confidence < bar** → Accumulate evidence (Watching)

Retired: ask-first / `approval_required` / playbook `execution-router`. Correction replaces learn-layer approval — see [Memory Care](../../../docs/architecture/memory-care.md).

## Threshold Sources

Priority order:
1. Workspace Memory Care threshold (`workspaces.memory_care_auto_apply_threshold`)
2. Global default: **85%**

Per-playbook `auto_apply_threshold` overrides are retired. The workspace threshold is the single bar for every gated field — `field-tiers.ts` tiers drive policy (never-touch refusals, destructive provenance snapshots), not higher bars.

## Entity Types

- `person` — People records
- `organization` — Organization records
- `work` — Work/project records
- `billing` — Billing records
- `meeting` — Meeting records
- `file` — File records
- `me` — Operator profile

## Tool Sources

Track who/what initiated the change (`ToolSource`):

- `care` — Memory Care (`app/_features/memory/care`)
- `playbook` — Legacy provenance from retired system playbooks (historical rows)
- `ask_salt` — Ask Salt conversation
- `manual` — User direct edit
- `enrichment` — Connector enrichment
- `cron` — Scheduled job

New care writes use `source: "care"`.

## Integration Points

| Consumer | How to Use |
|----------|------------|
| Memory Care | Call `memoryUpdateField` with `source: "care"` and tier `minThreshold` |
| Ask Salt | Call `memoryUpdateField` when user requests changes |
| Manual UI | Call `memoryUpdateField` with confidence: 100 |
| Enrichment layer | Call `memoryAccumulateEvidence` for observations |

## Result Actions

| Action | Meaning |
|--------|---------|
| `applied` | Change applied to Memory (bar cleared) |
| `accumulated` | Evidence stored, waiting for more signals |
| `rejected` | Value invalid, field doesn't exist, or never-touch refuse |
| `contradicted` | Conflicting evidence detected |

## Relation to Learning Module

This module **uses** `@/app/_lib/learning` for evidence accumulation and `field-tiers.ts` for tier policy, and adds:
- Threshold enforcement
- Direct Memory table updates
- Provenance recording
- Unified tool interface

## Field tiers (replaces ask-first)

Policy lives in `app/_lib/learning/field-tiers.ts`:

| Tier | Behavior |
|------|----------|
| standard | Workspace threshold |
| sensitive | Workspace threshold |
| destructive | Workspace threshold + provenance snapshot |
| never_touch | Refused at any confidence (billing money fields, etc.) |

Always-auto observation fields bypass gating. There is no approval queue for Memory writes.

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

## Related Plans

- [Memory Care](../../../docs/architecture/memory-care.md) — Canonical learn-layer system
- [Memory Trust Layer](../../../docs/plans/2026-07-11-memory-trust-layer.md) — Evidence chains, conflicts, rollback
- [Playbook Packages](../../../docs/plans/2026-07-11-playbook-packages.md) — Protection at tool layer architecture
