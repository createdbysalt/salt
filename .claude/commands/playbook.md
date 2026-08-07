# /playbook

Create, validate, or edit Salt playbooks (v2 YAML format).

## Usage

```
/playbook new <section>/<slug>    # Create a new playbook
/playbook validate                # Validate all playbooks (check dev server)
/playbook list                    # List all playbooks by section
```

## Workflow

This command uses the playbook-creator skill. See:
- `.cursor/skills/playbook-creator/SKILL.md` (source of truth)
- `.claude/skills/playbook-creator/SKILL.md` (mirror)

### Creating a new playbook

1. Run `/playbook new billing/late-fee` to create the YAML file
2. Edit the YAML with triggers, steps, and output
3. Restart dev server to validate
4. Check `/plays?tab=playbooks` to verify it appears

### Playbook structure (v2)

Playbooks are YAML files in `app/_features/plays/playbooks/v2/{section}/`:

```yaml
name: Late Fee Notice
slug: late-fee
version: 1.0.0
description: Drafts late fee notices for overdue invoices

section: billing
layer: act
voice: billing

trigger:
  type: signal
  signal: billing_due_date_passed

steps:
  - step: fetch
    id: overdue
    from: billing_records
    where: { status: overdue, days_overdue_gte: 30 }

  - step: draft
    id: notice
    prompt: "Draft a late fee notice for {{overdue.client_name}}"
    max_tokens: 200

output:
  type: email_draft
  approval: per_entity
```

### Sections

| Section | Purpose |
|---------|---------|
| `relationships` | People & Organizations |
| `work` | Projects & tasks |
| `billing` | Invoices & payments |
| `files` | Documents |
| `meetings` | Scheduled time |
| `me` | Operator profile |
| `_meta` | System playbooks (always-on) |

### Layers

| Layer | Voice | Use |
|-------|-------|-----|
| `learn` | Forbidden | Memory/profile updates |
| `act` | Required | User-facing workflows |

### System playbooks

System playbooks go in `_meta/` and are always-on. They can have multiple triggers:

```yaml
triggers:
  - type: signal
    signal: capture_processed
  - type: schedule
    cron: "0 6 * * 1"
```

### Validation

Playbooks are validated when the dev server loads. Check console for:
```
[PLAYBOOK DISCOVERY] Loaded billing/late-fee.yaml: Late Fee Notice
```

Or errors:
```
[PLAYBOOK DISCOVERY] Validation errors in billing/late-fee.yaml: [...]
```

## Quick commands

```bash
# List all playbooks
ls app/_features/plays/playbooks/v2/*/

# Check valid signals
grep "CAPTURE_SIGNAL_KEYS" app/_features/plays/playbooks/records-engine/types.ts

# Run tests
pnpm test playbooks/v2/
```
