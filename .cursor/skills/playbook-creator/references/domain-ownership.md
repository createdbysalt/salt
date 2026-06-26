# Domain Ownership

A Salt playbook should own its operational domain the way a Claude skill owns a workflow: the artifact contains the knowledge, policy, helper resources, and proof needed to run well. The typed Salt engine remains the safe primitive that validates schemas, enforces tool policy, observes RLS, and writes provenance.

## Ownership Model

The playbook owns:

- Domain knowledge: what entity or workflow it touches.
- Policy: when to create, update, skip, auto-apply, or wait for review.
- Decision procedure: how inputs become outputs.
- Resources: references, deterministic helpers, templates, and optional assets.
- Proof: evals and benchmark results that show it works.

The engine owns:

- Schema validation.
- Tool allowlists and risk policy.
- RLS and workspace scoping.
- Actual database writes and provenance.
- Safe simulation and benchmark execution.

Do not move unsafe or privileged writes into playbook resources. The playbook explains and configures; the engine executes safely.

## Domain Reference Template

Create a `references/<domain>.md` for any playbook that owns a meaningful domain. Use this shape:

```markdown
# <Domain> Reference

## Entity

What record, workflow, or object this playbook owns.

## Fields It Can Read

- `<field>` - source and meaning.

## Record Surfaces It Owns

- `<surface>` - write, suggest, read-only, or never-touch; allowed values; review boundary.
- Explicitly call out executable-today surfaces separately from policy-owned surfaces.

## Create vs Update Policy

- Create when...
- Update when...
- Skip when...
- Ask for review when...

## Admission Policy

- Qualifies as a durable record when...
- Does not qualify when...
- Waits for review when...
- Never create from...

## Entity Taxonomy

- Person:
- Organization:
- Team inbox or shared alias:
- System sender:
- Newsletter or marketing sender:
- Scam/spam/suspicious sender:
- Source artifact only:

## Identity Resolution And Dedupe

- Update existing record when...
- Create new record when...
- Suggest merge when...
- Never auto-merge when...

## Field Completion Matrix

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never fill from |
|---------|-----------------|-----------|------------|-----------|-----------------|
| Example | Example source | write/suggest/read-only/never-touch | Example auto policy | Example boundary | Example exclusion |

## Value Taxonomy

Allowed statuses, relationship types, categories, or labels.

## Signals

- `<signal>` - how Salt derives it and what it means.

## Context Budget

### Connected tools

- Required:
- Optional:
- Ignored:

### Memory scope

- Entity anchor:
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me
- Relation filters:
- Time window:
- Max records:
- Ranking:

### Operating surfaces

- Spaces:
- Connections:
- Visibility or approval boundary:
- Trigger scope:

### Time

- Trigger schedule/deadline/elapsed-time rule:
- Lookback/lookahead window:
- Timezone/business-day assumption:
- Recency or staleness rule:

### LLM context

- Facts passed:
- Facts excluded:
- Max input paths:

### Degradation

- If a required source is missing:
- If optional sources are missing:
- If too many records match:
- If evidence conflicts:

## Decision Order

1. First rule or check.
2. Next rule or check.
3. Fallback.

## Negative Examples

- Example that should be skipped.
- Example that should become an organization, not a person.
- Example that should wait for review.

## Confidence Policy

How confidence maps to auto-apply vs review.

State the exact threshold rule:

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Also document:

- default threshold expected by the playbook,
- whether equality should auto-apply,
- which rules are intended to pass common thresholds such as 70, 85, and 90,
- fallback confidence values and whether they can pass the configured threshold,
- what happens when a matched rule's placeholder resolves to no value,
- why threshold settings do not override safety or approval boundaries.

## Conflict Policy

What happens when two signals disagree.

## Provenance

What Salt records so the user can understand or correct the result.

## Activity And History

What the playbook may read as evidence but must never mutate. Activity, audit logs, raw capture history, routing history, tool execution history, and provenance history should be never-touch unless the engine explicitly appends a new event/provenance row.
```

## Procedure `How It Works` Template

Every playbook should translate the domain reference into user-facing prose:

