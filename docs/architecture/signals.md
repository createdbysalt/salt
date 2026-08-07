# Signals Reference

> **Signals are observable events from connected accounts and Salt's internal systems.**

Signals are the "eyes and ears" of Salt's proactive AI. They're declarative facts about what happened — not instructions about what to do.

---

## Signal Properties

Every signal has:

| Property | Description | Example |
|----------|-------------|---------|
| `key` | Unique identifier | `billing_payment_matched` |
| `entityType` | What entity this relates to | `person`, `organization`, `work`, `billing` |
| `entityId` | The specific entity | `abc123-def456-...` |
| `source` | Where we learned this | `stripe_webhook`, `gmail_sync`, `calendar_event` |
| `evidence` | Supporting data | `{ amount: 2500, customer_id: "cus_xxx" }` |
| `timestamp` | When it happened | `2026-07-12T14:30:00Z` |

---

## Signal Categories

### Entity Lifecycle Signals

Fired when entities are created or updated.

| Signal | Entity | Fires When |
|--------|--------|------------|
| `person_created` | person | New person record created |
| `person_updated` | person | Person record modified |
| `org_created` | organization | New organization created |
| `org_updated` | organization | Organization modified |
| `work_created` | work | New work record created |
| `work_updated` | work | Work record modified |
| `billing_created` | billing | New billing record created |
| `billing_updated` | billing | Billing record modified |
| `meeting_created` | meeting | New meeting created |
| `meeting_updated` | meeting | Meeting modified |

### Activity Signals

Fired when activity occurs with an entity.

| Signal | Entity | Fires When |
|--------|--------|------------|
| `has_payment_received` | person/org | Payment received from this entity |
| `has_stripe_payment` | person/org | Stripe payment specifically |
| `has_invoice_sent` | person/org | Invoice sent to this entity |
| `is_bidirectional_thread` | person | Two-way email conversation exists |
| `you_initiated` | person | User sent first email |
| `has_calendar_meeting` | person | Meeting scheduled with person |
| `has_signature` | person | Document signed by person |
| `email_count` | person | Number of emails exchanged |

### Classification Signals

Signals that help classify entities.

| Signal | Entity | Meaning |
|--------|--------|---------|
| `email_domain_is_personal` | person | Gmail, Yahoo, Hotmail, etc. |
| `email_domain_matches_workspace` | person | Same domain as user |
| `email_domain_in_partner_list` | person | Domain in partner list |
| `email_domain_in_vendor_list` | person | Domain in vendor list |
| `org_domain_known` | organization | Has a known domain |
| `org_created_from_domain` | organization | Created from email domain extraction |
| `inferred_industry` | organization | Industry detected from domain/context |

### Billing Signals

| Signal | Entity | Fires When |
|--------|--------|------------|
| `billing_payment_matched` | billing | Payment matched to invoice |
| `billing_amount_paid_covers_total` | billing | Fully paid |
| `billing_due_date_passed` | billing | Invoice is overdue |
| `billing_party_email_match` | billing | Party matched by email |
| `billing_party_customer_id_match` | billing | Party matched by Stripe customer ID |

### Meeting Signals

| Signal | Entity | Fires When |
|--------|--------|------------|
| `meeting_synced_from_calendar` | meeting | Imported from calendar |
| `meeting_end_passed` | meeting | Meeting time has ended |
| `meeting_has_attendance_evidence` | meeting | Transcript or recording exists |
| `meeting_cancelled_by_calendar` | meeting | Cancelled in source calendar |
| `meeting_attendee_email_match` | meeting | Attendee matched to person |
| `inferred_meeting_type` | meeting | Type inferred (discovery, kickoff, etc.) |

### Hygiene Signals

Signals that indicate data quality issues.

| Signal | Entity | Meaning |
|--------|--------|---------|
| `person_missing_email` | person | No email address |
| `person_missing_relationship_type` | person | Not classified |
| `person_missing_org` | person | No organization linked |
| `person_no_activity_30d` | person | No activity in 30 days |
| `person_no_activity_60d` | person | No activity in 60 days |
| `person_orphan` | person | No connections or activity |
| `org_missing_domain` | organization | No website/domain |
| `org_missing_industry` | organization | Industry not set |
| `org_missing_key_contact` | organization | No primary contact |
| `work_missing_client` | work | No client assigned |
| `work_missing_deadline` | work | No deadline set |
| `work_stale_active` | work | Active but no recent activity |

### Duplicate Detection Signals

| Signal | Entity | Meaning |
|--------|--------|---------|
| `person_duplicate_email` | person | Same email as another person |
| `person_duplicate_phone` | person | Same phone as another person |
| `person_name_fuzzy_match` | person | Similar name to another person |
| `person_same_name_same_org` | person | Same name in same org |
| `org_duplicate_domain` | organization | Same domain as another org |
| `org_name_fuzzy_match` | organization | Similar name to another org |
| `work_duplicate_name_same_org` | work | Same name in same org |
| `billing_duplicate_number` | billing | Same invoice number |

### Capture Signals

Signals fired when capture extracts learnings.

| Signal | Meaning |
|--------|---------|
| `entity_learning_extracted` | Learning extracted from content |
| `capture_email_received` | Email received and processed |
| `capture_email_sent` | Email sent and processed |
| `capture_meeting_completed` | Meeting ended and processed |
| `capture_processed` | Generic capture processed |
| `note_created` | Note created for entity |
| `note_flagged` | Note flagged for attention |
| `preference_detected` | User preference detected |
| `context_extracted` | Context extracted from content |
| `connection_inferred` | Relationship inferred |
| `relationship_at_risk` | Relationship health concern |

