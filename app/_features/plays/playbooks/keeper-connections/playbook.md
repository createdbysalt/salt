---
slug: keeper-connections
kind: profile
name: Connection Links
player_slug: keeper
description: Maintain entity relationships (person↔org, person↔work, org↔work) from signals.
when_to_use: |
  Runs when a person, org, or work entity is created or updated with linkable context.
  Re-runs when new evidence suggests a connection (payment, meeting, email thread).
trigger:
  type: capture
  signal: entity_linkable
---

# Connection Links

## What this does

Keeper owns the connection graph policy: when to link entities, what confidence is required, and what evidence justifies a link. Connections represent relationships between Memory entities:

1. **Person ↔ Organization** — employment, membership, primary org
2. **Person ↔ Work** — involvement in a project (beyond primary contact)
3. **Person ↔ Person** — referral, colleague, knows-through relationships
4. **Organization ↔ Work** — client org for a project
5. **Person/Org/Work ↔ Space** — membership in a shared workspace

Activity and conversation links are append-only evidence — Salt reads them but does not create/delete them through this playbook.

## Link contract

Each link type has contracted fields and confidence rules. Links are stored in `entity_links` (explicit graph edges) or structured junction tables (`organization_people` for employment).

| Link Type | Storage | Keeper write policy |
|-----------|---------|---------------------|
| Person → Org (employment) | `organization_people` | Auto-apply above threshold; creates org if needed from domain |
| Person → Work (involvement) | `entity_links` | Auto-apply above threshold |
| Person → Person (relationship) | `entity_links` | Ask first (merges, identity links need review) |
| Org → Work (client) | `entity_links` + `work.organization_id` | Auto-apply above threshold |
| Entity → Space | `entity_links` | Ask first (visibility implications) |

## Link rules

```json
{
  "version": 1,
  "fields": ["org_link"],
  "rules": [
    {
      "id": "link-person-org-email-domain",
      "field": "org_link",
      "when": { "signal": "email_domain_is_personal", "op": "eq", "value": false },
      "set": { "value": "{{org_domain}}" },
      "confidence": 85,
      "because": "Company email domain implies organization membership"
    },
    {
      "id": "link-person-org-invoice",
      "field": "org_link",
      "when": { "signal": "has_invoice_with_org", "op": "eq", "value": true },
      "set": { "value": "{{invoice_org_id}}" },
      "confidence": 90,
      "because": "Invoice ties person to organization"
    },
    {
      "id": "link-person-org-payment",
      "field": "org_link",
      "when": { "signal": "has_payment_with_org", "op": "eq", "value": true },
      "set": { "value": "{{payment_org_id}}" },
      "confidence": 92,
      "because": "Payment ties person to organization"
    },
    {
      "id": "link-person-org-explicit",
      "field": "org_link",
      "when": { "signal": "user_specified_org", "op": "eq", "value": true },
      "set": { "value": "{{specified_org}}" },
      "confidence": 100,
      "because": "User explicitly specified the organization"
    }
  ]
}
```

**Additional link rules** (executed by `apply-connection-links.ts`):

| Rule | Link Type | Signal | Confidence | Action |
|------|-----------|--------|------------|--------|
| User explicit work | person_work | User specified work | 100 | Link to existing work |
| Meeting context | person_work | Meeting about work | 80 | Link to existing work |
| User explicit org-work | org_work | User specified org for work | 100 | Link org to work |
| Primary contact org | org_work | Work contact has org | 85 | Link org to work |

## When it runs

- **Entity created** — When a person, org, or work is created with linkable context (domain, org name, work reference)
- **Entity updated** — When new evidence arrives that suggests a connection
- **Ask Salt explicit** — When user says "add Jane to Acme" or "link this project to the client"
- **Capture signal** — When email/meeting/payment suggests entity relationships

## How it works

1. **Collect signals** — Gather email domain, org references, work context, user specifications
2. **Evaluate rules** — Check each link rule against current signals
3. **Resolve targets** — Find or create the target entity (org by domain, work by name)
4. **Check confidence** — Compare rule confidence to workspace threshold
5. **Execute or queue** — Auto-apply above threshold, queue for review below
6. **Record provenance** — Log the link with rule, confidence, evidence

## Execution paths

| Confidence | Threshold | Action |
|------------|-----------|--------|
| ≥ threshold | 85 (default) | Auto-create link |
| < threshold | — | Queue for approval |
| User explicit | 100 | Always auto-apply |

## What you approve

Links created from explicit user requests (confidence 100) auto-apply. Inferred links below threshold appear in Plays for review:

- "Link Jane Chen to Acme Corp?" (inferred from email domain)
- "Add Maya to Website Redesign project?" (inferred from meeting)

## Storage

**`organization_people`** (employment links):
```sql
organization_id, person_id, role, is_primary
```

**`entity_links`** (general graph edges):
```sql
source_type, source_id, target_type, target_id, relation_type, confidence, because
```

## What it never touches

- Activity history (append-only evidence)
- Capture events (read-only source material)
- Identity merges (separate approval flow)
- Space visibility/membership changes (user approval required)
