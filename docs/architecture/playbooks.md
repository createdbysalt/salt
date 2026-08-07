# Playbooks Reference

> **Playbooks are reusable act-layer orchestration that respond to signals using tools.**

Playbooks are the "brain" of Salt's proactive **actions**. They're self-contained packages (like Claude skills) with instructions, triggers, and execution code. Playbooks are **pure orchestration** — they don't enforce Memory protection themselves; that's the tool layer's job.

**Learn-layer Memory enrichment is not a playbook.** It lives in [Memory Care](memory-care.md) (`app/_features/memory/care/`). Do not add new `learn`-layer packages or `_meta` / Keeper system playbooks.

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

## Layer

| Layer | Purpose | Output | Examples |
|-------|---------|--------|----------|
| `act` | Take actions, create outputs | Notifications, drafts, briefings, queue findings | invoice-reminder, daily-briefing, cash-celebration |

Playbooks are **act-layer only**. Memory enrichment (records, hygiene, connections, notes) is [Memory Care](memory-care.md) — proposals into a shared decision pipeline, not playbook runs.

Act playbooks create outputs — notifications, email drafts, summaries, Plays Queue items. They may require voice profiles for consistent tone.

---

## Sections

Playbooks are organized by domain:

| Section | Domain | Examples |
|---------|--------|----------|
| `relationships` | People + Organizations | relationship health alerts |
| `work` | Projects, retainers | work status alerts |
| `billing` | Invoices, payments | invoice-reminder |
| `meetings` | Meetings, agendas | meeting follow-ups |
| `files` | Documents, contracts | file-related acting playbooks |
| `me` | Operator profile, business | daily-briefing |
| `connections` | Relationship graph acting plays | connection alerts |
| `notes` | Note-related acting plays | note follow-ups |
| `communication` | Messaging / channel acting plays | draft reminders |

The retired `_meta` section (system / Keeper packages) is removed. Memory Care owns those behaviors.

---

## definition.yaml Schema

```yaml
# Required fields
name: Invoice Reminder
slug: invoice-reminder          # Auto-inferred from name if omitted
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing                # relationships|work|billing|files|meetings|me|connections|notes|communication
layer: act                      # act only — learn-layer is Memory Care
voice: billing                  # Required for act-layer

# Triggers — when this playbook activates
triggers:
  - type: signal                # signal | schedule | pattern | chat | manual
    signals: [billing_due_date_passed]
  - type: schedule
    cron: "0 9 * * 1"           # Mondays at 9am

# Tools this playbook uses (reference, not definition)
tools:
  - get_entity_facts
  - notify

# Optional: requirements
requirements:
  categories:
    required: [billing]         # Must have billing connector
    optional: [email]

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
| `chat` | User invokes via Ask Salt | "draft a reminder for this invoice" |
| `manual` | User clicks "Run" in Plays UI | Direct invocation |

---

## Execution Script

The `scripts/run.ts` file contains the playbook's execution logic. Act playbooks prepare outputs and typically create `play_runs` for approval when work leaves Salt.

```typescript
// scripts/run.ts
export interface RunInput {
  signal: string;
  entityType: string;
  entityId: string;
  workspaceId: string;
}

export async function run(input: RunInput): Promise<{
  summary: string;
  // ... playbook-specific result
}> {
  // Read Memory via tools / queries as needed
  // Draft outputs; queue for approval when external_effect applies
  return { summary: "Drafted reminder" };
}
```

**Memory mutations:** If an act flow needs a Memory write, call `memoryUpdateField` with `source: "playbook"` only for provenance of rare act-adjacent updates. Ongoing enrichment belongs in Memory Care (`source: "care"`). The tool enforces thresholds and field tiers.

---

## Memory enrichment (not playbooks)

Field fill rules, evidence accumulation, and auto-apply / watch / refuse routing live in [Memory Care](memory-care.md) and `app/_lib/learning/field-tiers.ts`. Do not add `fill_rules` learn-layer packages under `playbooks/v2/`.

---

## Playbook Adoption

Users must "adopt" a playbook before it runs in their workspace:

```typescript
// adopt-blueprint.ts
const adoption = await adoptPlaybookBlueprint({
  workspaceId,
  blueprintSlug: "invoice-reminder",
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

When a signal fires, the dispatch system finds and runs matching **act** playbooks; Memory Care handles learn-layer signals separately (`runCareForSignal`):

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

// For each matching act playbook:
// 1. Check if adopted and active
// 2. Create play_run in "queued" state (or run per policy)
// Memory Care capabilities run via care/scheduler — no play_runs
```

---

## PLAYBOOK.md Format

The `PLAYBOOK.md` file contains instructions that Ask Salt reads:

```markdown
---
name: Invoice Reminder
slug: invoice-reminder
version: 1.0.0
description: Draft payment reminders for overdue invoices.

triggers:
  - type: signal
    signals: [billing_due_date_passed]

tools:
  - get_entity_facts
  - notify
---

# Invoice Reminder

You draft payment reminders when invoices pass their due date.

## What You Do

1. Load invoice and client context from Memory
2. Draft a reminder in the workspace voice
3. Queue the draft for approval in Plays
```

---

## Creating a New Playbook

1. Create directory: `playbooks/v2/{section}/{slug}/`
2. Create `definition.yaml` with `layer: act`, triggers, tools
3. Create `scripts/run.ts` with execution logic
4. Create `PLAYBOOK.md` with instructions
5. Run `pnpm playbooks:compile` to validate
6. Test with evals in `evals.json`

**Validation checks:**
- Slug matches directory name
- All referenced signals exist
- All referenced tools exist
- Evals pass

For Memory field enrichment, extend Memory Care capabilities — do not create a learn-layer playbook.

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
- [Memory Care](memory-care.md) — Learn-layer enrichment (not playbooks)
- [Signals Reference](signals.md) — What triggers playbooks
- [Tools Reference](tools.md) — What playbooks use
- [Playbook Schema v2](../../app/_features/plays/playbooks/schema/v2/CLAUDE.md) — YAML schema details
- [Playbook Packages Plan](../plans/2026-07-11-playbook-packages.md) — Architecture decisions
