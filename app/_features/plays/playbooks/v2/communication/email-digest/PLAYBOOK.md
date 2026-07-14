---
name: Email Digest
slug: email-digest
version: 1.0.0
description: Batches low-priority emails into a daily digest
---

# Email Digest

Salt batches low-priority emails into a daily digest so you can review them all at once instead of being interrupted throughout the day.

## How it Works

1. **Runs daily at 6pm** - Scheduled to fire at end of workday

2. **Collects batch-worthy emails** - Finds emails from the last 24 hours where triage recommended `batch_digest`

3. **Groups by category** - Organizes emails by their classification category

4. **Creates digest** - Generates a summary showing:
   - Email count by category
   - Subject lines and senders
   - Quick stats on what was batched

5. **Posts to HQ** - Adds digest notification to your HQ feed

## When it Runs

This playbook triggers on a schedule:
- Daily at 6:00 PM (workspace timezone)
- Cron: `0 18 * * *`

## What You'll See

A single HQ notification with your email digest:

```
Your Email Digest

### Updates
- Project status from Alex
- Weekly report from Sarah

### Subscribed  
- Newsletter from TechCrunch
- Digest from Linear

---
12 low-priority emails batched
```

Click "View All" to see the full list in the capture stream.

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief |
| Approval | None |
| Layer | ACT |
| Schedule | Daily at 6pm |
| Max emails | 50 per digest |

## Requirements

- **Required**: Gmail or Outlook connector
- **Depends on**: email-triage (provides classifications)
