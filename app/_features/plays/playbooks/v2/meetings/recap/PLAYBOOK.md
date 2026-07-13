---
name: Meeting Recap
slug: meeting-recap
version: 1.0.0
description: Generates post-meeting summary with action items
---

# Meeting Recap

Salt generates post-meeting summaries with decisions and action items, so nothing falls through the cracks after your calls.

## How it Works

1. **Detects meeting end** - Monitors calendar for completed meetings
2. **Gathers notes** - Pulls any meeting notes if available
3. **Generates recap** - Creates structured summary with action items
4. **Delivers notification** - Shows up in HQ after your meeting

## When it Runs

- **Trigger**: When a calendar meeting ends
- **No approval needed**: Recaps are informational only

## What You'll See

Each recap includes:
- **Key decisions** - What was decided in the meeting
- **Action items** - Tasks with owners and deadlines
- **Follow-up needed** - Next steps or outstanding questions

## Example Recap

> **Kickoff: Website Redesign**
> *With Sarah Chen (Acme Corp)*
>
> **Decisions:**
> - Go with Option B for homepage layout
> - Launch target: March 15
>
> **Action items:**
> - [ ] Sarah: Send brand assets by Friday
> - [ ] You: Draft wireframes by next Tuesday
>
> **Follow-up:**
> - Schedule design review for next week

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (structured, scannable) |
| Approval | None (auto-delivers) |
| Trigger | Meeting end |

## Requirements

- **Required**: Calendar connector (Google Calendar, Outlook)
- **Optional**: Meetings connector (for transcripts/notes)
