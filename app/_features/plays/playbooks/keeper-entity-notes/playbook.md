---
slug: keeper-entity-notes
kind: profile
name: Entity Notes
player_slug: keeper
description: Author durable learnings about people, organizations, and work from captured evidence.
when_to_use: |
  Runs when Capture or a system play extracts facts, preferences, context, relationships, or flags from emails, meetings, conversations, or work.
  Salt-authored notes propose by default; only objective system-event notes may auto-confirm at the workspace threshold.
trigger:
  type: signal
  signal: entity_learning_extracted
---

# Entity Notes

## What this does

Keeper authors structured learnings about people, organizations, and work. Notes capture durable information that doesn't fit into contracted profile fields but matters for relationship context. Notes are the overflow memory of the record system — everything with a proper field goes in the field (see the per-surface record playbooks); everything else worth remembering becomes a note.

Note kinds (`note_kind` column, registry canon):

1. **fact** - Objective information Salt learned (e.g., "Works at Acme as VP Engineering")
2. **preference** - How this person/org prefers to work (e.g., "Prefers email over calls")
3. **context** - Background information about the relationship (e.g., "First payment received June 15")
4. **relationship** - How entities connect to others (e.g., "Referred by Jane Smith")
5. **flag** - Things that need attention (e.g., "No contact in 45 days")
6. **general** - Default for user-authored notes with no classification

## How the system actually works (implemented today)

Two authoring paths write to the shared `notes` table, scoped by `entity_type` (`person` | `organization` | `work`) + `entity_id`:

| Path | author_type | source | status on create | note_kind |
|------|-------------|--------|------------------|-----------|
| User writes a note (EntityNotesTab) | `user` | `manual` | `confirmed` | `general` |
| Salt authors a note (`createSaltNote` action) | `salt` | `ai_capture` / `ai_inference` / `system` | `proposed`, or `confirmed` if `confidence >= auto_apply_threshold` | classified by the author |

Every Salt-authored note carries provenance: `source`, `source_ref` (the capture/email/meeting id that evidences it), `confidence`, and the explanation shown to the user. Proposed notes surface inline in the entity's Notes tab with Confirm/Dismiss controls.

**Wired (status):** The extraction pipeline (`note-extractor.ts`, `persist-extracted-notes.ts`) runs heuristic pattern extraction, tag classification, routing logic, pinning rules, and quality gates. Two producers call `extractAndPersistNotes`:
1. **Emails** — the daily intelligence scan (`daily-scan.ts`) extracts notes for every email that resolves a person or organization.
2. **Meetings** — `attachMeetingTranscript` extracts notes when a transcript is attached to a meeting with a linked person or organization.

Notes are created via `createSaltNote`, which compares confidence against the workspace threshold to determine `proposed` vs `confirmed` status.

## Entity routing

When Salt extracts a note from capture, it must classify which entity the note is primarily about. Notes are scoped to one of five entity types:

| Entity Type | Route here when... |
|-------------|-------------------|
| `person` | About the individual's preferences, personal context, how they work |
| `organization` | About the company/org as a whole, team dynamics, org-wide policy |
| `work` | About a specific project, scope, deliverables, timeline |
| `billing` | About invoices, payments, rates, financial context |
| `meeting` | About a specific meeting's outcomes, decisions, action items |

Routing rules (evaluated in order):

1. If extracted from a **meeting transcript** → attach to that meeting
2. If content is **project-specific** (scope, deliverable, deadline for specific work) → attach to work
3. If content mentions **billing keywords** (invoice, payment, rate) and a billing record exists → attach to billing
4. If content is **org-wide** (company policy, team context) → attach to organization
5. If content is **personal** (preferences, personal facts) → attach to person
6. **Fallback**: attach to the primary entity the capture resolved (usually person)

## Tag classification

Tags are system-defined (same for every user). Source: `app/_features/memory/taxonomy/registry.ts` → `NOTE_TAG_VALUES`. Salt applies tags based on source and content analysis:

