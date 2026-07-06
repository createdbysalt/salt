---
slug: keeper-meetings-records
kind: profile
name: Meetings Records
player_slug: keeper
description: Maintain durable meeting records from calendar sync, attendance evidence, and meeting-content context.
when_to_use: |
  Runs when Capture resolves a meeting from calendar sync, an invite, or connected scheduling tools.
  Re-runs when attendance evidence, recordings, transcripts, or new attendee context can improve the record.
trigger:
  type: capture
  signal: meeting_resolved
---

# Meetings Records

## What this does

Keeper owns the durable meeting record policy: which calendar events become meeting records, which fields the calendar owns outright, what Salt may infer about a meeting, and what stays the user's alone. It covers the full meeting record surface:

1. **Identity** - the meeting title as shown on the calendar, and whether the event is a business meeting at all.
2. **Type and status** - the `meeting_type` purpose (discovery, kickoff, check-in, review, presentation, workshop, interview, other) and the `meeting_status` lifecycle (scheduled, completed, cancelled, no-show).
3. **Time and place** - start and end times, location type (google-meet, zoom, phone, in-person, custom), meeting URL, address, and dial-in phone number.
4. **People and links** - the attendee list, plus person, organization, and work references.
5. **Content** - agenda/description, Salt-authored summary and outcome, decisions, and action items.
6. **Private surfaces** - the user's private notes and the record's visibility, which Salt never writes.

Activity history is append-only. Salt can read the timeline as evidence and can append a clearly attributed activity entry for work Salt actually performed, but it never rewrites, deletes, or backfills what happened.

Executable today: the typed field engine does not yet execute meeting fields. This playbook is policy-first, like the entity-notes playbook — the operating model below is the contract the engine grows into.

## Field contract

The meeting record has **13 contracted fields** (canon: `brand-identity/product-internal/features/keeper-field-contracts.md`, Meetings section). Every vocabulary comes from the taxonomy registry.

| Field | Format / vocabulary | Keeper write policy |
|-------|---------------------|---------------------|
| Title | text | **User/calendar only** — never rewritten |
| Meeting Type | `meeting_type` (`discovery`, `kickoff`, `check-in`, `review`, `presentation`, `workshop`, `interview`, `other`) | Ask first (high-confidence inference applies above threshold) |
| Status | `meeting_status` (`scheduled`, `completed`, `cancelled`, `no-show`) | **Auto-apply from calendar/time evidence** (completed requires end-time passage + attendance evidence); `no-show` is always ask-first |
| Start / End | datetime | **Auto-apply** — calendar sync owns them |
| Location Type | `meeting_location_type` (`google-meet`, `zoom`, `phone`, `in-person`, `custom`) | Auto-apply from calendar sync |
| Meeting URL | url | Auto-apply from calendar sync |
| Address | text | Ask first (fill from clear invite text only) |
| Phone Number | phone (E.164 preferred, stored as entered) | Ask first |
| Description / Agenda | text | Ask first (synced invite changes apply; inferred content asks) |
| Notes | text | **User only** |
| Visibility | select | **User only** |
| Attendees | json | **Auto-apply** — calendar sync maintains the list |

## Meetings detail page coverage

The Meetings Records playbook is the policy owner for the record data that powers the Meetings detail page.

| Detail page surface | What must be maintained | Ownership policy |
|---------------------|-------------------------|------------------|
| Hero | Title, type, status, start/end, location, join link, counterparty context | Calendar-sourced facts apply directly; the calendar is the source of truth for times, attendees, and location. Title is never rewritten. |
| Overview | Summary, outcome, agenda | Summaries and outcomes are Salt-authored with provenance. Agenda edits from invite updates apply; inferred agenda content waits for review. |
| Overview — decisions | Decisions extracted from the meeting (rendered inside Overview, not a separate tab) | Salt-authored with provenance from transcript/summary evidence. Never overwrite a user-edited decision. |
| Overview — action items | Action items extracted from the meeting (rendered inside Overview, not a separate tab) | Salt-authored with provenance. Completion state belongs to the user or to explicit evidence, not inference. |
| Docs tab | Recordings, transcripts, and linked documents | Link artifacts produced by the meeting itself. Do not invent doc links from filename similarity. |
| Connections tab | Person, organization, and work links | Auto-link on exact attendee email matches. Ambiguous or similarity-only links wait for review. |
| Notes tab | User private notes | Never written by Salt. Salt-authored content lives in summary, decisions, and action items instead. |
| Activity tab | Timeline of scheduling changes and Salt actions | Append-only. Salt may append entries for changes it made. It never rewrites historical events. |
| Quick links card | Join link, recording, transcript, and related shortcuts | Derived from maintained fields and linked artifacts; the card itself is display logic. |
| Plays card | Plays related to the meeting | Read-only from play queues. Keeper maintains the links that make play matching reliable. |

## When it runs

- **Meeting resolved** - calendar sync or Capture identifies a meeting from an invite, event, or connected scheduling tool.
- **Calendar changes** - the event is moved, cancelled, or its attendee list changes.
- **Meeting ends** - end time passes and attendance evidence (join records, transcript, recording) is available.
- **Content arrives** - a transcript, recording, or summary source becomes available after the meeting.
- **Manual review starts** - a user opens the meeting record and asks Salt to re-check the fields.

## How it works

