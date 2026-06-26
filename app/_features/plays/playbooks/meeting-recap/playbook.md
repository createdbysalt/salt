---
slug: meeting-recap
name: Meeting Recap
player_slug: brief
description: Summarize a recent meeting into a brief you can share after review.
when_to_use: |
  Use when a meeting ends or a new transcript is available.
  Proactively suggest when Capture routes a meeting or Fireflies transcript.
trigger:
  type: capture
  signal: meeting_ended
consent:
  approval_required: false
value:
  kind: time_saved
  amount: 15
  currency: USD
---

# Meeting Recap

## What this does

Reads the meeting transcript, summarizes key decisions and open questions, and saves an internal brief — no external send unless you choose to share it later.

## When it runs

- A meeting just ended
- A new transcript lands from Fireflies or calendar capture

## Steps

1. **Load transcript** — Salt pulls the latest meeting transcript.
2. **Summarize** — Extracts decisions, owners, and open questions in your voice.
3. **Render brief** — Formats a scannable recap you can paste or share after review.

## What you approve

External sharing only if you explicitly approve a follow-up play; this recipe auto-saves the draft brief internally.

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "fetch",
      "tool": "FIREFLIES_GET_TRANSCRIPT",
      "params": {},
      "bind": "transcript"
    },
    {
      "kind": "llm",
      "purpose": "meeting_recap",
      "modelSlot": "playPersonalize",
      "instructions": "Summarize this meeting: decisions, open questions, next moves. Bullet format.",
      "inputs": ["transcript.title", "transcript.summary"],
      "maxTokens": 400,
      "bind": "recap"
    },
    {
      "kind": "render",
      "template": "# Meeting recap: {{transcript.title}}\n\n{{recap}}",
      "bind": "brief"
    }
  ],
  "value": {
    "kind": "time_saved",
    "amount": 15,
    "currency": "USD"
  }
}
```