| Tag | Apply when |
|-----|-----------|
| `meeting` | Source is meeting transcript or content discusses a specific meeting |
| `call` | Source is call transcript or content discusses a call |
| `email` | Source is email thread or content discusses an email |
| `intro` | Content describes how you met or were introduced (`met at`, `introduced by`, `referred by`) |
| `follow-up` | Content indicates something to follow up on (`follow up`, `circle back`, `check in`) |
| `waiting` | Content indicates waiting on the other party (`waiting`, `pending`, `awaiting`, `on hold`) |
| `blocked` | Content indicates progress is blocked (`blocked`, `stuck`, `can't proceed`) |
| `budget` | Content mentions budget, pricing, rates, costs (`budget`, `price`, `rate`, `cost`, `$`) |
| `timeline` | Content mentions deadlines, schedules, dates (`deadline`, `due date`, `by [date]`, `timeline`) |
| `scope` | Content mentions scope, deliverables, requirements |
| `preference` | Content describes a personal preference (`prefers`, `rather`, `likes to`, `always wants`) |
| `birthday` | Content mentions birthday, anniversary, celebration |
| `family` | Content mentions family, kids, spouse, personal life |

Multiple tags can apply to a single note.

## Confidence rules

Salt assigns confidence based on extraction pattern strength and note kind. The rules below are evaluated by `note-extractor.ts` when extracting notes from capture content.

```json
{
  "version": 1,
  "fields": ["note_kind"],
  "rules": [
    {
      "id": "fact-employment",
      "field": "note_kind",
      "when": { "signal": "pattern_employment", "op": "eq", "value": true },
      "set": { "value": "fact" },
      "confidence": 85,
      "because": "Employment facts are objective and verifiable"
    },
    {
      "id": "fact-location",
      "field": "note_kind",
      "when": { "signal": "pattern_location", "op": "eq", "value": true },
      "set": { "value": "fact" },
      "confidence": 80,
      "because": "Location facts are generally reliable"
    },
    {
      "id": "fact-birthday",
      "field": "note_kind",
      "when": { "signal": "pattern_birthday", "op": "eq", "value": true },
      "set": { "value": "fact" },
      "confidence": 90,
      "because": "Date facts are highly specific and verifiable"
    },
    {
      "id": "fact-education",
      "field": "note_kind",
      "when": { "signal": "pattern_education", "op": "eq", "value": true },
      "set": { "value": "fact" },
      "confidence": 80,
      "because": "Education facts are stable and verifiable"
    },
    {
      "id": "preference-explicit",
      "field": "note_kind",
      "when": { "signal": "pattern_preference_explicit", "op": "eq", "value": true },
      "set": { "value": "preference" },
      "confidence": 80,
      "because": "Explicit preference statements are reliable"
    },
    {
      "id": "preference-negative",
      "field": "note_kind",
      "when": { "signal": "pattern_preference_negative", "op": "eq", "value": true },
      "set": { "value": "preference" },
      "confidence": 75,
      "because": "Negative preferences need context verification"
    },
    {
      "id": "preference-time",
      "field": "note_kind",
      "when": { "signal": "pattern_preference_time", "op": "eq", "value": true },
      "set": { "value": "preference" },
      "confidence": 85,
      "because": "Work-time preferences are clear signals"
    },
    {
      "id": "context-milestone",
      "field": "note_kind",
      "when": { "signal": "pattern_context_milestone", "op": "eq", "value": true },
      "set": { "value": "context" },
      "confidence": 85,
      "because": "Milestone context is tied to verifiable events"
    },
    {
      "id": "context-history",
      "field": "note_kind",
      "when": { "signal": "pattern_context_history", "op": "eq", "value": true },
      "set": { "value": "context" },
      "confidence": 70,
      "because": "Historical context benefits from verification"
    },
    {
      "id": "relationship-referral",
      "field": "note_kind",
      "when": { "signal": "pattern_relationship_referral", "op": "eq", "value": true },
      "set": { "value": "relationship" },
      "confidence": 90,
      "because": "Referral chains are high-value relationship context"
    },
    {
      "id": "relationship-connection",
      "field": "note_kind",
      "when": { "signal": "pattern_relationship_connection", "op": "eq", "value": true },
      "set": { "value": "relationship" },
      "confidence": 75,
      "because": "Inferred connections need confirmation"
    },
    {
      "id": "relationship-family",
      "field": "note_kind",
      "when": { "signal": "pattern_relationship_family", "op": "eq", "value": true },
      "set": { "value": "relationship" },
      "confidence": 80,
      "because": "Family context is personal but usually clear"
    },
    {
      "id": "flag-silence",
      "field": "note_kind",
      "when": { "signal": "pattern_flag_silence", "op": "eq", "value": true },
      "set": { "value": "flag" },
      "confidence": 85,
      "because": "Communication gaps are objective and actionable"
    },
    {
      "id": "flag-sentiment",
      "field": "note_kind",
      "when": { "signal": "pattern_flag_sentiment", "op": "eq", "value": true },
      "set": { "value": "flag" },
      "confidence": 70,
      "because": "Sentiment is subjective — always propose"
    },
    {
      "id": "flag-risk",
      "field": "note_kind",
      "when": { "signal": "pattern_flag_risk", "op": "eq", "value": true },
      "set": { "value": "flag" },
      "confidence": 75,
      "because": "Risk signals need human judgment"
    },
    {
      "id": "flag-overdue",
      "field": "note_kind",
      "when": { "signal": "pattern_flag_overdue", "op": "eq", "value": true },
      "set": { "value": "flag" },
      "confidence": 80,
      "because": "Schedule slips are objective but may need context"
    }
  ]
}
```

