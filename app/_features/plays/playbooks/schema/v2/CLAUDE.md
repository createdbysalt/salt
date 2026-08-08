# Playbook Schema v2

Section-based, YAML-only playbook definitions.

> **Playbook not showing in UI?** See [`docs/guides/playbook-troubleshooting.md`](../../../../../docs/guides/playbook-troubleshooting.md) — invalid playbooks are silently dropped. Run `curl localhost:3000/api/debug/playbooks | jq '.allErrors'` to see validation errors.

## Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Section** | Where the playbook lives | `billing`, `relationships` |
| **Layer** | What it does | `act` (action); `learn` remains in the schema but is unused — see below |
| **Voice** | How it sounds | `billing`, `follow-up`, `brief` |

> **Playbooks are act-layer only.** The `_meta` section and its four learn-layer "system playbooks" (memory-records, memory-hygiene, connections, notes) were retired on 2026-08-06 and replaced by the **Memory Care** module (`app/_features/memory/care/`). Learn-layer enrichment is not a playbook concern — see `docs/architecture/memory-care.md`. The `learn` enum value remains in the schema for backward compatibility, but no shipped playbook uses it.

## Directory Structure

```
playbooks/v2/
├── relationships/              # People + Orgs
│   ├── _section.yaml          # Section metadata
│   ├── follow-up/             # ACT: follow-up drafts
│   └── health/                # ACT: relationship health alerts
│
├── billing/                    # Cash flow
│   ├── _section.yaml
│   ├── invoice-reminder/      # ACT: payment reminders
│   └── cash-runway/           # ACT: weekly cash alert
│
├── me/                         # Operator
│   ├── _section.yaml
│   └── daily-briefing/        # ACT: morning summary (moved from retired _meta)
│
└── ... (work, files, meetings, communication, connections, capture)
```

## YAML Schema

```yaml
# Required fields
name: Invoice Reminder
slug: invoice-reminder          # auto-inferred from name if omitted
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing                # relationships|work|billing|files|meetings|communication|me|connections|capture
layer: act                      # act (action) — learn is retired to Memory Care
voice: billing                  # required for act-layer

trigger:
  type: signal                  # signal | schedule | manual
  signal: billing_due_date_passed

# Optional fields
requirements:
  categories:
    required: [billing]
    optional: [email]
  capabilities:
    required: [read_invoices]

steps:
  - step: fetch
    id: overdue_invoices
    from: billing.read_invoices
    where: { status: overdue }

  - step: classify
    id: tone
    forEach: overdue_invoices
    rules:
      - if: "payment_history.on_time >= 3"
        then: gentle
    else: professional

  - step: draft
    id: reminder_email
    prompt: |
      Draft a {{tone}} payment reminder.
    max_tokens: 200

output:
  type: email_draft             # email_draft|notification|memory_update|finding|briefing
  approval: per_entity          # none|per_entity|batch

value:
  kind: invoice_collected
  estimate: 50

# Instructions - guides playbook behavior (like Claude skills)
instructions:
  system: |
    You are drafting payment reminders for freelancers.
    Be professional but not cold. Reference specific invoice details.
  guidelines:
    - Keep emails under 150 words
    - Always include the invoice number and amount
    - Reference the client relationship positively
  avoid:
    - Threatening language
    - Legal jargon
    - Multiple exclamation marks
  examples:
    - label: Gentle reminder for good client
      content: |
        Hi Sarah,
        
        Quick note about invoice #1234 for $2,500 - it was due last Friday.
        I know things get busy! Let me know if you need anything from my end.
        
        Best,
        [Name]
      context: Use for clients with good payment history
  references:
    - label: Company tone guide
      type: url
      value: https://notion.so/company/tone-guide
      notes: Follow section on "Professional but warm"
    - label: Invoice template
      type: file
      value: templates/invoice-reminder.md
```

## Validation Rules

1. **Slug**: Auto-inferred from name if not provided
2. **Signal**: Must exist in the signal registry
3. **Voice**: Required for `act` layer (all current playbooks)
4. **Step IDs**: Must be unique within a playbook
5. **Step references**: `forEach` must reference an existing fetch step
6. **value.estimate**: Must be >= 0 (not negative)
7. **output.type**: Must be one of: `email_draft`, `notification`, `memory_update`, `finding`, `briefing`

## YAML Gotchas

**Quote strings with colons** — YAML interprets `key: value` as a mapping:

```yaml
# ❌ WRONG - parsed as nested object
guidelines:
  - Create labels: Action, Money

# ✓ RIGHT - quoted string  
guidelines:
  - "Create labels: Action, Money"
```

**Escape quotes** — apostrophes in strings can break parsing:

```yaml
# ❌ WRONG
- "It's been a while" or similar

# ✓ RIGHT
- '"It''s been a while" or similar'
```

## Usage

```typescript
import { parsePlaybookV2Yaml, discoverV2Playbooks } from "./schema/v2";

// Parse a single playbook
const result = parsePlaybookV2Yaml(yamlContent);
if (result.validationErrors.length > 0) {
  console.error(result.validationErrors);
} else {
  console.log(result.definition);
}

// Discover all playbooks
const { sections, allPlaybooks, errors } = discoverV2Playbooks();
console.log(`Found ${allPlaybooks.length} playbooks in ${sections.size} sections`);
```

## Migration from v1

| v1 | v2 |
|----|-----|
| `playbook.md` + `definition.yaml` | Single `.yaml` file |
| `kind: profile` | `layer: learn` |
| `kind: acting` | `layer: act` |
| `player_slug: billing` | `voice: billing` |
| Flat directory | Section-based (`billing/`, `work/`, etc.) |

Use `inferSectionFromSlug()` and `mapV1LayerToV2()` for migration helpers.

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Type definitions |
| `schema.ts` | Zod schemas |
| `parser.ts` | YAML parsing and validation |
| `discovery.ts` | Filesystem playbook discovery |
| `parser.test.ts` | Unit tests |
