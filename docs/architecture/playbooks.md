# Playbooks Reference

> **Playbooks are reusable orchestration logic that respond to signals using tools.**

Playbooks are the "brain" of Salt's proactive AI. They're self-contained packages (like Claude skills) with instructions, triggers, and execution code. Playbooks are **pure orchestration** — they don't enforce protection themselves; that's the tool layer's job.

---

## Playbook Structure

Each playbook is a directory with multiple files:

```
playbooks/v2/{section}/{slug}/
├── PLAYBOOK.md           # Instructions for execution (Ask Salt reads this)
├── definition.yaml       # Config (triggers, requirements, value model)
├── scripts/
│   └── run.ts            # Main execution script
├── references/           # Documentation loaded on-demand
│   ├── signals.md        # Signal definitions
│   └── fields.md         # Field schemas
└── tools.yaml            # Tools this playbook uses (reference only)
```

---

## Layers

| Layer | Purpose | Output | Examples |
|-------|---------|--------|----------|
| `learn` | Enrich Memory records | Memory updates | keeper-people-records, keeper-billing-records |
| `act` | Take actions, create outputs | Notifications, drafts | invoice-reminder, daily-briefing, cash-celebration |

**Learn playbooks** respond to signals by updating Memory fields. They use `memory_update_field` which enforces confidence thresholds.

**Act playbooks** respond to signals by creating outputs — notifications, email drafts, summaries. They may require voice profiles for consistent tone.

---

## Sections

Playbooks are organized by domain:

| Section | Domain | Examples |
|---------|--------|----------|
| `relationships` | People + Organizations | keeper-people-records, keeper-org-records |
| `work` | Projects, retainers | keeper-work-records |
| `billing` | Invoices, payments | keeper-billing-records, invoice-reminder |
| `meetings` | Meetings, agendas | keeper-meetings-records |
| `files` | Documents, contracts | keeper-files-records |
| `me` | Operator profile, business | keeper-me-records |
| `_meta` | Cross-cutting operations | daily-briefing, memory-records |

---

## definition.yaml Schema

```yaml
# Required fields
name: Invoice Reminder
slug: invoice-reminder          # Auto-inferred from name if omitted
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing                # relationships|work|billing|files|meetings|me|_meta
layer: act                      # learn | act
voice: billing                  # Required for act-layer, forbidden for learn-layer

# Triggers — when this playbook activates
triggers:
  - type: signal                # signal | schedule | pattern | chat | manual
    signals: [billing_due_date_passed]
  - type: schedule
    cron: "0 9 * * 1"           # Mondays at 9am

# Tools this playbook uses (reference, not definition)
tools:
  - memory_update_field
  - get_entity_facts
  - notify

# Optional: requirements
requirements:
  categories:
    required: [billing]         # Must have billing connector
    optional: [email]

# Optional: policy overrides
policy:
  auto_apply_threshold: 95      # Override workspace default for this playbook

# Optional: value model (for ROI tracking)
value:
  kind: invoice_collected
  estimate: 50                  # $50 average value per invocation

# Optional: instructions for LLM execution
instructions:
  system: |
    You are drafting payment reminders for freelancers.
    Be professional but not cold.
  guidelines:
    - Keep emails under 150 words
    - Always include invoice number and amount
  avoid:
    - Threatening language
    - Legal jargon
```

---

## Trigger Types

| Type | Fires When | Example |
|------|------------|---------|
| `signal` | Capture emits a workspace signal | `billing_payment_matched` |
| `schedule` | Cron spec matches | `0 9 * * 1` (Mondays 9am) |
| `pattern` | Threshold predicate on Memory | `days_since_contact >= 14` |
| `chat` | User invokes via Ask Salt | "update this person's records" |
| `manual` | User clicks "Run" in Plays UI | Direct invocation |

---

## Execution Script

The `scripts/run.ts` file contains the playbook's execution logic:

```typescript
// scripts/run.ts
import { memoryUpdateField, memoryGetFacts } from "@/app/_lib/memory-tools";
import { fillRules } from "../definition.yaml";

export interface RunInput {
  signal: string;
  entityType: string;
  entityId: string;
  workspaceId: string;
}

export async function run(input: RunInput): Promise<{
  rulesEvaluated: number;
  rulesMatched: number;
  updates: Array<{ field: string; value: string; action: string; confidence: number }>;
}> {
  // 1. Get current facts
  const facts = await memoryGetFacts(input);
  
  const updates = [];
  let rulesMatched = 0;
  
  // 2. Evaluate fill_rules
  for (const rule of fillRules) {
    if (evaluateCondition(rule.when, facts)) {
      rulesMatched++;
      
      // 3. Call protected tool - IT handles threshold
      const result = await memoryUpdateField({
        workspaceId: input.workspaceId,
        entityType: input.entityType,
        entityId: input.entityId,
        field: rule.field,
        value: rule.set.value,
        confidence: rule.confidence,
        because: rule.because,
        source: "playbook",
      });
      
      updates.push({
        field: rule.field,
        value: rule.set.value,
        action: result.action,
        confidence: rule.confidence,
      });
    }
  }
  
  return {
    rulesEvaluated: fillRules.length,
    rulesMatched,
    updates,
  };
}
```

