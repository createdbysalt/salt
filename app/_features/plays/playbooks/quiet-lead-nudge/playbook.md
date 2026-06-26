---
slug: quiet-lead-nudge
name: Quiet Lead Nudge
player_slug: follow-up
description: Revive a quiet lead with a personalized follow-up draft when a thread has gone stale.
when_to_use: |
  Use when a person has gone silent after a promised next step or open thread.
  Proactively suggest when Capture shows no response for 14+ days.
trigger:
  type: pattern
  signal: no_response
  min_days_since_contact: 14
consent:
  approval_required: true
value:
  kind: gap_closed
  fromGap: true
---

# Quiet Lead Nudge

## What this does

Checks how long it has been since the last reply, then drafts a warm follow-up in Gmail for your review. Salt never sends without approval.

## When it runs

- A lead or client has not replied in 14+ days
- Capture or Follow-up Player flags a stalled conversation

## Steps

1. **Read the thread** — Salt pulls recent Gmail context so the draft references real history.
2. **Check staleness** — If the thread is still active, skip quietly (no nagging).
3. **Personalize** — Salt adjusts tone and specifics from thread context and your Memory.
4. **Draft in Gmail** — Creates a draft you can edit and send when ready.

## What you approve

Sending the follow-up email (draft is saved automatically; send stays with you).

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "fetch",
      "tool": "GMAIL_FETCH_EMAILS",
      "params": { "max_results": 5 },
      "bind": "thread"
    },
    {
      "kind": "guard",
      "path": "thread.days_since_reply",
      "op": "gte",
      "value": 14
    },
    {
      "kind": "llm",
      "purpose": "personalize_follow_up",
      "modelSlot": "playPersonalize",
      "instructions": "Write a concise, warm follow-up referencing the last open topic. No guilt trips.",
      "inputs": ["run.recipient_label", "thread.subject"],
      "maxTokens": 300,
      "bind": "body"
    },
    {
      "kind": "act",
      "tool": "GMAIL_CREATE_EMAIL_DRAFT",
      "params": {
        "body": "{{body}}",
        "subject": "Re: {{thread.subject}}"
      }
    }
  ],
  "value": {
    "kind": "gap_closed",
    "fromGap": true
  }
}
```