### Pattern → note_kind classification

| Rule ID | Pattern | note_kind | Confidence | Because |
|---------|---------|-----------|------------|---------|
| `fact-employment` | `works at`, `employed by`, `joined`, `started at` | `fact` | 85 | Employment facts are objective and verifiable |
| `fact-location` | `lives in`, `based in`, `located in`, `moved to` | `fact` | 80 | Location facts are generally reliable |
| `fact-birthday` | `birthday`, `born on`, `turns [age]`, `anniversary` | `fact` | 90 | Date facts are highly specific and verifiable |
| `fact-education` | `graduated`, `studied`, `degree in`, `alumni` | `fact` | 80 | Education facts are stable and verifiable |
| `preference-explicit` | `prefers`, `rather`, `likes to`, `always wants`, `never wants` | `preference` | 80 | Explicit preference statements are reliable |
| `preference-negative` | `don't like`, `avoid`, `hate`, `can't stand` | `preference` | 75 | Negative preferences need context verification |
| `preference-time` | `morning person`, `night owl`, `early bird` | `preference` | 85 | Work-time preferences are clear signals |
| `context-milestone` | `first payment`, `first invoice`, `first project`, `started working` | `context` | 85 | Milestone context is tied to verifiable events |
| `context-history` | `been working with`, `history with`, `background on` | `context` | 70 | Historical context benefits from verification |
| `relationship-referral` | `referred by`, `introduced by`, `got your name from`, `recommended by` | `relationship` | 90 | Referral chains are high-value relationship context |
| `relationship-connection` | `knows`, `connected to`, `friends with`, `colleagues with` | `relationship` | 75 | Inferred connections need confirmation |
| `relationship-family` | `spouse`, `partner`, `wife`, `husband`, `family` | `relationship` | 80 | Family context is personal but usually clear |
| `flag-silence` | `no contact`, `haven't heard`, `ghosted`, `radio silence` | `flag` | 85 | Communication gaps are objective and actionable |
| `flag-sentiment` | `frustrated`, `upset`, `unhappy`, `disappointed`, `concerned` | `flag` | 70 | Sentiment is subjective — always propose |
| `flag-risk` | `risk`, `warning`, `heads up`, `careful`, `watch out` | `flag` | 75 | Risk signals need human judgment |
| `flag-overdue` | `overdue`, `late`, `missed deadline`, `behind schedule` | `flag` | 80 | Schedule slips are objective but may need context |

### Confidence thresholds

| Confidence | Status | Rationale |
|------------|--------|-----------|
| ≥ 90 | May auto-confirm | Only for objective system facts (referral source, date facts) |
| 80–89 | Propose by default | High confidence but benefits from user confirmation |
| 70–79 | Always propose | Needs human judgment before becoming durable memory |
| < 70 | Skipped | Too uncertain to create as a note |

### Subjective override

**Subjective notes never auto-confirm** regardless of confidence. The following note kinds are ALWAYS proposed:
- `flag` with sentiment patterns (frustrated, upset, concerned)
- `preference` inferred from negative statements
- Any note where the evidence quote requires interpretation

The workspace `auto_apply_threshold` (default 85) is the ceiling, not the floor. A note with 90 confidence still proposes if its kind is inherently subjective.

## Pinning rules

Salt can pin notes that are high-importance or time-sensitive. Pinned notes appear at the top of the Notes tab.

