# Playbook Schema v2

Section-based, YAML-only playbook definitions.

## Key Concepts

| Concept | Description | Example |
|---------|-------------|---------|
| **Section** | Where the playbook lives | `billing`, `relationships`, `_meta` |
| **Layer** | What it does | `learn` (memory), `act` (action) |
| **Voice** | How it sounds | `billing`, `follow-up`, `brief` |

## Directory Structure

```
playbooks/v2/
├── relationships/              # People + Orgs
│   ├── _section.yaml          # Section metadata
│   ├── memory.yaml            # LEARN: enriches records
│   └── health.yaml            # ACT: relationship health alerts
│
├── billing/                    # Cash flow
│   ├── _section.yaml
│   ├── memory.yaml            # LEARN: billing enrichment
│   ├── invoice-reminder.yaml  # ACT: payment reminders
│   └── cash-runway.yaml       # ACT: weekly cash alert
│
├── _meta/                      # Memory-wide operations
│   ├── _section.yaml
│   └── daily-briefing.yaml    # ACT: morning summary
│
└── ... (work, files, meetings, convos, me, connections)
```

## YAML Schema

```yaml
# Required fields
name: Invoice Reminder
slug: invoice-reminder          # auto-inferred from name if omitted
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing                # relationships|work|billing|files|meetings|convos|me|connections|_meta
layer: act                      # learn (memory) | act (action)
voice: billing                  # required for act-layer, forbidden for learn-layer

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
3. **Voice**: Required for `act` layer, forbidden for `learn` layer
4. **Step IDs**: Must be unique within a playbook
5. **Step references**: `forEach` must reference an existing fetch step

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
