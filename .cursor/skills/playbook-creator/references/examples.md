# Playbook Examples

Use these examples to calibrate quality. They are intentionally short; copy the pattern, not the exact content.

## Strong Acting Playbook

Strong because it has a sharp trigger, clear approval boundary, meaningful `How it works`, a bounded LLM step, and evals that check the final behavior.

```markdown
# Meeting Recap

## What this does

Reads a transcript and prepares an internal recap with decisions, owners, and open questions.

## When it runs

- A meeting ends
- A transcript lands from Fireflies or calendar capture

## How it works

1. **Load transcript** - Salt reads the transcript from the connected meeting source.
2. **Summarize** - Salt asks for decisions, owners, and open questions only.
3. **Render brief** - Salt formats the output as a scannable internal brief.
4. **Hold external sharing** - Salt does not email anyone from this playbook.

## What you approve

No external send happens here. A separate follow-up play handles client-facing sharing.
```

Good eval assertions:

```json
[
  { "type": "bound_contains", "bind": "brief", "substring": "Kickoff call" },
  { "type": "no_act_executed" }
]
```

## Weak Acting Playbook

Weak because it is vague, hides how it works, and gives the model too much open-ended authority.

```markdown
# Meeting Helper

## What this does

Helps with meetings.

## When it runs

Whenever there is meeting stuff.

## Steps

Salt figures out what to do and drafts something.
```

Weak eval assertions:

```json
[
  { "type": "bound_exists", "bind": "output" }
]
```

Why it fails:

- The trigger is broad.
- There is no approval boundary.
- There is no `## How it works`.
- The eval would pass for a useless output.

## Strong Profile Playbook

Strong because it explains who qualifies as a record, how Salt separates people from organizations/system senders, which record surfaces it owns, which surfaces are executable today, how signals become decisions, and how confidence is calibrated.

```markdown
# People Records

## What this does

Owns the durable person record policy: identity, relationship, organization, contact details, overview, notes, links, and record-state boundaries. Activity and audit history are evidence only; Salt never rewrites what happened.

## When it runs

- Salt resolves a person from Capture
- New email, payment, invoice, or signature context arrives

## How it works

1. **Admit or skip** - Salt first decides whether the incoming evidence represents a durable person, an organization, a system sender, a generic alias, or noise.
2. **Resolve identity** - Salt updates an existing person when identity is clear and holds possible duplicates for review.
3. **Read signals** - Salt reads payment, invoice, email, calendar, and signature facts associated with the admitted person.
4. **Normalize facts** - Salt derives stable facts such as company domain, personal-domain status, and workspace-domain match.
5. **Evaluate rules per field** - Salt checks authored rules for relationship, title, and organization in order.
6. **Set confidence** - Hard evidence such as finance payment records can auto-apply; softer signals wait for review.
7. **Fallback carefully** - If no relationship rule matches, fallback inference stays below the auto-apply threshold.
8. **Record provenance** - Salt records the rule, reason, confidence, status, and evidence for every proposed or applied value.

## What you approve

Low-confidence values wait for review. Salt does not overwrite manually corrected values without a stronger rule and review.

## Workspace context

Workspace, partner, and vendor domains make domain-based classification reliable.

## Record lifecycle

Do not create people from `noreply@`, newsletters, suspicious senders, or generic aliases such as `billing@` unless the user confirms the alias should represent a person.

### Record Surface Ownership

| Surface | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------|------------|-----------|-------------|
| Relationship, title, organization | Write policy; executable today for supported fields | High-confidence values above threshold | Conflicts, fallback, missing values | Spam, newsletters, system senders |
| Contact details, tags, overview, Salt notes, links | Write policy; future executable scope | High-confidence low-risk values once supported | Sensitive, subjective, or conflicting changes | User-authored notes and corrections |
| Activity and audit history | Never-touch evidence | Never | Never | Historical events, capture history, tool logs, provenance history |

Executable today: the typed profile runner writes relationship and title and records organization provenance. Broader ownership is policy for future engine work.
```

Good eval assertions:

```json
[
  { "type": "field_value_eq", "field": "relationship_type", "expected": "client" }
]
```

## Weak Profile Playbook

Weak because the rules exist but the playbook does not explain the operating model.

```markdown
# People Records

## What this does

Fills out profiles.

## Rules

Uses email and payments.
```

Why it fails:

- It does not name the fields it owns.
- It does not define Record Surface Ownership.
- It does not protect Activity and audit history as never-touch evidence.
- It does not say who qualifies as a person.
- It does not distinguish people from organizations, aliases, system senders, or noise.
- It does not explain signal derivation.
- It does not explain confidence or fallback.
- A user cannot tell what gets auto-applied vs reviewed.
