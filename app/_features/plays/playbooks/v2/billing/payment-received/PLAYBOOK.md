---
name: Payment Received
slug: payment-received
version: 1.0.0
description: Drafts thank-you messages when payments arrive
---

# Payment Received

Salt drafts professional thank-you messages when payments arrive, helping you acknowledge clients promptly and maintain good relationships.

## How it Works

1. **Detects payment** - Monitors your billing connector for incoming payments
2. **Matches to invoice** - Links the payment to the corresponding invoice
3. **Drafts thank-you** - Creates a brief, professional acknowledgment
4. **Queues for review** - You review and send when ready

## When it Runs

This playbook triggers when:
- A payment is received and matched to an invoice
- A billing connector is connected (Stripe, QuickBooks, etc.)

## What You'll See

Each play shows:
- **Client name** and payment details
- **Invoice number** and amount
- **Draft thank-you** ready to review and send

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Billing (professional, clear) |
| Approval | Per payment (you review each one) |
| Estimated value | $5 per relationship touchpoint |

## Requirements

- **Required**: Billing connector (Stripe, QuickBooks, FreshBooks, etc.)
- **Optional**: Email connector for sending
