---
slug: keeper-billing-records
kind: profile
name: Billing Records
player_slug: keeper
description: Maintain durable billing records from payment evidence, document extraction, counterparty context, and connected finance tools.
when_to_use: |
  Runs when Capture resolves billing evidence from payments, invoices, bills, receipts, or connected finance tools.
  Re-runs when new payment, counterparty, work, or document context can improve an existing record.
trigger:
  type: capture
  signal: billing_evidence
---

# Billing Records

## What this does

Keeper owns the durable billing record policy: which invoices, bills, and payments deserve a record, what belongs on that record, which payment edges should exist, and what Salt must never touch on a money record. It covers the full billing record surface:

1. **Document identity** - the invoice or bill number, exactly as printed, with no normalization. Number is the primary dedupe key.
2. **Status** - the `billing_status` lifecycle: draft, due, overdue, paid, partial, refunded, disputed.
3. **Amounts** - total amount and amount paid, both integer cents in the record's currency.
4. **Currency and dates** - the record currency plus issued, due, and paid dates.
5. **Direction and category** - receivable vs payable (fixed at creation), and the spend category for payables (contractor, software, other).
6. **Party links and line items** - person, organization, and work references (structured payment edges), the free-text vendor label, line items, and tags.

Activity history is append-only. Salt can read payment history and audit trails as evidence and can append a clearly attributed activity entry for work Salt actually performed, but it never rewrites, deletes, or backfills what happened.

## Billing detail page coverage

The Billing Records playbook is the policy owner for the record data that powers the Billing detail page. It must keep the page coherent even before any surface is executable.

| Detail page surface | What must be maintained | Ownership policy |
|---------------------|-------------------------|------------------|
| Hero | Number, status, direction, amount, amount paid, outstanding balance, due date, counterparty | Write or derive from trusted payment, document, and counterparty evidence. Quick actions like Mark received and Send reminder are UI actions, not field claims. |
| Overview | Amounts, currency, issued/due/paid dates, category, vendor, payment terms context | Amounts from document extraction below confidence 90 wait for review. Payment-matched amounts and dates apply automatically. |
| Line items | Extracted line items with descriptions and amounts | Propose from document extraction; wait for review when totals disagree with the extracted amount. |
| Connections | Person, organization, and work links (structured payment edges) | Auto-link above threshold on exact identifiers (email, customer id). Name-similarity-only matches wait for review. |
| Notes | User-authored notes and Salt-authored notes | User notes are protected. Salt may append clearly authored Salt notes with provenance; it cannot silently edit or delete user notes. |
| Activity | Timeline of payments, reminders, and status changes | Append-only. Salt may append "Salt marked this paid from payment evidence" style entries for actions it performed. It never rewrites historical events. |

## When it runs

- **Billing evidence resolved** - Capture identifies an invoice, bill, receipt, or payment from email, files, or a connected finance tool.
- **Payment arrives** - payment matching finds money movement that covers or partially covers an existing record.
- **New counterparty context arrives** - a person, organization, or work item can now be linked to an existing record.
- **Manual review starts** - a user opens the billing record and asks Salt to re-check the fields.

## How it works

1. **Admit or skip** - Salt first asks whether the evidence is a real money document for this business. Marketing "invoices," phishing payment requests, and duplicates of an existing number do not qualify.
2. **Dedupe by number** - The document number, exactly as printed, is the primary dedupe key. A matching number updates the existing record instead of creating a duplicate.
3. **Fix direction at creation** - Receivable vs payable is decided once from who owes whom. Direction is never rewritten afterward, by Salt or by rules.
4. **Extract the document facts** - number, amounts, currency, issued and due dates, line items, and the counterparty as printed. Extraction confidence is recorded per field.
5. **Match payments** - Payment matching maintains status, amount paid, and paid date. A payment that covers the full amount with a `paid_at` timestamp is hard evidence.
6. **Derive overdue** - Overdue is computed from the due date and the absence of full payment. It is a system-derived transition, not a judgment call.
7. **Resolve the counterparty** - Exact identifier evidence (billing email match, connected-tool customer id) can auto-link a person, organization, or work item above threshold. Name similarity alone waits for review.
8. **Set confidence and status** - If `confidence >= autoApplyThreshold`, Salt applies the value. Below threshold, it holds the change for review. Amount extraction below confidence 90 always waits.
9. **Record provenance** - Salt records the field, value, source, confidence, explanation, status, and evidence so the user can understand or correct the result.

