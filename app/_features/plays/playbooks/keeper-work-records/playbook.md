---
slug: keeper-work-records
kind: profile
name: Work Records
player_slug: keeper
description: Maintain durable Work records from trusted project, contract, deadline, file, billing, people, and organization evidence.
when_to_use: |
  Runs when Capture, Ask Salt, onboarding, or a system play creates or updates a work item from explicit project evidence.
  Re-runs when new directly linked files, contracts, meetings, billing records, people, organizations, or deadlines can improve the work record.
trigger:
  type: capture
  signal: work_resolved
---

# Work Records

## What this does

Keeper owns the durable work record policy: what qualifies as work, which project record should update, which status and dates can be filled, which people/orgs/files/billing records belong to it, and which user-authored context must remain protected. It covers the Work detail surface:

1. **Identity** - work name, slug, client/org anchor, source, and whether the evidence is actually a durable work item.
2. **Lifecycle** - draft, signed, active, on hold, completed, archived, and review-only status transitions.
3. **Description and type** - concise project description, project type, scope hints, and tags.
4. **Timeline** - start date, deadline, stage entered date, overdue state, and health inputs.
5. **Connections** - people, organizations, spaces, files, billing records, meetings, conversations, and notes linked to the work.

Activity, audit logs, raw capture history, routing history, tool execution logs, health history, and provenance history are evidence only. Salt may append new provenance or a clearly attributed Keeper activity entry for work it performed; it never rewrites history.

Executable today: the typed profile engine writes **status, description, deadline, and start date** — nothing else. (No signal exists for project-type inference; work type is user-set or ask-first.) The broader ownership policy below defines how Work Records should govern the full durable work surface as the engine grows.

## Field contract

The work record has **28 contracted fields** (canon: `brand-identity/product-internal/features/keeper-field-contracts.md`, Work section). Every vocabulary comes from the taxonomy registry; Keeper never invents a value outside a registry vocabulary. Everything is ask-first except the three derived fields.

| Field cluster | Fields | Format / vocabulary | Keeper write policy |
|---------------|--------|---------------------|---------------------|
| Identity | Name | text | Ask first (fill on create; renames always ask) |
| Lifecycle | Status | `work_status` (`draft`, `signed`, `active`, `on_hold`, `completed`, `archived`) — stored canon; Stalled/Wrapping/Renewing are derived display chips, never stored | Ask first (rules engine applies above the workspace threshold — that threshold IS the consent dial; downgrades always ask) |
| Type & stage | Work type; Stage | `work_type` (`project`, `retainer`, `hourly`, `proposal`, `quick`, `event`); `work_stage` (per-type stage sets, parent = work type) | Ask first. A stage must belong to the current work type's set. |
| References | Service; Billing contact | reference (workspace service; person) | Ask first |
| Derived | Retainer flag; Primary contact name; Contract-value-or-scope | derived | Never written directly — computed from work type, linked people, and pricing fields |
| Pricing | Contract value; Final price; Scope items; Currency; Discount % / amount / reason | money (integer cents); json; `currency` (uppercase ISO 4217, 10-value) | Ask first — financial fields never auto-apply |
| Payment structure | Payment type; Payment terms; Hourly rate; Hours estimate; Retainer MRR; Billing cycle | payment type (`fixed`, `retainer`, `hourly`, `milestone`); `payment_terms`; money; number; money; `billing_cycle` (`monthly`, `quarterly`, `annually`, `one_time`) | Ask first |
| Dates | Start date; Deadline; Decision date; Renewal date; Estimated timeline | date / text | Ask first (deadline/start-date rules apply above threshold from direct evidence) |
| Admin | PO number | text | Ask first |

## Work detail page coverage

The Work Records playbook is the policy owner for the record data that powers the Work detail page.

