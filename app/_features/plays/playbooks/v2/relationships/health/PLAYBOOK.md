---
name: Relationship Health
slug: relationship-health
version: 1.0.0
description: Monitors relationship health and surfaces risks
---

# Relationship Health

Salt monitors your relationships for signs of disengagement and surfaces at-risk contacts before they go cold.

## How it Works

1. **Scans for silence** - Finds relationships with no recent activity
2. **Assesses risk** - Prioritizes by relationship type and business impact
3. **Generates alert** - Creates actionable summary with next steps
4. **Delivers finding** - Shows up in HQ for attention

## Risk Levels

| Priority | Relationship Type | Silence Threshold |
|----------|------------------|-------------------|
| High | Active clients | 30+ days |
| Medium | Prospects | 14+ days |
| Low | General contacts | 60+ days |

## When it Runs

- **Trigger**: When contacts go silent beyond threshold
- **No approval needed**: Alerts are informational only

## What You'll See

Each alert includes:
- **At-risk count** by priority level
- **Top relationships** needing attention
- **Suggested actions** for each

## Example Alert

> **Relationship Health Alert**
>
> **High priority (2):**
> - Sarah Chen (Acme Corp) — 35 days, active project
>   → Send project status update
> - Alex Kim (TechStart) — 42 days, recent proposal
>   → Follow up on proposal decision
>
> **Medium priority (3):**
> - Jordan Lee — 21 days, initial meeting held
>   → Send value-add resource

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (factual, actionable) |
| Approval | None (auto-delivers) |
| Client threshold | 30 days |
| Prospect threshold | 14 days |
