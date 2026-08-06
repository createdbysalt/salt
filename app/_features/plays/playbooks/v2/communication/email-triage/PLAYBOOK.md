# Email Triage Playbook

## Purpose

Classifies incoming emails along multiple dimensions (type, category, priority, urgency) and emits signals that other playbooks can respond to. This is a **LEARN layer** playbook that observes and classifies without taking action.

## Trigger

Fires on `capture_email_received` — every inbound email that passes pre-ingest gates.

## Classification Dimensions

| Dimension | Values | Purpose |
|-----------|--------|---------|
| **Type** | personal, transactional, promotional, automated | Message source classification |
| **Category** | action_required, money_moves, opportunities, updates, subscribed, noise | Business relevance |
| **Priority** | 0-100 score → urgent/important/normal/low/noise tiers | Attention ordering |
| **Urgency** | none, low, medium, high, critical | Time-sensitivity |
| **Triage Action** | surface_now, batch_digest, silent_archive | Display recommendation |

## Signals Emitted

Content signals:
- `email_urgency_high` — urgency markers detected (ASAP, urgent)
- `email_deadline_mentioned` — deadline/date references
- `email_money_amount_detected` — dollar amounts or currency
- `email_invoice_attached` — invoice/receipt attachment
- `email_payment_link_detected` — payment URL
- `email_question_asked` — direct questions
- `email_action_requested` — action request language

Sender signals:
- `sender_first_contact` — first email from this sender
- `sender_vip` — VIP-listed sender
- `sender_high_engagement` — high response rate sender

Category signals:
- `email_classified_action_required`
- `email_classified_money_moves`
- `email_classified_opportunities`
- `email_classified_updates`
- `email_classified_subscribed`
- `email_classified_noise`

## Implementation

Uses the Email Classification Engine:

```typescript
import { classifyEmail } from "@/app/_features/capture/services/email-classification";

const classification = classifyEmail(emailInput, context);
// Emit signals based on classification.signals[]
```

## Downstream Playbooks

| Signal | Downstream Playbook | Action |
|--------|---------------------|--------|
| `email_classified_money_moves` | auto-label-inbox | Apply 💰 label |
| `email_classified_noise` | auto-archive-noise | Archive (with approval) |
| `sender_first_contact` | screener | Queue for screen-in/out |
| `email_urgency_high` | notify-urgent | Push notification |

## Evidence Chain

Classification results are stored as evidence on the capture event:

```typescript
await accumulateEvidence({
  entityType: "capture",
  entityId: captureId,
  fieldPath: "email_category",
  proposedValue: classification.category,
  confidence: classification.categoryConfidence,
  evidenceType: "email_classification",
  sourceType: "email_triage_playbook",
});
```

## Related

- [Email Intelligence Layer Plan](../../../../../docs/plans/2026-07-13-email-intelligence-layer.md)
- [Classification Engine](../../../../../app/_features/capture/services/email-classification/)