| Detail page surface | What must be maintained | Ownership policy |
|---------------------|-------------------------|------------------|
| Hero | Name, status, type, stage, organization, timeline context | Write or derive from trusted Work, Org, Billing, and File evidence. Quick actions are UI actions, not field claims. |
| Summary / Worth attention | Current work summary and attention context | Salt may generate or refresh from directly linked evidence; subjective or client-facing phrasing waits for review. |
| Details section | Name, status, work type, service, stage, timeline, organization, relationship, primary contact, billing contact, contract value, discount (%, amount, reason), final price, payment type, payment terms, currency, PO number — plus retainer MRR + billing cycle (retainer work) and hourly rate + hours estimate (hourly work) | First-class contracted fields. Salt changes the actual field value when policy allows; financial fields never auto-apply. |
| Payment milestones | Milestone list, amounts, and states when payment type is `milestone` | User-owned structure. Salt may propose a milestone from explicit contract/scope evidence; completion state changes are ask-first. |
| Description | Concise project description | Salt fills above threshold only when no user-authored description exists; it never replaces user text. |
| Blockers | Blocker entries: what is blocked, since when, on whom | Salt proposes blockers from direct evidence (an explicit "waiting on X" in a linked thread or meeting); resolving or deleting a blocker is user/ask-first. A blocker proposal may support an `on_hold` status suggestion, but one vague mention never auto-flips status. |
| Tags | Low-risk descriptors and workspace-specific labels | Append or update only from repeated directly linked evidence or user correction. |
| Connections tab | People, orgs, meetings, files, billing, spaces linked to the work | Add exact, low-risk links above threshold. Merges and reassignment wait for approval. |
| Notes tab | User-authored and Salt-authored notes | User notes are protected; Salt appends clearly authored notes with provenance (entity-notes policy). |
| Activity tab | Timeline of things that happened | Append-only. Salt may append clearly attributed entries for actions it performed. |
| Health card | Health score inputs and factors | Derived from status, deadline, stage timing, activity, and blockers; the score itself is display logic. |
| Plays card | Plays related to the work | Read-only from play queues. Keeper maintains the links that make play matching reliable. |

## When it runs

- **Work resolved** - a system play creates work from an explicit user action, Ask Salt request, onboarding proposal, capture event, contract, brief, invoice, payment, or directly linked file.
- **New evidence arrives** - a contract is signed, kickoff happens, a deliverable is completed, a deadline appears, a blocker appears, or a directly linked file/billing/meeting record changes the work context.
- **Manual review starts** - a user opens the work record and asks Salt to re-check fields.
- **Manual add via Ask Salt** - the user asks Salt to add work. Keeper proposes fields from connected sources and waits for approval before ambiguous writes.

## How it works

1. **Admit or skip** - Salt first decides whether the evidence deserves durable Work memory. Explicit projects, contracts, briefs, scopes, paid work, linked deliverables, and user requests can qualify. Generic tasks, marketing copy, newsletters, app notifications, and unrelated files do not.
2. **Classify the entity** - Salt distinguishes work from a person, organization, invoice, payment, file, meeting, task, note, source artifact, or vague opportunity. A client company should become an organization; a human should become a person; a project-like commitment becomes work.
3. **Resolve identity** - Salt updates an existing work item when project id, slug, exact linked client/org, direct file set, contract, or user-approved name matches. Similar titles across different orgs wait for review.
4. **Limit context** - Salt uses only evidence anchored to the work item, linked organization, linked people, linked files, linked billing, linked meetings/conversations, spaces, connections, and Me workspace context.
5. **Normalize facts** - Salt turns raw context into the registered work signals, and only those: `work_created`, `work_has_signed_contract`, `work_has_kickoff`, `work_is_blocked`, `work_has_completed_deliverable`, `work_has_due_date`, plus the extracted values `inferred_description`, `inferred_deadline`, `inferred_start_date`. (`work_has_due_date` is registered but has no rule today — available for future timeline rules.) There is no project-type inference signal; work type changes are user-set or ask-first proposals.
6. **Evaluate rules per field** - Salt checks status, description, deadline, and start date rules in authored order. The first matching rule for each field wins.
7. **Set confidence and status** - Rule confidence is authored policy. If `confidence >= autoApplyThreshold`, Salt applies the value. If `confidence < autoApplyThreshold`, Salt holds it for review. Equality passes.
8. **Handle conflicts** - Salt does not overwrite user-corrected status, scope, dates, descriptions, or links when connected evidence conflicts. Status downgrades, archive/restore, and subjective summaries wait for review.
9. **Record provenance** - Salt records the field, value, source, rule id, confidence, explanation, status, and evidence so the user can understand or correct the result.