| Condition | Auto-pin? | Rationale |
|-----------|-----------|-----------|
| Tag = `blocked` | Yes | Active blocker needs visibility |
| Tag = `follow-up` AND no linked task | Yes | Needs action, easy to lose |
| Tag = `waiting` AND > 7 days old | Yes | Stale wait, may need nudge |
| Tag = `birthday` AND within 30 days | Yes | Time-sensitive personal context |
| Tag = `timeline` AND deadline within 14 days | Yes | Approaching deadline |
| `note_kind` = `flag` | Yes | Flags are attention-worthy by definition |
| Confidence < 70 (proposed note) | No | Low-confidence notes shouldn't auto-pin |
| User unpinned previously | No | Respect user's explicit choice |

Pin write policy:
- Salt can pin notes it authors (above threshold)
- Salt **never unpins** a user-pinned note
- Salt **never re-pins** a note the user unpinned
- User can always pin/unpin manually

## Mention backlinks

When a note @mentions another entity (e.g., `@Acme Corp` in a note on Jane), a backlink is created. Backlinks appear in the **Notes tab** of the mentioned entity, not in Connections.

- Backlinks show with indicator: "Mentioned in a note on [Parent Entity]"
- Self-mentions (e.g., `@Jane` in a note on Jane) do nothing special — just render as a link
- Backlinks are soft references, not first-class relationships

## Write policy

Field-contract canon: notes are **ask-first**. In practice:

- **Salt-authored notes default to `proposed`.** The user confirms or dismisses them on the entity's Notes tab.
- **Auto-confirm is reserved for objective system-event notes** — things that are mechanically true (a payment landed, a status transition was recorded). Extractors must author subjective or inferred notes (preferences, flags, anything with judgment in it) below the workspace threshold so they always propose. When in doubt, propose.
- **User notes are protected.** Salt never edits, rewrites, or deletes a user-authored note. Corrections happen by proposing a new Salt note or by the user editing their own.
- **Dismissed notes stay dismissed.** They are hidden from reads but kept for audit. A dismissed note must not be re-proposed from the same evidence.
- **Memory-write monopoly applies.** Among playbooks, only Keeper mutates notes. Chat-side `memory_*` system plays are the human-in-chat path and are unaffected; acting playbooks that learn something emit signals/captures for Keeper to process — they never write notes directly.

## Workspace settings

The `keeper-entity-notes` blueprint reads `profile_playbook_settings`:

| Setting | Default | Description |
|---------|---------|-------------|
| `auto_apply_threshold` | 85 | Salt notes at or above this confidence are created `confirmed`; below it, `proposed`. Applies only to objective system-event notes per the write policy above. |

Changing the threshold only changes `proposed` vs `confirmed` on create. It never changes what evidence was used, the provenance recorded, or the protections on user-authored notes.

## Note lifecycle

1. **Proposed** - Salt created the note; it awaits Confirm/Dismiss on the entity's Notes tab.
2. **Confirmed** - The user approved it, or an objective system-event note cleared the threshold.
3. **Dismissed** - The user said it's wrong. Hidden from reads and from downstream consumption, kept for audit, never re-proposed from the same evidence.

Pinning and archiving are user actions; Salt does not pin, unpin, or archive notes.

## How notes are consumed

Confirmed notes are read back into Salt's working context (memory-consumption canon):

- **Entity narratives** - person/org summaries read confirmed notes only, pinned-first, bounded (~5 recent, character-capped) so one verbose note cannot flood the context.
- **Play creation** - the scoped memory loader feeds confirmed entity notes (bounded count and length) into play drafting for the entities involved.
- Proposed and dismissed notes are never consumed. Confirmation is the consent gate between "Salt noticed something" and "Salt acts on it."

## Distinct from operator memory facts

Notes about the **operator** (the user themselves) do not live here. The Me surface uses `operator_memory_facts` with its own proposed → confirmed/revised/dismissed loop, vote counts, and provenance receipts — owned by the `keeper-me` playbook. Entity notes are always about a person, organization, or work record in the workspace's memory, never about the operator.

## Negative examples

- A meeting summary belongs on the meeting record, not as a person note — link it, don't duplicate it.
- "Client seems frustrated" is subjective: it must propose, never auto-confirm, regardless of extraction confidence.
- A fact that belongs in a contracted field (title, relationship, website) goes through the field's record playbook and its rules — not a note.
- A dismissed "Prefers email over calls" must not reappear because the same email thread was re-processed.
- An acting playbook that notices a referral emits a capture/signal for Keeper; it does not write a relationship note itself.
