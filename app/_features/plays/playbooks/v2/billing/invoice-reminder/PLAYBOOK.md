---
name: Invoice Reminder
slug: invoice-reminder
version: 1.1.0
description: Drafts a verified, tone-matched payment reminder when an invoice goes overdue — one email per client, never a double-message
---

# Invoice Reminder

Salt drafts a payment reminder when an invoice goes overdue — but only after verifying the invoice still needs one. The tone matches the client's payment history, one email covers everything that client owes, and you approve every draft before anything is created in Gmail.

## How it Works

1. **Loads the full picture from Memory** — the overdue invoice, the client, their payment history (on-time vs. late), and every other open invoice that client has. No connector calls needed for this step.

2. **Verifies before drafting** — a bounded, read-only check against your connected apps:
   - Still unpaid? Confirms the invoice is open in Stripe and notes the amount remaining (partial payments count).
   - Stripe auto-collecting? Invoices set to `charge_automatically` are skipped — Stripe handles those, and a reminder would double-message your client.
   - Already reminded? Searches your sent mail for the invoice number — if a reminder went out in the last 7 days, Salt stands down.
   - If Stripe or Gmail aren't connected, Salt says what it couldn't verify and lets you decide at review time.

   If any check says the reminder shouldn't exist, the run ends quietly — no draft, no queue card.

3. **Picks the tone** — an escalation tier from days overdue and payment history:
   - 21+ days overdue → **final** (courteous last notice with a concrete deadline)
   - 7+ days, or 2+ late payments → **firm** (direct, asks for a payment date)
   - 3+ on-time payments → **gentle** (friendly nudge that acknowledges their track record)
   - Otherwise → **professional** (clear facts, easy to act on)

4. **Drafts one email per client** — every open invoice for that client listed in a single message: number, amount remaining, days overdue, and the total outstanding. If Stripe (or another billing app) has a hosted pay page, that link is in the letter. Salt never invents one.

5. **Creates a Gmail draft on your approval** — the reminder lands in Plays for you to review and edit. Approving creates a real draft in your Gmail. Nothing sends automatically — you always hit send yourself.

## When it Runs

- When an invoice's due date passes without full payment (checked on Salt's regular billing scan)
- While an invoice stays overdue, Salt re-checks roughly every 3 days — so the tone escalates naturally from gentle to firm to final
- Requires a connected billing app (Stripe, QuickBooks, etc.); a connected email app makes verification stronger and enables draft creation

## What You'll See

Each play shows:
- **Client name** and the invoices covered
- **Tone tier** (gentle / professional / firm / final) and why
- **What Salt verified** — still unpaid, not auto-collected, no recent reminder
- **The draft email** — edit it, then approve to create it in Gmail

## Configuration

| Setting | Value |
|---------|-------|
| Voice | Billing (professional, clear) |
| Approval | Every draft waits for you, until it's earned your trust |
| Estimated value | $50 per invoice collected |

## Requirements

- **Required**: Billing connector (Stripe, QuickBooks, etc.)
- **Optional**: Email connector (Gmail) — used to check for prior reminders and to create the draft on approval