## What you approve

Status transitions backed by hard payment evidence auto-apply: `paid_at` plus an amount that covers the total moves the record to paid; a partial payment moves it to partial and updates amount paid. Overdue derives from the due date automatically.

Some surfaces always wait even when evidence is strong: refunds and disputes are never auto-created — a refunded or disputed status is always an ask-first proposal; category assignment for payables; extracted amounts below confidence 90; counterparty links based on name similarity; and any change to the document number.

Invoices Salt drafts are draft-only. `auto_advance` is pinned false — Salt never sends a money-touching artifact without approval.

## Workspace context

Billing Records depends on bounded context, not broad search.

**What it uses**

- **Connected finance evidence** - payments, invoices, customers, and charges from connected finance and billing sources, used generically without assuming a specific app.
- **Document extraction** - amounts, dates, numbers, line items, and counterparty text from the source document.
- **People, Org, and Work memory** - only records tied to the counterparty email, customer id, or linked work item.
- **Me memory** - default currency and payment terms as workspace context, never as a reason to rewrite an existing record's currency.

**What it ignores**

- Unrelated people, orgs, work, files, meetings, and conversations.
- Broad workspace memory that is not anchored to this record's counterparty, number, or linked work.

**Time policy**

- The trigger is evidence-based, not scheduled.
- Overdue derivation uses the record's own due date against the current date — the one exact time rule this playbook owns.
- Treat stale or conflicting payment evidence as a review case, not an auto-apply case.

## Record lifecycle

**Qualifies as a billing record when**

- A real invoice, bill, or receipt exists with a number, amount, and counterparty.
- A connected finance tool reports an invoice, charge, or payment tied to this workspace.
- The user explicitly creates or asks Salt to track a receivable or payable.

**Does not qualify when**

- The document is a marketing "invoice," a quote with no commitment, a phishing payment request, or a scanned artifact with no extractable amount.
- The number already exists — that is an update, not a new record.
- The evidence is a payment with no identifiable document or counterparty; hold it for review instead of inventing a record.

**Record surface ownership**

| Surface | Trusted sources | Ownership | Auto-apply | Ask first | Never touch |
|---------|-----------------|-----------|------------|-----------|-------------|
| Number | The document itself, exactly as printed | Write policy | None — primary dedupe key | Fill a missing number from clear document evidence | Normalize, reformat, or overwrite an existing number |
| Status | Payment matching, due-date derivation | Write policy | Paid/partial from hard payment evidence; overdue derived from due date | Refunded or disputed — never auto-created | Rewriting status against payment evidence |
| Direction | Fixed at record creation | User/system only | None | None | Any change after creation |
| Category | Document context, vendor history, user correction | Write policy | None by default | Contractor/software/other assignment for payables | Guessing category from the vendor name alone |
| Amount | Document extraction, connected finance tool | Write policy | Extraction at confidence 90 or above | Extraction below 90, conflicts with line-item totals | Rounding, currency conversion, silent corrections |
| Amount Paid + Paid date | Payment matching | Write policy | Maintained by payment matching | Manual payment claims without evidence | Editing against matched payment history |
| Currency | Document extraction, connected finance tool | Write policy | None by default | Set or correct the currency (uppercase ISO 4217 registry canon, 10-value set: USD, EUR, GBP, CAD, AUD, CHF, JPY, SGD, NZD, INR — DB enforced since 20260703180000) | Converting amounts between currencies |
| Issued / Due dates | Document extraction, connected finance tool | Write policy | None by default | Fill or correct from document evidence | Backdating to change overdue derivation |
| Party links (person/org/work) | Billing email match, customer id, linked work evidence | Write policy | Exact identifier match above threshold | Name-similarity matches, reassigning an existing link | Invented links, same-name-only links |
| Vendor label | Document counterparty text | Write policy | None by default | Fill when no org/person record is linked | Overwriting once a structured link exists |
| Line items | Document extraction | Write policy | None by default | Propose extracted line items | Editing items to force totals to match |
| Tags | User correction, repeated directly linked evidence | Write policy | Low-risk tags from strong repeated evidence | Anything that affects reporting or category | One-off comments, unrelated memory |
| Provenance and explanations | Rule output, confidence, evidence, source | Read-only history | Append new provenance rows | Correct the current field via review | Rewrite provenance history |
| Activity and audit history | Payment events, reminders, status transitions | Append-only evidence | Append a clearly attributed Salt activity entry | Any sensitive or high-impact activity entry | Rewrite, delete, backfill, or mutate historical events |

