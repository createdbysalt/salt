---
name: playbook-creator
description: >-
  Author, validate, and edit Salt playbooks (v2 YAML format). Use whenever
  creating or editing playbook YAML files, adding triggers, writing steps,
  or configuring playbook workflows. This skill should trigger when the user
  says "playbook", "recipe", "automation", "play", "workflow", or asks
  how Salt should handle something automatically.
disable-model-invocation: true
---

# Playbook Creator (v2)

Salt playbooks are YAML files that define automated workflows. They live in `app/_features/plays/playbooks/v2/` organized by section.

## Directory Structure

```
playbooks/v2/
├── relationships/           # People & Orgs
│   ├── _section.yaml       # Section metadata
│   ├── follow-up/          # Package-style playbook
│   │   ├── definition.yaml
│   │   └── PLAYBOOK.md
│   └── health/
├── work/                   # Projects & tasks
├── billing/                # Invoices & payments
├── files/                  # Documents
├── meetings/               # Scheduled time
├── communication/          # Email digests, triage
├── capture/                # Intake-related act plays
└── me/                     # Operator (daily-briefing lives here)
```

> **No `_meta/` section.** The learn-layer "system playbooks" (memory-records, memory-hygiene, connections, notes) were retired 2026-08-06 and replaced by **Memory Care** (`app/_features/memory/care/`). Learn-layer memory upkeep is not a playbook — see `docs/architecture/memory-care.md`. Playbooks are act-layer only.

## Playbook Types

| Type | Layer | Toggle | Use Case |
|------|-------|--------|----------|
| **Regular** | `act` | User can toggle | User-facing automations |
| **Package** | `act` | Depends | Complex playbooks with scripts/references |

## YAML Schema

```yaml
# Required fields
name: Invoice Reminder
slug: invoice-reminder           # Auto-inferred from name if omitted
version: 1.0.0
description: Drafts payment reminders for overdue invoices

section: billing                 # relationships|work|billing|files|meetings|communication|capture|me
layer: act                       # act only — learn-layer is Memory Care, not playbooks

# Trigger (single)
trigger:
  type: signal                   # signal | schedule | manual
  signal: billing_due_date_passed

# OR Multiple triggers
triggers:
  - type: signal
    signal: capture_processed
  - type: schedule
    cron: "0 2 * * 0"            # Weekly Sunday 2am

# Action playbooks require voice
voice: billing                   # billing | follow-up | brief

# Steps define the workflow
steps:
  - step: fetch
    id: overdue_invoices
    from: billing.read_invoices
    where: { status: overdue }

  - step: classify
    id: tone
    input: overdue_invoices      # Reference a fetch step
    rules:
      - if: "payment_history.on_time >= 3"
        then: gentle
    else: professional

  - step: draft
    id: reminder_email
    prompt: |
      Draft a {{tone}} payment reminder.
    max_tokens: 200

  - step: action
    tool: send_email_draft
    args:
      to: "{{invoice.billing_email}}"
      subject: "Payment reminder"
      body: "{{reminder_email}}"
    needsApproval: true

output:
  type: email_draft              # email_draft|notification|memory_update|finding|briefing
  approval: per_entity           # none|per_entity|batch

value:
  kind: invoice_collected
  estimate: 50
```

## Step Types

| Step | Purpose | Required Fields |
|------|---------|-----------------|
| `fetch` | Query data | `id`, `from`, `where?`, `select?`, `limit?` |
| `classify` | Route with rules | `id`, `input` or `forEach`, `rules`, `else?` |
| `draft` | Generate text | `id`, `prompt`, `max_tokens?` |
| `action` | Call a tool | `tool`, `args?`, `needsApproval?` |
| `branch` | Conditional routing | `if?`, `switch?`, `cases?`, `goto?` |
| `forEach` | Loop over list | `id`, `over`, `steps` |
| `compute` | Calculate value | `id`, `value` |
| `label` | Jump target | `id` |
| `goto` | Jump to label | `target` |

## Layer Rules

| Layer | Voice | Policy | Steps | Output |
|-------|-------|--------|-------|--------|
| `act` | Required | Optional | Required | Any |

The `learn` enum value remains in the schema for backward compatibility, but no playbook uses it — learn-layer enrichment is Memory Care (`app/_features/memory/care/`).

## Creating a New Playbook

1. **Choose section**: Where does this belong? (`billing`, `relationships`, `work`, `meetings`, etc.)

2. **Layer is always `act`**: playbooks produce user-facing output. If you're building memory/profile upkeep, that's a Memory Care capability, not a playbook.

3. **Define trigger**:
   - `signal`: Fires on entity events (see signal registry)
   - `schedule`: Cron expression for periodic runs
   - `manual`: User-initiated only

4. **Write steps**: Start with `fetch`, then `classify`/`branch`, then `draft`/`action`

5. **Test**: Restart dev server, check `/plays?tab=playbooks`

## Signal Registry

Valid signals are defined in:
- `app/_lib/learning/signals.ts` - CAPTURE_SIGNAL_DESCRIPTIONS
- `app/_features/plays/playbooks/records-engine/types.ts` - CAPTURE_SIGNAL_KEYS

Common signals:
```
person_created, person_updated, person_no_contact_30_days
org_created, org_updated
work_created, work_updated, work_is_blocked
billing_created, billing_due_date_passed, billing_payment_matched
meeting_created, meeting_end_passed
capture_email_received, capture_email_sent, capture_processed
connection_inferred, relationship_at_risk
```

## Memory Care (not playbooks)

Learn-layer memory upkeep (record enrichment, hygiene, connections, notes) is **Memory Care** — typed TypeScript capabilities in `app/_features/memory/care/`, scheduled by `care/scheduler.ts`, gated by the shared decision pipeline with tiered confidence bars. Do not author these as YAML playbooks. See `docs/architecture/memory-care.md`.

## Package-Style Playbooks

For complex playbooks with TypeScript logic:

```
daily-briefing/
├── definition.yaml      # Playbook definition
├── PLAYBOOK.md          # Documentation
├── tools.yaml           # Tool declarations (optional)
└── references/          # Domain docs (optional)
```

Package directories live under their section (`v2/{section}/{slug}/`) and are discovered by `schema/v2/discovery.ts`.

## Validation

Playbooks are validated at discovery time via Zod schemas:
- `schema/v2/schema.ts` - Zod schemas
- `schema/v2/parser.ts` - YAML parsing + validation
- `schema/v2/discovery.ts` - Filesystem discovery

Validation errors show in dev server console. Fix all errors before committing.

## UI Display

Playbooks appear in `/plays?tab=playbooks`:
- Regular playbooks: Toggle on/off, show step count

## Quick Reference

```bash
# Check playbook discovery
grep "PLAYBOOK DISCOVERY" in dev server output

# Validate signals
grep "CAPTURE_SIGNAL_KEYS" app/_features/plays/playbooks/records-engine/types.ts

# Run playbook tests
pnpm test playbooks/v2/
```

## Checklist

Before committing a new playbook:

- [ ] Valid YAML syntax
- [ ] Valid section (`relationships`, `work`, `billing`, `files`, `meetings`, `communication`, `capture`, `me`)
- [ ] Layer is `act` (learn-layer is Memory Care, not playbooks)
- [ ] Valid trigger signal (in signal registry)
- [ ] Voice specified for `act` layer playbooks
- [ ] All step IDs unique
- [ ] All step references valid (forEach references existing fetch)
- [ ] Output type valid (`email_draft`, `notification`, `memory_update`, `finding`, `briefing`)
- [ ] No discovery errors in dev server
- [ ] Shows in UI at `/plays?tab=playbooks`
