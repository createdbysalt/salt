---
name: Meeting Prep
slug: meeting-prep
version: 1.0.0
description: Prepares brief with attendee context before meetings
---

# Meeting Prep

Salt prepares context briefs for your upcoming meetings, pulling together attendee history, recent interactions, and relevant work items so you walk in prepared.

## How it Works

1. **Scans calendar** - Checks for meetings in the next 4 hours
2. **Gathers context** - Pulls attendee info, recent emails, related work
3. **Generates brief** - Creates a scannable summary with talking points
4. **Delivers to HQ** - Shows up before your meeting

## When it Runs

- **Schedule**: Daily at 8am
- **Scope**: Meetings in the next 4 hours
- **No approval needed**: Briefs are informational only

## What You'll See

Each brief includes:
- **Attendees** - Who's in the meeting and their context
- **Recent interactions** - Last emails, meetings, or notes
- **Related work** - Active projects with this person/org
- **Talking points** - Suggested topics based on context

## Example Brief

> **Kickoff: Website Redesign**
> *In 2 hours with Sarah Chen (Acme Corp)*
>
> **Context:** Primary contact, 6-month client relationship
> **Recent:** Signed contract last week, $15k project
> **Work:** Website Redesign (just started)
>
> **Talking points:**
> - Confirm timeline and milestones
> - Discuss brand assets access
> - Clarify approval workflow

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (concise, factual) |
| Approval | None (auto-delivers) |
| Schedule | Daily at 8am |
| Lookahead | 4 hours |

## Requirements

- **Required**: Calendar connector (Google Calendar, Outlook)
- **Optional**: Email connector (for interaction history)
