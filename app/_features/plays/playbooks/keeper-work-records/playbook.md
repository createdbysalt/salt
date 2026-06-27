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

Executable today: the typed profile engine writes status, project type, description, deadline, and start date. The broader ownership policy below defines how Work Records should govern the full durable work surface as the engine grows.

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
5. **Normalize facts** - Salt turns raw context into stable facts: created, signed contract, kickoff, blocked, completed deliverable, due date present, inferred project type, inferred description, inferred deadline, and inferred start date.
6. **Evaluate rules per field** - Salt checks status, project type, description, deadline, and start date rules in authored order. The first matching rule for each field wins.
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
| Project type | Brief, contract, user request, direct project context | Write policy | Direct type above threshold | Soft inference | Unrelated templates |
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
  "fields": ["status", "project_type", "description", "deadline", "start_date"],
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
      "id": "work-project-type-inferred",
      "field": "project_type",
      "when": { "signal": "inferred_project_type", "op": "exists" },
      "set": { "value": "{{inferred_project_type}}" },
      "confidence": 85,
      "because": "Direct work context includes a project type"
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
