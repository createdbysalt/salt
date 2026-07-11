# Connection Links Domain Reference

## Entity

Connection links in Salt — the graph edges between Memory entities. This playbook owns the policy for when to create links, what confidence is required, and how to resolve target entities.

## Link Types

| Link Type | Source | Target | Storage | Use Case |
|-----------|--------|--------|---------|----------|
| `person_org` | Person | Organization | `organization_people` | Employment, membership |
| `person_work` | Person | Work | `entity_links` | Project involvement |
| `person_person` | Person | Person | `entity_links` | Referral, colleague |
| `org_work` | Organization | Work | `entity_links` + `work.organization_id` | Client relationship |
| `person_space` | Person | Space | `entity_links` | Space membership |
| `work_space` | Work | Space | `entity_links` | Project in space |

## Signals It Reads

### Person → Org signals
- `email_domain_is_personal` — false means company email
- `org_domain` — extracted domain from email
- `has_invoice_with_org` — invoice references an org
- `invoice_org_id` — org ID from invoice
- `has_payment_with_org` — payment references an org
- `payment_org_id` — org ID from payment
- `user_specified_org` — user explicitly named org
- `specified_org` — org ID or name from user

### Person → Work signals
- `user_specified_work` — user explicitly linked to work
- `specified_work` — work ID or name from user
- `meeting_about_work` — meeting context mentions work
- `meeting_work_id` — work ID from meeting

### Org → Work signals
- `user_specified_org_for_work` — user explicitly linked org to work
- `work_person_has_org` — work's primary contact has an org
- `person_primary_org_id` — org ID from person's primary org

## Resolution Strategies

| Strategy | Description | Creates if missing? |
|----------|-------------|---------------------|
| `domain` | Find org by domain, create if not found | Yes |
| `id` | Direct UUID lookup | No |
| `name` | Fuzzy search by name | Configurable |
| `id_or_name` | Try UUID first, fall back to name search | Configurable |

## Confidence Policy

```text
confidence >= autoApplyThreshold -> link created immediately
confidence < autoApplyThreshold -> queued for approval
```

Default threshold is `85`. User-explicit links use confidence `100` and always auto-apply.

### Rule confidence levels

- `100` — User explicitly requested (always apply)
- `92` — Payment evidence (strong)
- `90` — Invoice evidence (strong)
- `85` — Email domain match (medium)
- `80` — Meeting context (medium)
- `75` — Inferred from related entity (weaker)

## Provenance

Every link records:
- `link_type` — person_org, person_work, etc.
- `rule_id` — which rule matched
- `confidence` — rule confidence
- `because` — human explanation
- `evidence` — signals that matched
- `status` — applied or pending

## Conflict Policy

- If person already has a different primary org, new link is `is_primary: false`
- If exact link already exists, skip (idempotent)
- If identity merge suggested, wait for approval (never auto-merge)

## Ask Salt Integration

When Ask Salt creates entities with linkable context:

1. `memory_create_person` with `org_id`/`organization_name`/`domain` → triggers `person_org` rules
2. `memory_create_work` with `org_id`/`person_id` → triggers `org_work`/`person_work` rules
3. `memory_link_*` tools → direct user request, confidence 100

## Negative Examples

- Same-name person at different org should NOT auto-link to either
- Generic alias like `billing@acme.com` should NOT create a person to link
- Work linked to person should NOT auto-link to person's org (separate decision)
- Meeting mention of company name should NOT auto-create org to link
