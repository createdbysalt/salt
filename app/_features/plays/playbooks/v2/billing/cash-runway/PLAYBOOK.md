---
name: Cash Forecast
slug: cash-runway
version: 2.0.0
description: Weekly cash forecast with runway projection, verified against your billing app, with early risk flags when payroll or bills are at risk
---

# Cash Forecast

Salt writes a weekly cash forecast before your week starts: runway in weeks, what is coming in, what changed, and — when the numbers say so — a plain flag when payroll or a bill is at risk. Every number is checked against your connected billing app before it is flagged.

## How it Works

1. **Pulls Salt's own rollups** — current cash position, receivables due in the lookahead window, and recent payments. These come from Salt's records, so the brief still ships if a billing app is temporarily disconnected.

2. **Verifies against your billing app** — a bounded, read-only check:
   - Live balance from Stripe or QuickBooks, reconciled against Salt's number (the billing app wins disagreements).
   - Open invoices confirmed still collectible — paid, void, or written-off invoices are dropped from the outlook.
   - Subscription renewals inside the window counted as reliable incoming cash.
   - Payroll or owner draw (on your chosen day of the month) checked for coverage.

   If the billing app cannot be reached, Salt says what it could not verify and marks those numbers as estimates — the brief still ships.

3. **Writes the brief** — runway first, then what is coming in (client, amount, date), then what changed. Risk verdicts lead with the risk: what is at risk, the date it hits, and the shortfall. Under 200 words, always scannable.

## When it Runs

- Weekly, Monday at 8:00 (schedule)
- Requires a connected billing app (Stripe, QuickBooks, etc.)

## What You'll See

Each brief shows:
- **Runway** in weeks at current burn
- **Risk flags** when runway drops below your threshold or payroll is not covered — with the date and amount
- **Confirmed receivables** with client and expected date
- **Estimate markers** on any number Salt could not verify against the billing app

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Brief (factual, direct) |
| Approval | Runs on its own — the brief surfaces in Plays, nothing leaves the app |
| Estimated value | $15 per week of cash visibility |

## Requirements

- **Required**: Billing connector (Stripe, QuickBooks, etc.)
- **Optional**: Email connector — strengthens verification context
