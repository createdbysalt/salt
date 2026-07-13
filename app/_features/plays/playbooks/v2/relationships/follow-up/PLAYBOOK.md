---
name: Follow-up
slug: follow-up
version: 1.0.0
description: Drafts re-engagement messages for quiet contacts
---

# Follow-up

Salt drafts re-engagement messages for contacts that have gone quiet, helping you maintain relationships without the overhead of tracking who needs attention.

## How it Works

1. **Detects silence** - Monitors for contacts with no interaction in 30+ days
2. **Classifies relationship** - Determines if client, prospect, or general contact
3. **Gathers context** - Pulls recent notes and interaction history
4. **Drafts message** - Creates a warm, specific follow-up
5. **Queues for review** - You review and send when ready

## Message Types

| Relationship | Approach |
|--------------|----------|
| Client | Check-in on recent work, ask how things are going |
| Prospect | Reference past conversation, offer value |
| Meeting follow-up | Continue thread from recent meeting |
| General | Reconnect with genuine interest |

## When it Runs

- **Trigger**: When a contact has no activity for 30+ days
- **Requires**: Email connector

## What You'll See

Each play shows:
- **Contact name** and relationship type
- **Last interaction** and context
- **Draft message** tailored to the relationship

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Follow-up (warm, casual) |
| Approval | Per contact (you review each one) |
| Silence threshold | 30 days |

## Requirements

- **Required**: Email connector (for interaction history and sending)
