---
name: Notes
slug: notes
version: 2.0.0
description: Detect, create, and maintain entity notes
---

# Notes

Salt detects note-worthy information from your communications — preferences, context, flags, and relationships — and attaches them to the right entities in Memory.

## How it Works

### 1. Detection (Signal-Driven)

Salt scans incoming communications for patterns that indicate important information:

| Note Type | Detection Patterns | Example |
|-----------|-------------------|---------|
| **Preference** | "I prefer", "always", "never", "please don't" | "I prefer morning meetings before 10am" |
| **Context** | "met at", "referred by", "worked together" | "Met at SaaS Connect 2025" |
| **Flag** | "concerned", "frustrated", "delayed", "risk" | "Frustrated with project timeline" |
| **Relationship** | "reports to", "works with", "manages" | "Reports to Sarah Chen" |

When a pattern matches, Salt:
1. Extracts the key statement (1-2 sentences)
2. Classifies the note type
3. Assigns a confidence score
4. Queues for your review (or auto-applies if confident)

### 2. Lifecycle Management (Weekly)

Every Sunday at 2am, Salt maintains note quality:

| Action | Trigger | What Happens |
|--------|---------|--------------|
| Archive | Note unchanged for 180 days | Moves to archive, keeps history |
| Merge | Duplicate notes on same entity | Combines into one, preserves info |
| Version | Note updated | Creates version history |

## Note Types

| Type | Purpose | Typical Sources |
|------|---------|-----------------|
| **Preference** | How they like to work | Email, meetings |
| **Context** | Relationship background | Introductions, events |
| **Flag** | Warning signs | Complaints, concerns |
| **Relationship** | Who knows whom | Org charts, threads |

## When it Runs

- **Continuously**: On every processed capture (email, meeting, file)
- **Weekly**: Sunday 2am for cleanup and merging

## What You'll See

Notes appear on entity detail pages:
- Person pages show their preferences and context
- Work pages show flags and concerns
- Organization pages show relationship context

Flagged notes surface in HQ for attention.

## Configuration

| Setting | Value |
|---------|-------|
| Auto-apply threshold | 80% (confident notes applied automatically) |
| Approval mode | Per entity (review notes one by one) |
| Stale after | 180 days (archived but not deleted) |
| Merge duplicates | Yes (same type on same entity) |

## Requirements

- **Optional**: Email connector (primary source of notes)
- **Optional**: Calendar connector (meeting context)
- **Optional**: Documents connector (file-based context)

Notes work with whatever signals are available — more connectors = richer context.
