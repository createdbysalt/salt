---
name: Blocker Watch
slug: blocker-watch
version: 1.0.0
description: Alerts when work items become blocked
---

# Blocker Watch

Salt monitors your work items for blockers and surfaces issues before they derail projects.

## How it Works

1. **Detects blockers** - Monitors work items for blocked status
2. **Gathers context** - Pulls blocker reason and dependencies
3. **Generates alert** - Creates actionable notification
4. **Delivers immediately** - Shows up in HQ for attention

## When it Runs

- **Trigger**: When a work item is marked as blocked
- **No approval needed**: Alerts are informational only

## What You'll See

Each alert includes:
- **Work item** that's blocked
- **Blocker reason** - what's stopping progress
- **Suggested actions** - how to unblock

## Example Alert

> **Work Blocked: Website Redesign**
>
> **Blocker:** Waiting on brand assets from client
>
> **Impact:** Can't proceed with homepage design
>
> **Suggested action:** Email Sarah to request assets with deadline

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (direct, factual) |
| Approval | None (auto-delivers) |
| Trigger | work_is_blocked signal |

## Requirements

- **No connectors required**: Works with Memory data