**Key principle:** The script calls `memoryUpdateField` with a confidence score. The tool decides whether to apply or accumulate based on the workspace threshold. The playbook doesn't know or care about the threshold.

---

## Fill Rules (Learn Layer)

Learn-layer playbooks use fill rules to infer field values from signals:

```yaml
# In definition.yaml
fill_rules:
  version: 1
  fields: [relationship_type, title, org_link]
  rules:
    - id: people-rel-payment-client
      field: relationship_type
      when:
        signal: has_payment_received
        op: eq
        value: true
      set:
        value: client
      confidence: 95
      because: "Payment received indicates client relationship"
    
    - id: people-rel-invoice-client
      field: relationship_type
      when:
        signal: has_invoice_sent
        op: eq
        value: true
      set:
        value: client
      confidence: 90
      because: "Invoice sent indicates client relationship"
```

---

## Playbook Adoption

Users must "adopt" a playbook before it runs in their workspace:

```typescript
// adopt-blueprint.ts
const adoption = await adoptPlaybookBlueprint({
  workspaceId,
  blueprintSlug: "keeper-billing-records",
});

// Creates a play_template row linking workspace to blueprint
// Checks required toolkit connections
// Sets initial is_active state
```

**Adoption checks:**
1. Required toolkits connected (e.g., Gmail for email playbooks)
2. User has permission to adopt
3. Blueprint is active (not deprecated)

---

## Signal Dispatch

When a signal fires, the dispatch system finds and runs matching playbooks:

```typescript
// trigger-dispatch.ts
const results = await dispatchSignalTrigger({
  workspaceId,
  signalKey: "billing_payment_matched",
  entityId: billingRecordId,
  entitySurface: "billing",
  entityLabel: "Invoice #1234",
  evidence: { amount: 2500 },
});

// For each matching playbook:
// 1. Check if adopted and active
// 2. For profile/learn playbooks: run script directly
// 3. For acting playbooks: create play_run in "queued" state
```

---

## PLAYBOOK.md Format

The `PLAYBOOK.md` file contains instructions that Ask Salt reads:

```markdown
---
name: Memory Records
slug: memory-records
version: 2.0.0
description: Keep Memory records complete and accurate.

triggers:
  - type: signal
    signals: [person_created, person_updated, billing_payment_matched, ...]

tools:
  - memory_update_field
  - memory_get_facts
---

# Memory Records

You keep Memory records complete and accurate by learning from connected accounts.

## What You Do

When a signal arrives (new person, payment received, meeting completed), you:

1. Load the current facts for the entity
2. Evaluate the fill_rules to see what fields can be inferred
3. For each match, call `memory_update_field` with the confidence score
4. The tool handles threshold checking — you just provide the confidence

## Fill Rules

| Signal | Field | Value | Confidence |
|--------|-------|-------|------------|
| has_payment_received | relationship_type | client | 95 |
| has_invoice_sent | relationship_type | client | 90 |
| email_domain_matches_workspace | relationship_type | team | 92 |
```

---

## Creating a New Playbook

1. Create directory: `playbooks/v2/{section}/{slug}/`
2. Create `definition.yaml` with triggers, tools, and rules
3. Create `scripts/run.ts` with execution logic
4. Create `PLAYBOOK.md` with instructions
5. Run `pnpm playbooks:compile` to validate
6. Test with evals in `evals.json`

**Validation checks:**
- Slug matches directory name
- All referenced signals exist
- All referenced tools exist
- Fill rules have valid fields
- Evals pass

---

## User-Created Playbooks (Future)

Users will be able to create their own playbooks with:

1. **Sandbox execution** — isolated context
2. **Tool allowlist** — only approved tools (no destructive)
3. **Capability requirements** — declare needed connectors
4. **Approval gates** — high-impact steps require confirmation
5. **Value tracking** — measure ROI

---

## See Also

- [Primitives Overview](primitives.md) — How playbooks fit in the architecture
- [Signals Reference](signals.md) — What triggers playbooks
- [Tools Reference](tools.md) — What playbooks use
- [Playbook Schema v2](../../app/_features/plays/playbooks/schema/v2/CLAUDE.md) — YAML schema details
- [Playbook Packages Plan](../plans/2026-07-11-playbook-packages.md) — Architecture decisions
