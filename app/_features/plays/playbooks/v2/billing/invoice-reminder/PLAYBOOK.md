---
name: Invoice Reminder
slug: invoice-reminder
version: 1.0.0
description: Drafts payment reminders for overdue invoices
---

# Invoice Reminder

Salt drafts payment reminder emails when your invoices go overdue. The tone adapts based on each client's payment history - gentle for reliable payers, firmer for those with a pattern of late payments.

## How it Works

1. **Detects overdue invoices** - Monitors your connected billing app (Stripe, QuickBooks, etc.) for invoices past their due date

2. **Checks payment history** - Looks at the client's track record:
   - 3+ on-time payments → gentle, friendly tone
   - 2+ late payments → professional, firmer tone
   - Otherwise → neutral, professional tone

3. **Drafts the reminder** - Creates a payment reminder email using your billing voice, including:
   - Invoice number and amount due
   - Days overdue
   - Easy payment options

4. **Queues for your review** - Each reminder appears in Plays for you to review, edit, and approve before sending

## When it Runs

This playbook triggers when:
- An invoice due date passes without full payment
- A billing connector is connected (Stripe, QuickBooks, etc.)

## What You'll See

Each play shows:
- **Client name** and invoice details
- **Suggested tone** based on payment history  
- **Draft email** ready to review and send

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Billing (professional, clear) |
| Approval | Per invoice (you review each one) |
| Estimated value | $50 per invoice collected |

## Requirements

- **Required**: Billing connector (Stripe, QuickBooks, FreshBooks, etc.)
- **Optional**: Email connector for sending (otherwise copies to clipboard)
