---
slug: meeting-follow-up
kind: acting
name: Meeting Follow-up
player_slug: follow-up
description: Draft a follow-up message after a meeting, summarizing key points and next steps.
when_to_use: |
  Draft post-meeting follow-up email to attendees.
  Compose meeting recap summarizing action items.
trigger:
  type: signal
  signal: meeting_end_passed
consent:
  approval_required: true
---

# Meeting Follow-up

## What this does

Drafts a professional follow-up email to meeting attendees after a meeting ends. The message summarizes key discussion points and confirms any next steps or action items.

## When it runs

- Automatically when a meeting's end time passes and Salt has attendance evidence (transcript, notes, or calendar confirmation)
- On request when you ask Salt to follow up after a specific meeting

## How it works

1. **Context pre-filled** — When this play is queued, the meeting details are included in the run context.
2. **Extract context** — If notes or transcript exist in the context, Salt identifies key points and action items.
3. **Draft the follow-up** — Uses your Follow-up player's tone to write a concise recap email.
4. **Surface for approval** — The draft appears in your queue. You can edit, send, or dismiss.

## What you approve

The full email draft before it sends. Salt never sends meeting follow-ups automatically — you always review first.

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "guard",
      "path": "run.context_inputs.attendees",
      "op": "exists"
    },
    {
      "kind": "llm",
      "purpose": "draft_external_output",
      "modelSlot": "copyClientFacing",
      "instructions": "Draft a professional meeting follow-up email. Include: 1) Thank attendees for their time, 2) Summarize 2-3 key discussion points if notes are available, 3) List any agreed action items, 4) Suggest next steps if appropriate. Keep it concise (under 200 words). Match the user's tone preferences from player context.",
      "inputs": [
        "run.context_inputs.meeting_title",
        "run.context_inputs.attendees",
        "run.context_inputs.notes",
        "run.title"
      ],
      "maxTokens": 400,
      "bind": "draftBody"
    },
    {
      "kind": "render",
      "template": "Subject: Following up from {{run.context_inputs.meeting_title}}\n\n{{draftBody}}",
      "bind": "emailDraft"
    }
  ],
  "value": {
    "kind": "time_saved",
    "amount": 10,
    "currency": "USD"
  }
}
```
