---
name: Memory Hygiene
slug: memory-hygiene
version: 2.0.0
description: Audit Memory for stale data, incomplete records, and data quality issues.
---

# Memory Hygiene

You audit Memory for data quality issues and surface cleanup opportunities. This is a maintenance playbook that runs weekly and after bulk operations.

**System playbook** — this is a protected playbook in the `_meta` section that manages Memory-wide data quality.

## Summary

- **Duplicate detection** — merge candidates via email, phone, domain matching
- **Stale records** — archive candidates with 90+ days inactivity  
- **Incomplete records** — missing required fields like email
- **Orphan records** — no connections to other entities
- **Health scoring** system (A-F grade)

## How It Works

Weekly on Sunday at 3am (and after bulk imports):

1. Scan all records for hygiene signals using `memoryGetStaleRecords`, `memoryGetIncompleteRecords`, `memoryGetOrphanRecords`
2. Match signals against issue rules to calculate severity
3. Compute overall health score
4. Generate prioritized report with actionable suggestions
5. Surface to operator for review and batch actions

## Health Score

```
health_score = 100 - (critical * 3 + high * 2 + medium * 1) / total_records * 100
```

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Excellent — minimal issues |
| 80-89 | B | Good — some gaps to fill |
| 70-79 | C | Fair — noticeable data quality issues |
| 60-69 | D | Poor — many records need attention |
| < 60 | F | Critical — significant cleanup needed |

## Issue Severity

| Severity | Score | Meaning |
|----------|-------|---------|
| **critical** | 90-100 | Blocks automation, must fix |
| **high** | 70-89 | Degrades experience, should fix |
| **medium** | 50-69 | Missing value, nice to fix |
| **low** | < 50 | Minor issue, batch cleanup |

## Entity Types

### People (5 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `person_missing_email` | critical (95) | Add email or mark incomplete |
| `person_missing_relationship_type` | high (80) | Infer from signals or ask |
| `person_orphan` | medium (65) | Link to org or mark independent |
| `person_no_activity_90d` | medium (60) | Archive or mark inactive |
| `person_no_activity_180d` | high (75) | Strong archive candidate |

### Organizations (4 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `org_missing_domain` | high (85) | Derive from people emails |
| `org_missing_primary_contact` | high (78) | Identify from activity |
| `org_missing_industry` | medium (55) | Infer from domain or ask |
| `org_no_activity_90d` | medium (60) | Review relationship status |

### Work (6 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `work_missing_client` | critical (92) | Link to org/person or mark internal |
| `work_missing_status` | high (82) | Infer from activity |
| `work_missing_deadline` | medium (65) | Add deadline or mark open-ended |
| `work_missing_value` | medium (58) | Add value or mark time-based |
| `work_stale_active` | high (78) | Update status or add note |
| `work_orphan` | high (85) | Link to client |

### Billing (4 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `billing_missing_party` | critical (90) | Link to person/org |
| `billing_missing_due_date` | high (75) | Add due date |
| `billing_overdue_90d` | critical (95) | Follow up or write off |
| `billing_orphan` | high (85) | Link to work or delete |

### Files (2 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `file_missing_category` | medium (55) | Auto-categorize or ask |
| `file_orphan` | medium (60) | Link to entity or mark standalone |

### Meetings (2 rules)

| Signal | Severity | Suggested Action |
|--------|----------|------------------|
| `meeting_missing_attendees` | medium (65) | Link from calendar data |
| `meeting_past_no_outcome` | medium (55) | Add notes or mark no-show |

## Priority Ranking

Issues are ranked by:
1. **Severity score** (critical first)
2. **Record value** (clients > prospects > vendors > personal)
3. **Recency** (recent for incomplete, old for stale)
4. **Billing impact** (records with billing history ranked higher)

## What You See

Weekly hygiene report includes:

- **Health score and grade** (A-F)
- **Issue counts** by severity
- **Top 10 priority issues** with suggested actions
- **Quick action buttons** for batch operations

## When It Runs

| Trigger | When |
|---------|------|
| Schedule | Sunday 3am weekly audit |
| Import | After bulk import (10+ records) |
| On demand | "Check my Memory health" |

## What It Never Does

- Auto-delete records (always archives or suggests merge)
- Auto-merge without approval (surfaces merge candidates for review)
- Auto-fill without confidence threshold
- Modify records with active billing without flagging

## References

- `references/stale-criteria.md` — How staleness is determined per entity
- `references/required-fields.md` — Which fields are required per entity
- `references/health-scoring.md` — Detailed health score calculation
