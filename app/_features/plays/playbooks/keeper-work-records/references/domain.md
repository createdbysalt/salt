# Work Records Domain Reference

## Entity

Work Records owns durable project/work memory: project identity, lifecycle status, project type, description, timeline, org/person anchors, linked files, linked billing, linked meetings/conversations, Spaces/Connections scope, provenance, and protected history boundaries.

## Fields It Can Read

- `projects.name` - canonical work name.
- `projects.status` - durable lifecycle status.
- `projects.service_id` - linked catalog service from Me → Services.
- `projects.work_type` - commercial shape (project, retainer, hourly, etc.).
- `projects.description` - concise description or scope summary.
- `projects.start_date` and `projects.deadline` - timeline fields.
- `projects.client_id` - legacy client/org anchor used by work detail.
- `entity_relations` - people, organizations, spaces, files, notes, meetings, and other work connections.
- Billing, files, meetings, conversations, people, orgs, spaces, connections, and Me context directly linked to the work.

## Record Surfaces It Owns

- Admission and identity - policy-owned; executable create/update remains in system plays.
- Status - executable today.
- Project type - executable today.
- Description - executable today, with user-authored overwrite boundaries.
- Deadline and start date - executable today.
- Org/person/file/billing/meeting links - policy-owned for exact-link expansion.
- Health and progress - derived/read-only.
- Activity, audit logs, raw capture history, routing history, tool execution history, health history, and provenance history - never-touch except appending new provenance/activity for Keeper work.

## Create vs Update Policy

- Create when explicit user intent, contract, brief, proposal, scope, project folder, invoice/payment, kickoff, or deliverable evidence points to durable work.
- Update when the same project id, slug, linked org/person, connected-system id, contract, or exact user-approved name matches.
- Skip when evidence is a generic task, source artifact, vague idea, unrelated file, app notification, or marketing text.
- Ask when similar work exists, the org/person anchor is missing, timeline conflicts, or the proposed change overwrites user-authored scope.

## Admission Policy

- Qualifies as durable work when there is a project commitment, client/org/person anchor, work folder, contract/brief/scope, invoice/payment, kickoff, deliverable, or explicit user request.
- Does not qualify when the item is better represented as a person, organization, billing record, file, meeting, note, task, or source artifact.
- Waits for review when the evidence is plausible but lacks identity, ownership, or client/org anchoring.
- Never create from filename similarity, one-off marketing text, spam, newsletters, app notifications, or vague someday ideas.

## Entity Taxonomy

- Person: named human collaborator or client contact.
- Organization: client, vendor, partner, or company anchor.
- Team inbox or shared alias: possible org contact point, not work by itself.
- System sender: evidence source only.
- Newsletter or marketing sender: usually skip.
- Scam/spam/suspicious sender: skip or quarantine.
- Source artifact only: file, invoice, meeting, or email that may provide evidence but is not itself the work record.

## Identity Resolution And Dedupe

- Update existing record when project id, slug, exact user-approved name plus org, connected-system id, contract, file set, or billing context matches.
- Create new record when project evidence is explicit and no existing work item matches.
- Suggest merge when title, org, people, files, billing, and timeline strongly overlap but identifiers differ.
- Never auto-merge same-name projects across different organizations, spaces, timelines, or unrelated file sets.

## Field Completion Matrix

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never fill from |
|---------|-----------------|-----------|------------|-----------|-----------------|
| Name | User request, contract, brief, folder, proposal | write | On explicit create | Rename existing work | Guessed titles |
| Status | Explicit create, signed contract, kickoff, blocker, completed deliverable | write | Active/signed/completed above threshold | Downgrade, archive/restore, conflict | Vague comments |
| Project type | Brief, contract, user request, direct work context | write | Direct type at threshold | Soft category | Unrelated templates |
| Description | Scope, brief, user request, direct file summary | suggest/write | New/missing description if threshold passes | Existing user-authored text | Raw dumps/client copy |
| Start date | Contract, kickoff, user request, meeting decision | write | Exact date above threshold | Conflicting dates | Vague recency |
| Deadline | Contract, invoice terms, meeting decision, user request | write | Exact date above threshold | Stale/conflicting date | Vague date words |
| Org/person links | Exact ids, user approval, direct relationship evidence | write policy | Exact low-risk links | Reassignment, weak graph | Similar names |
| File/billing/meeting links | Exact ids and direct references | write policy | Exact low-risk links | Weak relation | Filename similarity alone |
| Notes/summaries | Direct evidence, Salt notes, user notes | split | Append Salt-authored note only | Subjective summary | Rewrite user notes |
| Health/progress | Status, deadline, activity, derived scorer | read-only | None | N/A | Directly overwrite history |
| Activity/history | Events, provenance, tool/capture logs | never-touch history | Append Keeper action only | Sensitive wording | Rewrite/delete/backfill |