**What it never touches**

Salt never moves money and never sends money-touching artifacts without approval. Direction is immutable after creation. Refunds and disputes are always proposals. Payment history, provenance, and activity are trust records: Salt may append clearly attributed entries for work it actually did, but it cannot rewrite what happened. User-authored notes are protected the same way.

**Negative examples**

- A "final invoice" email from an unknown domain with a payment link is a phishing candidate, not a billing record.
- A payment that covers 80% of the amount moves the record to partial — it does not round up to paid.
- A Stripe customer named "Acme Corp" and an org named "Acme Consulting" should not auto-link on the name alone; the customer id or billing email must match.
- A refund visible in the finance tool proposes a refunded status; it never applies silently.
- An invoice Salt drafts stays a draft. `auto_advance` is pinned false; nothing is sent without approval.

Executable today: the typed profile engine writes **status, organizationId, personId, and workId** — nothing else. The ownership policy above governs the durable billing record and the roadmap for the engine as it grows.

```json
{
  "version": 1,
  "fields": ["status", "organizationId", "personId", "workId"],
  "rules": [
    {
      "id": "billing-payment-paid",
      "field": "status",
      "when": { "signal": "billing_amount_paid_covers_total", "op": "eq", "value": true },
      "set": { "value": "paid" },
      "confidence": 95,
      "because": "Payment evidence shows the full amount has been received"
    },
    {
      "id": "billing-payment-partial",
      "field": "status",
      "when": { "signal": "billing_payment_matched", "op": "eq", "value": true },
      "set": { "value": "partial" },
      "confidence": 90,
      "because": "Payment evidence shows a partial payment has been received"
    },
    {
      "id": "billing-overdue",
      "field": "status",
      "when": { "signal": "billing_due_date_passed", "op": "eq", "value": true },
      "set": { "value": "overdue" },
      "confidence": 88,
      "because": "Due date has passed with no full payment"
    },
    {
      "id": "billing-org-email-match",
      "field": "organizationId",
      "when": { "signal": "billing_party_email_match", "op": "eq", "value": true },
      "set": { "value": "{{inferred_organization_id}}" },
      "confidence": 85,
      "because": "Billing email matches an existing organization"
    },
    {
      "id": "billing-org-customer-id",
      "field": "organizationId",
      "when": { "signal": "billing_party_customer_id_match", "op": "eq", "value": true },
      "set": { "value": "{{inferred_organization_id}}" },
      "confidence": 92,
      "because": "Connected finance tool customer id maps to an organization"
    },
    {
      "id": "billing-person-email-match",
      "field": "personId",
      "when": { "signal": "billing_party_email_match", "op": "eq", "value": true },
      "set": { "value": "{{inferred_person_id}}" },
      "confidence": 85,
      "because": "Billing email matches an existing person"
    },
    {
      "id": "billing-work-linked",
      "field": "workId",
      "when": { "signal": "inferred_work_id", "op": "exists" },
      "set": { "value": "{{inferred_work_id}}" },
      "confidence": 80,
      "because": "Invoice context links to a work item"
    }
  ]
}
```
