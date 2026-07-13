# Stale Criteria

How Memory Hygiene determines record staleness per entity type.

## What Counts as Activity

Activity is any interaction that indicates the record is still relevant:

| Activity Type | Updates `last_activity_at` |
|---------------|----------------------------|
| Email sent/received | Yes |
| Meeting held | Yes |
| Invoice created/paid | Yes |
| Note added | Yes |
| Field edited | Yes |
| File uploaded | Yes |
| Record viewed (UI) | No (passive) |
| Search result | No (passive) |

## Staleness Thresholds

### People

| Threshold | Signal | Severity |
|-----------|--------|----------|
| 30 days | `person_no_activity_30d` | Low (not surfaced) |
| 60 days | `person_no_activity_60d` | Low (not surfaced) |
| 90 days | `person_no_activity_90d` | Medium (60) |
| 180 days | `person_no_activity_180d` | High (75) |

**Exceptions (not considered stale):**
- Has active work linked
- Has unpaid invoices
- Marked as "dormant client" (expected to return)

### Organizations

| Threshold | Signal | Severity |
|-----------|--------|----------|
| 90 days | `org_no_activity_90d` | Medium (60) |
| 180 days | `org_no_activity_180d` | High (75) |

**Exceptions:**
- Has people with recent activity
- Has active work linked
- Has unpaid invoices

### Work

| Condition | Signal | Severity |
|-----------|--------|----------|
| Status = "active" but no activity 60d | `work_stale_active` | High (78) |
| No activity 60d (any status) | `work_no_activity_60d` | Medium (55) |

**Exceptions:**
- Status = "completed" or "archived"
- Has future deadline
- Has scheduled meetings

### Billing

| Condition | Signal | Severity |
|-----------|--------|----------|
| Overdue 90+ days | `billing_overdue_90d` | Critical (95) |

This is about unpaid invoices, not general staleness.

### Meetings

| Condition | Signal | Severity |
|-----------|--------|----------|
| Past meeting, no notes/outcome | `meeting_past_no_outcome` | Medium (55) |

Only applies to meetings in the past 30 days. Older meetings without notes are not flagged (too late to add context).

## Stale vs Archived

**Stale** = No recent activity, might need attention
**Archived** = Explicitly marked as no longer active

Hygiene suggests archiving stale records. Archived records:
- Don't appear in active searches
- Don't count toward health score
- Can be restored anytime
- Preserve all history and links

## Suggested Actions by Staleness

| Entity | 90d Stale | 180d Stale |
|--------|-----------|------------|
| Person (client) | Review, consider reach-out | Strong archive candidate |
| Person (prospect) | Mark as cold lead | Archive |
| Person (vendor) | Review if still vendor | Archive if relationship ended |
| Organization | Review relationship status | Archive if no ongoing work |
| Work | Update status or close | Archive |