1. **Admit or skip** - Salt asks whether the calendar event is a business meeting worth a durable record. Focus blocks, personal events, and all-hands broadcasts with no relationship context do not qualify.
2. **Sync calendar facts** - Start, end, attendees, location type, meeting URL, and cancellations come from calendar sync and apply directly. The calendar is the source of truth; Salt does not second-guess it.
3. **Infer the type** - Meeting type is inferable from title and agenda ("Kickoff — Acme rebrand" implies kickoff). High-confidence inference applies above threshold; below threshold it waits for review.
4. **Resolve the people** - Attendee emails that exactly match existing people auto-link the meeting to those person, organization, and work records. Ambiguous matches wait.
5. **Close the loop on status** - After the end time passes with attendance evidence, the meeting moves to completed automatically. Cancellations from the calendar apply. No-show is a judgment about a person and is always ask-first.
6. **Author the content** - When a transcript or summary source exists, Salt writes the summary, outcome, decisions, and action items with provenance. User edits to any of these are final; Salt never regenerates over them.
7. **Set confidence and status** - If `confidence >= autoApplyThreshold`, Salt applies the value. Below threshold, it holds the change for review.
8. **Record provenance** - Salt records the field, value, source, confidence, explanation, status, and evidence so the user can understand or correct the result.

## What you approve

Calendar-sourced facts auto-apply: times, attendees, location type, meeting URL, and calendar-driven status changes. Completed status applies automatically once the end time has passed and attendance evidence exists.

Some surfaces always wait: meeting type inference below threshold; the no-show status (it makes a claim about a person); physical address and dial-in numbers typed from free text; agenda content Salt inferred rather than synced; and any regeneration that would touch user-edited summaries, decisions, or action items.

## Workspace context

Meetings Records depends on bounded context, not broad search.

**What it uses**

- **Scheduling sources** - the calendar event itself: times, attendees, location, links, and cancellation state.
- **Meeting artifacts** - transcripts, recordings, and summary sources produced by this meeting.
- **People, Org, and Work memory** - only records tied to the attendee emails or the linked work item.
- **Me memory** - the operator's timezone and working context, for display and scheduling logic only.

**What it ignores**

- Unrelated people, orgs, work, files, billing records, and conversations.
- Other meetings, except when detecting a recurring series the record belongs to.
- Broad workspace memory not anchored to this meeting's attendees or linked work.

**Time policy**

- The trigger is evidence-based, not scheduled.
- Completed status uses one exact rule: end time has passed and attendance evidence exists.
- Treat conflicting calendar and transcript evidence as a review case, not an auto-apply case.

## Record lifecycle

**Qualifies as a meeting when**

- A calendar event exists with at least one external attendee tied to a person, org, or work record.
- The user schedules, books, or explicitly asks Salt to track the meeting.
- A connected scheduling tool reports a booked session with a real counterparty.

**Does not qualify when**

- The event is a focus block, reminder, personal appointment, or solo hold.
- The event is a mass broadcast (webinar blast, company all-hands) with no relationship context for this workspace.
- The evidence is only a proposed time in an email thread — that is scheduling context, not a held meeting.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Title | The calendar event | Calendar/user only | None | None | Rewriting or "improving" the calendar title |
| Type | Title, agenda, series context | Write policy | High-confidence inference above threshold | Inference below threshold, conflicting signals | Guessing from attendee names alone |
| Status | Calendar sync, end-time passage, attendance evidence | Write policy | Scheduled/cancelled from calendar; completed after end time with attendance evidence | No-show — always a proposal | Marking completed with no evidence the meeting happened |
| Start / End | Calendar sync | Write policy | Calendar sync owns them for external meetings | Manual corrections without calendar backing | Editing against the synced event |
| Location type + URL | Calendar sync | Write policy | Calendar-provided location and join link | Custom location types from free text | Replacing a working join link |
| Address / Phone | Invite body, user entry | Write policy | None by default | Fill from clear invite text | Scraped or guessed addresses and numbers |
| Attendees | Calendar sync | Write policy | Calendar sync maintains the list for external meetings | Adding people not on the event | Removing attendees the calendar still lists |
| Person/org/work links | Exact attendee email matches, linked work evidence | Write policy | Exact email match above threshold | Ambiguous or similarity-only matches, reassigning existing links | Invented links, same-name-only links |
| Agenda / description | Invite updates, user edits | Write policy | Synced invite description changes | Salt-inferred agenda content | Overwriting user-written agenda text |
| Summary / outcome / decisions / action items | Transcripts, recordings, summary sources | Salt-authored with provenance | Generate above threshold when no user edit exists | Regeneration, subjective or client-facing phrasing | Overwriting user edits |
| Private notes | The user | User only | None | None | Reading into other fields or writing at all |
| Visibility | The user, workspace policy | User only | None | None | Any change |
| Provenance and explanations | Rule output, confidence, evidence, source | Read-only history | Append new provenance rows | Correct the current field via review | Rewrite provenance history |
| Activity and audit history | Scheduling events, sync events, Salt actions | Append-only evidence | Append a clearly attributed Salt activity entry | Any sensitive or high-impact activity entry | Rewrite, delete, backfill, or mutate historical events |

**What it never touches**

The title, the user's private notes, and visibility are the user's alone. Salt never marks a person a no-show without approval, never edits synced calendar facts against the calendar, and never regenerates content over a user's edit. Provenance and activity history are trust records: Salt appends clearly attributed entries for its own actions and nothing else.

**Negative examples**

- A "Deep work" calendar block should not become a meeting record.
- "Sync w/ J" at a time when Jane's email is not on the event should not auto-link to Jane on the name fragment alone.
- A meeting whose end time passed with no join records, transcript, or reply evidence should not silently flip to completed — and it certainly should not flip to no-show.
- A user shortened the Salt summary; new transcript processing must not regenerate over that edit.
- An invite titled "Quarterly review" between two internal aliases is not automatically a client review meeting.

Executable today: no typed engine executes meeting fields yet. The ownership matrix above is the policy for the durable meeting record and the roadmap for the engine when it lands.
