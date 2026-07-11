---
slug: payment-reminder
kind: acting
name: Payment Reminder
player_slug: billing
description: Draft a gentle payment reminder when an invoice is past due.
when_to_use: |
  Compose overdue invoice reminder email.
  Draft gentle payment collection message.
trigger:
  type: signal
  signal: billing_due_date_passed
consent:
  approval_required: true
---

# Payment Reminder

## What this does

Drafts a professional, friendly payment reminder email when an invoice goes past due. The message references the specific invoice and outstanding amount while maintaining a positive relationship tone.

## When it runs

- Automatically when a billing record's due date passes and the amount paid doesn't cover the total
- On request when you ask Salt to remind a client about payment

## How it works

1. **Context pre-filled** — When this play is queued, the billing and client details are included in the run context.
2. **Draft the reminder** — Uses your Billing player's tone to write a friendly but clear reminder.
3. **Surface for approval** — The draft appears in your queue. You control when and if it sends.

## What you approve

The full email draft before it sends. Salt never sends payment reminders automatically — you always review the tone, timing, and recipient first.

```json
{
  "version": 1,
  "steps": [
    {
      "kind": "guard",
      "path": "run.context_inputs.amount_due",
      "op": "gt",
      "value": 0
    },
    {
      "kind": "llm",
      "purpose": "draft_external_output",
      "modelSlot": "copyClientFacing",
      "instructions": "Draft a friendly payment reminder email. Be polite but clear about the outstanding amount. Reference the invoice number/date if available. Offer to discuss if there are any questions. Keep it under 150 words. Do not be threatening or aggressive. Match the user's billing tone preferences from player context.",
      "inputs": [
        "run.context_inputs.invoice_number",
        "run.context_inputs.amount_due",
        "run.context_inputs.due_date",
        "run.context_inputs.client_name",
        "run.title"
      ],
      "maxTokens": 300,
      "bind": "draftBody"
    },
    {
      "kind": "render",
      "template": "To: {{run.context_inputs.client_email}}\nSubject: Friendly reminder: Invoice {{run.context_inputs.invoice_number}}\n\n{{draftBody}}",
      "bind": "emailDraft"
    }
  ],
  "value": {
    "kind": "invoice_collected",
    "amount": 0,
    "currency": "USD"
  }
}
```
