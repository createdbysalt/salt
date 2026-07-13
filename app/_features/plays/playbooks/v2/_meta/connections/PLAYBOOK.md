---
name: Connections
slug: connections
version: 2.0.0
description: Infer entity relationships and maintain connection health
---

# Connections

Salt builds and maintains your relationship graph by inferring connections between entities — people, organizations, work, meetings, files, and billing records.

## How it Works

### 1. Inference (Signal-Driven)

When activity happens in your connected accounts, Salt infers relationships:

| Signal | What Salt Learns |
|--------|------------------|
| Email received/sent | Person↔Org (domain match), Person↔Person (CC patterns) |
| Meeting completed | Attendee relationships, Org associations |
| Payment matched | Billing↔Work, Person↔Org (billing contact) |
| File shared | File↔Work (deliverable), File↔Person |

**Confidence scoring:**
- Direct evidence (payment, calendar) → 90-95%
- Strong inference (email domain) → 75-85%
- Weak inference (CC patterns) → 60-70%

Each confirming signal boosts confidence by +15% (capped at 100%).

### 2. Health Monitoring (Weekly)

Every Monday at 6am, Salt scans for relationship health issues:

| Days Since Contact | Status | Action |
|-------------------|--------|--------|
| 14+ days (prospects) | At risk | Surfaces for follow-up |
| 30+ days (clients) | Stale warning | Queues relationship check |
| 60+ days | Critical | High-priority alert |

Stale connections have their confidence decayed over time.

## Relationship Types

| Entity Pair | Relationships |
|-------------|---------------|
| Person↔Org | works_at, billing_contact, primary_contact |
| Person↔Person | collaborator, referred_by, reports_to |
| Person↔Work | assigned_to, primary_contact |
| Org↔Work | client_of, vendor_for |
| Work↔Billing | invoiced_via |
| File↔Work | deliverable_for |
| Person↔Meeting | attendee, organizer |

## When it Runs

- **Continuously**: On email, meeting, payment, and file signals
- **Weekly**: Monday 6am health check and confidence decay

## What You'll See

Connections are reflected throughout Salt:
- Entity detail pages show linked relationships
- Work pages show associated people, orgs, and files
- HQ surfaces at-risk relationships needing attention

## Configuration

| Setting | Value |
|---------|-------|
| Auto-apply threshold | 85% (connections ≥85% are applied automatically) |
| Approval mode | Batch (review multiple connections at once) |
| Health check | Weekly (Mondays at 6am) |
| Stale decay | Connections lose confidence after 60 days of inactivity |

## Requirements

- **Optional**: Email connector (for email-based inference)
- **Optional**: Calendar connector (for meeting-based inference)
- **Optional**: Billing connector (for payment-based inference)
- **Optional**: Documents connector (for file-based inference)

Works with whatever connectors you have — more connectors = richer graph.