## What you approve

High-confidence, low-risk fills can auto-apply: initial `active` status for explicitly created work, status from signed contract or completed deliverable evidence, project type from direct work context, and dates from direct deadline/start-date evidence above threshold.

Review is always required for merges, duplicate project unification, changing the linked organization/client, archive/restore, status downgrades that affect visibility or health, replacing user-authored description/scope, subjective summaries, and client-facing wording.

## Workspace context

Work Records depends on bounded, work-anchored context.

**What it uses**

- **Work memory** - current project fields, provenance, health inputs, stage timing, tags, and direct connections.
- **People and Org memory** - linked client/org, primary people, billing contacts, collaborators, and relationship context.
- **Files and documents** - contracts, briefs, scopes, deliverables, and file metadata directly linked to the work.
- **Billing memory** - invoices, payments, retainers, deposits, and overdue signals directly tied to the work.
- **Meetings and conversations** - kickoff, decisions, blockers, deadlines, and completion signals directly tied to the work.
- **Spaces and Connections** - collaboration boundaries, visibility, and graph relationships that scope the work.

**What it ignores**

- Unrelated files, invoices, people, organizations, meetings, conversations, notes, and connected-app history.
- Vague opportunity text that has no client/org, commitment, file, billing, meeting, or user-confirmed work anchor.
- Similar project names attached to different organizations unless the user approves a merge.

## Record lifecycle

**Qualifies as work when**

- The user explicitly asks Salt to create or track work.
- A contract, brief, proposal, scope, deliverable, invoice, payment, kickoff, or project folder points to a durable project.
- The work has a client/org/person anchor or enough evidence to ask for review.

**Does not qualify as work when**

- The evidence is a generic task, unrelated file, marketing mention, newsletter, app notification, receipt-only artifact, or vague someday idea.
- The item belongs better as an organization, person, billing record, file, meeting, or note.

**Create, update, merge, or skip**

- Update existing work when project id, slug, exact user-approved name plus org, contract, file set, or connected-system id matches.
- Create new work when a project commitment is explicit and no existing work item matches.
- Suggest a merge when titles, org, files, billing, and people strongly overlap but identifiers differ.
- Never auto-merge same-name work across different organizations, spaces, or unrelated timelines.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Admission and identity | User request, contract, brief, project folder, invoice/payment, linked org/person | Write policy | Create/update exact work above threshold | Similar titles, duplicate projects, missing org | Vague task, unrelated file, marketing text |
| Name | User request, contract/brief title, project folder | Write policy | Fill on create | Rename existing work | Guessed titles |
| Status | Explicit create, signed contract, kickoff, blocker, completed deliverable | Write policy | Low-risk signed/active/completed above threshold | Downgrade, archive/restore, conflicting stage | One-off subjective comments |
| Work type | Brief, contract, user request, direct project context | Write policy | None (no inference signal exists) | Any type change; type changes cascade into the valid stage set | Unrelated templates, guessing from the name |
| Stage | Work type's registry stage set, direct milestone evidence, user action | Write policy | None by default | Advance or correct stage from explicit evidence; stage must belong to the current work type's set | Stages outside the type's set, skipping backwards silently |
| Financial fields (contract value, final price, discounts, rates, MRR, scope items) | Contract, signed proposal, invoice evidence, user entry | Write policy | None — financial fields never auto-apply | Fill or correct from explicit contract/billing evidence | Currency conversion, rounding, deriving value from conversation tone |
| Payment structure (payment type, terms, billing cycle) | Contract, invoice history, workspace defaults | Write policy | None by default | Fill from explicit evidence; workspace defaults are context, not a write reason | Overwriting values that match issued invoices |
| Blockers | Directly linked threads, meetings, explicit user statements | Write policy | None by default | Propose a blocker from explicit evidence; resolve/delete | Inventing blockers from sentiment, auto-flipping status on one mention |
| Payment milestones | Contract, scope items, user structure | Suggest policy | None by default | Propose a milestone from explicit contract/scope evidence; completion changes | Rewriting the user's milestone structure |
| Tags | User correction, repeated directly linked evidence | Write policy | Low-risk tags from strong repeated evidence | Preference-like or client-facing labels | One-off comments, unrelated workspace memory |
| Description | Brief, scope, user request, direct file summary | Suggest/write policy | Only above threshold and not replacing user text | Existing user-authored description | Raw dumps, client-facing copy |
| Timeline | Contract, kickoff, due date, meeting decision, user request | Write policy | Exact deadline/start date above threshold | Conflicting dates, stale dates | Vague phrases without date |
| Connections | Exact ids, links, user approval | Write policy | Exact low-risk links | Weak graph links, reassignment | Similar names only |
| Notes/summaries | Direct evidence, Salt-authored notes, user notes | Split ownership | Append Salt-authored note only | Subjective or client-facing summary | Rewrite user notes |
| Health and progress | Derived from status, deadline, stage, activity | Read-only derived | None | N/A | Directly overwrite derived history |
| Activity and audit history | Events, provenance, capture/tool logs | Append-only evidence | Append Keeper action only | Sensitive wording | Rewrite/delete/backfill |

