---
slug: new-contact-follow-up
kind: acting
name: New Contact Follow-up
player_slug: follow-up
description: Draft a follow-up message when Salt notices a new contact was added to Memory.
when_to_use: |
  When a new person is added to Memory from a message.
  When a bidirectional email thread is established with someone new.
  When the user asks to follow up with a recent contact.
trigger:
  type: chat
consent:
  approval_required: true
---

# New Contact Follow-up

## What this does

Drafts a brief, personalized follow-up message to someone Salt recently added to your Memory. The goal is to strengthen a new relationship while the connection is still fresh.

## When it runs

- When you ask Salt to follow up with a new contact
- When Salt notices a new person was added to Memory from a message (future: signal trigger)

## How it works

1. **Context pre-filled** — When this play is queued, the person's name and email are included in the run context.
2. **Draft the message** — Uses your Follow-up player's tone preferences to draft a warm, non-salesy note.
3. **Surface for approval** — The draft appears in your queue for review before sending.

## What you approve

Everything. This playbook always waits for your approval before sending any message. You can edit the draft, change the recipient, or dismiss it entirely.

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "guard",
      "path": "run.context_inputs.person_email",
      "op": "exists"
    },
    {
      "kind": "llm",
      "purpose": "draft_external_output",
      "modelSlot": "copyClientFacing",
      "instructions": "Draft a brief, warm follow-up email to this new contact. Keep it under 3 sentences. Do not be salesy. Match the user's tone preferences if provided in player context.",
      "inputs": [
        "run.context_inputs.person_name",
        "run.context_inputs.person_email",
        "run.context_inputs.context_notes",
        "run.title"
      ],
      "maxTokens": 300,
      "bind": "draftBody"
    },
    {
      "kind": "render",
      "template": "To: {{run.context_inputs.person_email}}\nSubject: Great connecting with you\n\n{{draftBody}}",
      "bind": "emailDraft"
    }
  ],
  "value": {
    "kind": "time_saved",
    "amount": 5,
    "currency": "USD"
  }
}
```
