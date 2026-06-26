---
slug: overdue-invoice-reminder
name: Overdue Invoice Reminder
player_slug: billing
description: Prepare a polite payment reminder when an invoice is overdue.
when_to_use: |
  Use when Stripe shows an overdue invoice tied to a client relationship.
  Proactively suggest when Billing Player flags revenue at risk.
trigger:
  type: pattern
  signal: overdue_invoice
  min_days_overdue: 7
consent:
  approval_required: true
value:
  kind: invoice_collected
  fromGap: true
---

# Overdue Invoice Reminder

## What this does

Pulls the overdue invoice from Stripe, checks that it is past due, and drafts a professional reminder email in Gmail.

## When it runs

- An invoice is 7+ days overdue
- Billing Player or an opportunity gap flags collectible revenue

## Steps

1. **Read invoice** — Salt loads the overdue invoice amount and due date from Stripe.
2. **Confirm overdue** — Skips if the invoice is not actually past due (avoids embarrassing misfires).
3. **Render reminder** — Uses a consistent, firm-but-friendly template with the correct amount.
4. **Draft in Gmail** — Creates a draft for your review before anything client-facing sends.

## What you approve

Sending the payment reminder to the client.

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "fetch",
      "tool": "STRIPE_LIST_INVOICES",
      "params": { "status": "open" },
      "bind": "invoice"
    },
    {
      "kind": "guard",
      "path": "invoice.days_overdue",
      "op": "gte",
      "value": 7
    },
    {
      "kind": "render",
      "template": "Hi {{run.recipient_label}},\n\nJust a friendly reminder that invoice {{invoice.number}} for {{invoice.amount_label}} was due {{invoice.due_label}}. Let me know if you have any questions.\n\nThank you!",
      "bind": "body"
    },
    {
      "kind": "act",
      "tool": "GMAIL_CREATE_EMAIL_DRAFT",
      "params": {
        "body": "{{body}}",
        "subject": "Reminder: Invoice {{invoice.number}}"
      }
    }
  ],
  "value": {
    "kind": "invoice_collected",
    "fromGap": true
  }
}
```