---

## Signal → Playbook Mapping

Signals trigger playbooks via the `trigger` field in `definition.yaml`:

```yaml
# playbooks/v2/billing/payment-received/definition.yaml
triggers:
  - type: signal
    signals: [billing_payment_matched, stripe_payment_succeeded]
```

The signal dispatch system (`trigger-dispatch.ts`) maintains an index:

```typescript
// Build index of signal → playbooks
const index = buildSignalTriggerIndex();
// Returns: Map<signalKey, PlaybookBlueprintRow[]>

// Find act-layer playbooks for a signal
const playbooks = findPlaybooksForSignal("billing_payment_matched");
// Returns: [cash-celebration, ...] — Memory Care handles learn-layer separately
```

---

## Emitting Signals

Signals are emitted by:

1. **Capture adapters** — Process webhooks from connected accounts
2. **Internal systems** — Entity CRUD operations
3. **Scheduled jobs** — Hygiene scans, pattern detection

```typescript
// Example: Capture adapter emitting signal
await processEntitySignals({
  workspaceId,
  entitySurface: "billing",
  entityId: billingRecord.id,
  entityLabel: `Invoice #${billingRecord.number}`,
  signals: {
    billing_payment_matched: true,
    billing_amount_paid_covers_total: amountPaid >= total,
  },
  evidence: {
    payment_amount: amountPaid,
    payment_source: "stripe",
    payment_id: stripePaymentId,
  },
});
```

---

## Signal Registry (Code Location)

**Primary source of truth:** `app/_lib/learning/signals.ts`

This file builds `SIGNAL_REGISTRY` from signal key arrays in `records-engine/types.ts` and adds descriptions, `firesWhen`, and `canTriggerActing` metadata.

**Signal key definitions:** `app/_features/plays/playbooks/records-engine/types.ts`

Signal categories:
- `PERSON_PROFILE_SIGNAL_KEYS` — Person signals (~17 signals)
- `ORG_PROFILE_SIGNAL_KEYS` — Organization signals (~18 signals)
- `WORK_PROFILE_SIGNAL_KEYS` — Work signals (~15 signals)
- `BILLING_PROFILE_SIGNAL_KEYS` — Billing signals (~15 signals)
- `MEETING_PROFILE_SIGNAL_KEYS` — Meeting signals (~12 signals)
- `FILE_PROFILE_SIGNAL_KEYS` — File signals (~15 signals)
- `NOTE_PROFILE_SIGNAL_KEYS` — Note extraction patterns (~16 signals)
- `OPERATOR_FACT_SIGNAL_KEYS` — Operator/Me patterns (~23 signals)
- `CAPTURE_SIGNAL_KEYS` — Capture processing signals (~15 signals)

**Total: ~145 signals** across all surfaces.

---

## Signal Validation

Use these functions to work with signals:

```typescript
import {
  isValidSignalKey,
  getSignalDefinition,
  getActingTriggerSignals,
  getSignalsForSurface,
  ALL_SIGNAL_KEYS,
} from "@/app/_lib/learning";

// Validate a signal key (anti-hallucination)
if (!isValidSignalKey(signalKey)) {
  throw new Error(`Unknown signal: ${signalKey}`);
}

// Get full definition
const def = getSignalDefinition("billing_payment_matched");
// { key, surface, description, firesWhen, canTriggerActing }

// Get signals that can trigger acting playbooks
const actionTriggers = getActingTriggerSignals();

// Get signals for a surface
const personSignals = getSignalsForSurface("person");
```

---

## canTriggerActing

Not all signals can trigger ACT-layer playbooks. The `canTriggerActing` flag indicates:

| `canTriggerActing` | Meaning | Example |
|-------------------|---------|---------|
| `true` | Can trigger ACT playbooks | `billing_payment_matched` → celebration |
| `false` | LEARN-only, used for field inference | `email_domain_is_personal` → classify |

Signals like `person_updated` are `false` because they're internal state changes, not external events worth acting on.

---

## Adding New Signals

1. Add to the appropriate signal key array in `records-engine/types.ts`
2. Add description to the matching `_SIGNAL_DESCRIPTIONS` object in `learning/signals.ts`
3. Update the corresponding facts interface (e.g., `PersonProfileFacts`)
4. Emit the signal from the relevant adapter or system
5. Create/update playbooks that should respond to it
6. Run `pnpm playbooks:compile` to validate

**Example:**

```typescript
// 1. Add to records-engine/types.ts
export const PERSON_PROFILE_SIGNAL_KEYS = [
  // ... existing
  "person_approaching_anniversary",  // new
] as const;

// 2. Add to learning/signals.ts
const PERSON_SIGNAL_DESCRIPTIONS = {
  // ... existing
  person_approaching_anniversary: {
    description: "Person's client anniversary is within 30 days",
    firesWhen: "Daily scan of relationship start dates",
    canTriggerActing: true,
  },
};

// 3. Update PersonProfileFacts if needed
// 4. Emit from daily scan job
// 5. Create playbook that triggers on this signal
```

---

## See Also

- [Primitives Overview](primitives.md) — How signals fit in the architecture
- [Tools Reference](tools.md) — What playbooks do with signals
- [Playbooks Reference](playbooks.md) — How playbooks respond to signals
- [Learning Module](../../app/_lib/learning/CLAUDE.md) — Evidence accumulation and signal infrastructure