```markdown
## How it works

1. **Read the inputs** - Salt reads <sources/signals>.
2. **Limit context** - Salt retrieves only the connected-tool, `/memory`, Spaces, and Connections context that matches the entity, time window, result budget, and collaboration boundary.
3. **Normalize the facts** - Salt turns <raw data> into <stable facts>.
4. **Evaluate rules in order** - Salt checks <highest-confidence rules first>.
5. **Set confidence** - Salt applies hard evidence above the threshold and holds softer calls for review.
6. **Handle conflicts** - Salt does not overwrite higher-confidence or manually corrected values without review.
7. **Record provenance** - Salt records the rule, confidence, reason, and evidence behind the result.
```

Keep this section plain enough for a non-technical user. The goal is trust: they should understand how Salt decides without reading JSON.

## People Records Current Scope

The first dogfood target is People Records. People Records owns the full durable person record as policy: identity, relationship/status, contact details, organization links, overview, notes, tags, connections, record state, and provenance boundaries. Today's typed engine can write only the executable subset below, so every playbook must distinguish policy ownership from executable support.

Executable today:

- `relationship_type` - `client`, `prospect`, `team`, `partner`, `vendor`, `personal`, `unknown`.
- `title` - extracted title from an email signature.
- `org_link` - organization domain inferred from a company email domain and recorded as provenance.

Never-touch surfaces:

- Activity timeline.
- Audit logs and tool execution logs.
- Raw capture events and routing decisions.
- Finding history.
- Provenance history.
- User-authored notes, except for adding separate Salt-authored notes with clear authorship.

Current signals:

- `has_payment_received`
- `has_invoice_sent`
- `is_bidirectional_thread`
- `you_initiated`
- `has_calendar_meeting`
- `has_signature`
- `email_count`
- `email_domain_is_personal`
- `email_domain_matches_workspace`
- `email_domain_in_partner_list`
- `email_domain_in_vendor_list`

Current decision facts:

- Person admission and person-vs-organization classification are currently documented policy, not fully executable write behavior in the profile rules runner.
- Capture must resolve or create the person before today's profile fill rules run.
- Rules are evaluated in authored order per field.
- `confidence >= autoApplyThreshold` applies automatically; below that waits for review.
- Equality passes. If the threshold is `85`, a rule with confidence `85` applies.
- The threshold only changes `applied` vs `pending`; it does not change which rule matched, the selected value, evidence, or provenance.
- If no relationship rule matches and fallback is enabled, Salt uses legacy relationship heuristics at `70` confidence when it can infer and `40` when it cannot.
- Fallback confidence is compared to the configured threshold the same way as rule confidence.
- Rule matches and fallback results write provenance with field, value, confidence, source, rule id, reason, status, and evidence.
- Auto-apply above threshold is the default for low-risk writable surfaces.
- Merges, identity unification, organization reassignment, archive/restore/status changes, user-authored content overwrites, and subjective summaries/notes wait for review regardless of confidence.

Current context budget:

- Connected tools are signal providers, not prompt dumps. Prefer capability groups in user-facing playbooks: communication sources can produce thread, signature, domain, and count signals; finance sources can produce payment signals; billing sources can produce invoice-sent signals; scheduling sources can produce meeting signals. Name a specific app only when the play is specifically about that app.
- `/memory` should be used for durable user-corrected facts across people, orgs, work, files, billing, conversations, meetings, teams, and me. For People Records, likely memory includes the resolved person, organization records for the email domain, work connected to the person or org, conversation/meeting context tied to the person, billing context that proves client status, team ownership, and me/workspace facts such as domains, voice, partners, vendors, and preferences.
- Spaces and Connections should stay separate from `/memory`: Spaces define collaboration/routing boundaries; Connections define relationship graph and connected-source context. They can appear in sidebar "When it runs" when they scope the trigger, or "What it uses" when they provide context.
- Retrieval should be entity-anchored to the resolved person or email domain. Do not load all people, orgs, work, files, billing records, conversations, meetings, teams, me profile data, or connected-app history.
- When `/memory` corrections conflict with connected-tool evidence, hold for review unless the playbook has a stronger explicit policy.

Follow-on executable scope:

- Typed fields or helpers for contact details, tags, preferences, summary, Salt-authored notes, exact links, and record status proposals.
- Provenance and review UI for each new surface.
- Eval coverage for each new owned surface.

## Bundled Helpers

Add a script when a deterministic transformation appears repeatedly or is easy to get subtly wrong. Examples:

- Normalize an email domain.
- Convert a domain into an organization candidate.
- Validate a relationship taxonomy.
- Convert raw CRM/payment/email facts into stable signals.

Helpers should be deterministic and safe. They should not perform privileged writes, call external systems directly, or bypass the engine.
