# Meeting Recap Domain Reference

## Entity

Meeting transcript and the internal brief Salt prepares from it.

## Fields It Can Read

- `transcript.title` - meeting title from the transcript provider.
- `transcript.summary` - transcript summary or transcript-derived notes.
- `run.title` - run label used for internal context.

## Fields It Can Write

- `brief` - internal rendered recap. This playbook does not send external messages.

## Create vs Update Policy

- Create a new brief when a new meeting transcript lands.
- Update only the draft/internal brief for the same meeting.
- Skip when no transcript is available.
- Ask for review before any external follow-up is sent by another playbook.

## Value Taxonomy

- `time_saved` - minutes avoided by not manually reading and summarizing the transcript.

## Signals

- `meeting_ended` - Capture or the transcript provider reports that a meeting finished.
- `transcript_available` - a connected transcript provider has a transcript for the meeting.

## Context Budget

### Connected tools

- Required: one transcript source such as Fireflies or a future meeting transcript provider.
- Optional: calendar metadata for attendee names and meeting title.
- Ignored: billing, broad conversation history, unrelated files, unrelated teams, and unrelated memory records.

### Memory scope

- Entity anchor: meeting id or transcript id when available.
- Memory surfaces: meetings first; linked people, orgs, work, files, teams, and me only if needed to disambiguate attendees or voice. Billing and broad conversations are ignored for this playbook.
- Relation filters: records connected to the meeting, attendees, or work item.
- Time window: the meeting transcript and directly linked records, not historical workspace memory.
- Max records: transcript plus a small set of linked entities.
- Ranking: direct meeting/work links before indirect attendee links.

### Operating surfaces

- Spaces: use the meeting's client/project space if the transcript belongs to a shared work area; otherwise no space scope.
- Connections: use attendee/person/org connections only for disambiguation, not as recap source material.
- Visibility or approval boundary: internal brief stays inside Salt unless a follow-up play is approved.
- Trigger scope: transcript availability or meeting end inside the relevant workspace/space.

### Time

- Trigger schedule/deadline/elapsed-time rule: run when the meeting ends or when the transcript becomes available.
- Lookback/lookahead window: use the transcript for the completed meeting only.
- Timezone/business-day assumption: not needed for this internal brief.
- Recency or staleness rule: if multiple transcripts match, use the newest transcript for the meeting id.

### LLM context

- Facts passed: transcript title and transcript summary.
- Facts excluded: unrelated people, orgs, work, files, billing, conversations, meetings, teams, me profile data, and full connected-app history.
- Max input paths: `transcript.title`, `transcript.summary`.

### Degradation

- If a required transcript is missing: skip and wait for a transcript.
- If optional calendar metadata is missing: proceed from transcript title.
- If too many records match: use only directly linked meeting/work records.
- If evidence conflicts: prefer the transcript for recap content and hold relationship/account updates for other playbooks.

## Decision Order

1. Confirm a transcript exists.
2. Read only the transcript fields needed for an internal recap.
3. Render the internal brief.
4. Do not send externally.

## Confidence Policy

This playbook prepares internal copy only. External sharing requires separate approval.

## Conflict Policy

Transcript content is the source of truth for the recap. Durable `/memory` corrections may influence names or context later, but should not override transcript facts without review.

## Provenance

Record the transcript source and meeting title with the generated brief.
