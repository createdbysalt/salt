---
name: Cash Runway Alert
slug: cash-runway
version: 1.0.0
description: Weekly cash flow summary with runway projection
---

# Cash Runway Alert

Salt delivers a weekly cash flow briefing every Monday morning, giving you visibility into your financial runway and upcoming receivables.

## How it Works

1. **Gathers data** - Pulls current balance, upcoming invoices, and recent payments
2. **Calculates runway** - Estimates weeks of coverage based on expenses
3. **Surfaces concerns** - Flags overdue invoices or cash flow risks
4. **Delivers briefing** - Shows up in HQ Monday morning

## When it Runs

- **Schedule**: Every Monday at 9am
- **No approval needed**: Briefing is informational only

## What You'll See

The briefing includes:
- **Runway estimate** - Weeks of cash coverage
- **Upcoming receivables** - Invoices due in next 30 days
- **Recent payments** - What came in last week
- **Concerns** - Any overdue invoices or patterns to watch

## Example Briefing

> **Cash Runway: 8 weeks**
>
> Current balance: $24,500
> Upcoming (30 days): $12,000 across 3 invoices
> Received last week: $4,200
>
> **Watch:** Invoice #1234 ($3,500) is 7 days overdue.

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (factual, scannable) |
| Approval | None (auto-delivers) |
| Schedule | Mondays at 9am |

## Requirements

- **Optional**: Billing connector (Stripe, QuickBooks, etc.)

Works with whatever billing data is available. More connectors = more accurate runway.