**Negative examples**

- A file named `proposal.pdf` with no org, person, or user intent should not create work automatically.
- A paid invoice should link to work only when the project identity is clear; otherwise it belongs to Billing first.
- Two projects named "Website redesign" for different organizations should never merge automatically.
- A blocker mentioned once in a vague chat should become a review suggestion, not an automatic status change.

```json
{
  "version": 1,
  "fields": ["status", "description", "deadline", "start_date"],
  "rules": [
    {
      "id": "work-created-active",
      "field": "status",
      "when": { "signal": "work_created", "op": "eq", "value": true },
      "set": { "value": "active" },
      "confidence": 90,
      "because": "New work created from an explicit memory action starts active"
    },
    {
      "id": "work-signed-contract",
      "field": "status",
      "when": { "signal": "work_has_signed_contract", "op": "eq", "value": true },
      "set": { "value": "signed" },
      "confidence": 92,
      "because": "Contract evidence shows the work is signed"
    },
    {
      "id": "work-kickoff-active",
      "field": "status",
      "when": { "signal": "work_has_kickoff", "op": "eq", "value": true },
      "set": { "value": "active" },
      "confidence": 88,
      "because": "Kickoff evidence shows the work is underway"
    },
    {
      "id": "work-blocked-on-hold",
      "field": "status",
      "when": { "signal": "work_is_blocked", "op": "eq", "value": true },
      "set": { "value": "on_hold" },
      "confidence": 80,
      "because": "Direct work evidence says progress is blocked"
    },
    {
      "id": "work-completed-deliverable",
      "field": "status",
      "when": { "signal": "work_has_completed_deliverable", "op": "eq", "value": true },
      "set": { "value": "completed" },
      "confidence": 85,
      "because": "A completed deliverable is linked to this work"
    },
    {
      "id": "work-description-inferred",
      "field": "description",
      "when": { "signal": "inferred_description", "op": "exists" },
      "set": { "value": "{{inferred_description}}" },
      "confidence": 80,
      "because": "Direct work context includes a concise description"
    },
    {
      "id": "work-deadline-inferred",
      "field": "deadline",
      "when": { "signal": "inferred_deadline", "op": "exists" },
      "set": { "value": "{{inferred_deadline}}" },
      "confidence": 85,
      "because": "Direct work context includes a deadline"
    },
    {
      "id": "work-start-date-inferred",
      "field": "start_date",
      "when": { "signal": "inferred_start_date", "op": "exists" },
      "set": { "value": "{{inferred_start_date}}" },
      "confidence": 85,
      "because": "Direct work context includes a start date"
    }
  ]
}
```