## Value Taxonomy

- `status`: `draft`, `signed`, `active`, `on_hold`, `completed`, `archived`.
- `work_type`: commercial shape such as project, retainer, hourly, proposal, quick, or event.
- `service_id`: optional link to a workspace service catalog entry.
- `description`: concise internal scope description, not client-facing copy.
- `deadline` and `start_date`: ISO date strings from explicit evidence.

## Signals

- `work_created` - work was created by an explicit system play/user action.
- `work_has_signed_contract` - directly linked contract/signature evidence.
- `work_has_kickoff` - meeting/conversation evidence says kickoff happened.
- `work_is_blocked` - direct linked context says progress is blocked.
- `work_has_completed_deliverable` - directly linked deliverable is complete.
- `work_has_due_date` - a direct deadline/due date exists.
- `inferred_description` - direct work context provides a concise description.
- `inferred_deadline` - direct work context provides an ISO deadline.
- `inferred_start_date` - direct work context provides an ISO start date.

## Context Budget

### Connected tools

- Required: none. Work Records can run from durable memory and system-play inputs.
- Optional: documents/files, communication sources, scheduling sources, billing/finance sources, project tools.
- Ignored: unrelated workspaces, unrelated files, full account history, all project-tool tasks.

### Memory scope

- Entity anchor: work id, slug, exact title plus org/person, contract id, project folder, or user-approved identity.
- Memory surfaces: people, orgs, work, files, billing, conversations, meetings, teams, me.
- Relation filters: direct links, same client/org, same contract/file set, same connected-system id.
- Time window: directly linked evidence first; exact future deadlines only when sourced.
- Max records: top ranked exact/direct evidence only; never load all workspace memory.
- Ranking: exact id > user correction > connected-system id > contract/file set > org/person link > billing > meeting/conversation > weak mention.

### Operating surfaces

- Spaces: scope collaboration, visibility, and review boundaries.
- Connections: scope graph links to people, orgs, files, billing, meetings, and spaces.
- Visibility or approval boundary: cross-space links, reassignment, archive/restore, and user-authored overwrites wait for review.
- Trigger scope: work resolved, explicit create/update, directly linked evidence change, manual review.

### Time

- Trigger schedule/deadline/elapsed-time rule: event-based; no scheduled sweep by default.
- Lookback/lookahead window: directly linked evidence only; deadlines must be exact dates.
- Timezone/business-day assumption: date-only fields follow the user's workspace date convention.
- Recency or staleness rule: stale/conflicting dates wait for review.

### LLM context

- Facts passed: normalized signals, current fields, direct linked summaries, provenance, user corrections.
- Facts excluded: unrelated work, unrelated file corpora, raw full threads, unrelated billing records.
- Max input paths: work anchor, direct links, and top ranked supporting evidence only.

### Degradation

- If a required source is missing: no required connected source exists; run from durable memory.
- If optional sources are missing: skip the corresponding rules or leave suggestions pending.
- If too many records match: rank exact identifiers first and ask before merge/update.
- If evidence conflicts: keep current durable value and create a pending suggestion.

## Decision Order

1. Classify evidence as work, person, organization, billing record, file, meeting, note, source artifact, or skip.
2. Resolve identity by exact id, slug, user-approved title plus org, connected-system id, contract, or file set.
3. Build bounded facts from current work, direct people/org links, files, billing, meetings, conversations, spaces, and connections.
4. Evaluate status, project type, description, deadline, and start date in authored order.
5. Apply values above threshold only when the surface is low-risk and not protected by a review boundary.
6. Record provenance for applied and pending suggestions.

## Negative Examples

- `proposal.pdf` with no org/person/user intent remains a file/source artifact.
- A paid invoice with no project identity belongs to Billing first.
- Two "Website redesign" projects for different orgs never merge automatically.
- A blocker mentioned once without direct work anchoring waits for review.
- A vague "we should do this someday" note is not durable work.

## Confidence Policy

```text
confidence >= autoApplyThreshold -> applied
confidence < autoApplyThreshold -> pending review
```

Default threshold is 85. Equality applies. Explicit create and signed/completed evidence are high confidence. Blocker status and descriptions are lower by default because the cost of being wrong is higher. Dates apply only when exact. Thresholds never authorize merges, archive/restore, status downgrades, user-authored overwrites, or history mutation.

## Conflict Policy

User-corrected fields outrank connected-tool evidence. Exact ids outrank titles. Conflicting dates, duplicate projects, org reassignment, and status downgrades wait for review.

## Provenance

Keeper records field, value, source, rule id, confidence, status, explanation, blueprint slug/version, and evidence including work name and current status.

## Activity And History

Activity, audit logs, raw capture history, routing history, tool execution history, health history, and provenance history are evidence only. Keeper can append new provenance or Keeper activity for work it performed; it cannot rewrite, delete, backfill, or restate history.
