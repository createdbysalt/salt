---
name: Memory Records
slug: memory-records
version: 2.0.0
description: Keep Memory records complete and accurate by learning from connected accounts.
---

# Memory Records

Memory Care's records capability handles two responsibilities:

1. **Intake** — Record creation from Ask Salt requests and capture signals
2. **Upkeep** — Signal-driven field updates to keep records accurate

## Modules

| Module | Purpose | Entry Point |
|--------|---------|-------------|
| `intake/index.ts` | Parse requests, qualify captures, dependency ordering | Ask Salt + Capture processing |
| `capabilities/records.ts` | Evaluate fill rules on signals | Memory Care scheduler |

---

# Intake System

Intake handles two sources:

1. **Ask Salt** — User explicitly requests to add records ("Add Acme Studio and Liam")
2. **Captures** — Emails, meetings, files that imply new records should be created

The system:

1. **Qualifies** — Detects signals that suggest a new record (via `RECORD_QUALIFIERS`)
2. **Parses** — Extracts entity info from text or capture data
3. **Orders** — Creates entities by dependency tier
4. **Links** — Associates entities based on relationships
5. **Watches** — Registers watches for missing fields

## Entity Tiers (Creation Order)

| Tier | Entities | Rationale |
|------|----------|-----------|
| 1 | Organization | No dependencies |
| 2 | Person, File | Can link to Org |
| 3 | Work, Meeting | Can link to Org + Person |
| 4 | Billing | Can link to all above |

## Record Qualifiers (How Captures Source Records)

Each entity type has qualifiers defining how it can be detected from captures:

### Person

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| email | `email_from_unknown_address` | Received email from address not in Memory |
| email | `email_to_unknown_address` | Sent email to address not in Memory |
| email | `email_cc_unknown_address` | CC'd address not in Memory |
| meeting | `meeting_attendee_unknown` | Calendar attendee not in Memory |
| email | `email_signature_has_name` | Signature block contains name + contact info |
| invoice | `invoice_addressee_unknown` | Invoice to/from unknown person |

**Extract:** name, email, phone, title, organization · **Threshold:** 80%

### Organization

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| email | `email_domain_unknown` | Email from domain not linked to any org |
| email | `email_signature_has_company` | Signature contains company name |
| invoice | `invoice_from_unknown_company` | Invoice from unrecognized company |
| file | `contract_mentions_company` | Contract/proposal references company |
| email | `domain_appears_frequently` | Same domain appears 3+ times without org |

**Extract:** name, domain, website, billing_email, industry · **Threshold:** 75%

### Work

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| email | `email_subject_project_pattern` | Subject matches project patterns ("RE: Website Redesign") |
| meeting | `meeting_title_project_pattern` | Meeting title suggests project ("Kickoff: Brand Refresh") |
| file | `proposal_or_sow_attached` | Proposal/SOW file attached |
| invoice | `invoice_line_items_suggest_project` | Invoice references work not in Memory |
| email | `thread_discusses_scope` | Email thread mentions scope, deliverables, timeline |

**Extract:** name, organization, deadline, contract_value_cents, work_type · **Threshold:** 70%

### Billing

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| email | `invoice_attachment_detected` | PDF/image attachment that looks like invoice |
| email | `payment_notification_email` | Payment received/sent notification |
| invoice | `stripe_webhook_payment` | Stripe payment event |
| email | `email_mentions_amount_due` | Email body contains "$X due" or "payment of $X" |
| file | `receipt_attachment_detected` | Receipt PDF attached |

**Extract:** amount_cents, due_at, organization, linked_work, number · **Threshold:** 85%

### File

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| email | `email_has_attachment` | Email with non-signature attachment |
| drive | `drive_share_received` | Google Drive share notification |
| file | `signature_request_received` | DocuSign/HelloSign request |
| file | `contract_or_proposal_detected` | Attachment classified as contract/proposal |
| email | `asset_delivered` | Final deliverable attached (PSD, PDF, etc.) |

**Extract:** title, category, document_type, linked_person, linked_org · **Threshold:** 90%

### Meeting

| Source | Signal | When to Suggest |
|--------|--------|-----------------|
| calendar | `calendar_event_created` | New calendar event (auto from gcal sync) |
| email | `email_scheduling_discussion` | Email thread about scheduling a call |
| email | `zoom_invite_detected` | Zoom/Meet link in email |
| calendar | `calendar_invite_received` | Calendar invite from external party |

**Extract:** title, start_time, attendees, location, meeting_url · **Threshold:** 95%

## Usage

```typescript
import {
  parseIntakeRequest,
  getCreationOrder,
  getMissingFieldsToWatch,
} from "@/app/_features/plays/playbooks/v2/_meta/memory-records/scripts";

const parsed = parseIntakeRequest("Add Acme Studio and Liam as contact");
// parsed.entities = [{ type: "organization", name: "Acme Studio", tier: 1 }, ...]
// parsed.isMultiEntity = true

const order = getCreationOrder(parsed);
// Returns entities sorted by tier, then by type within tier

const missingFields = getMissingFieldsToWatch("person", ["name", "email"]);
// Returns ["phone", "organization"] — fields that should trigger watches
```

## Watch Trigger Fields

When these fields are missing after intake, register a watch:

| Entity | Watch When Missing |
|--------|-------------------|
| Person | email, phone, organization |
| Organization | domain, website, billing_email |
| Work | deadline, organization, contract_value_cents |
| Billing | due_at, linked_work, amount_cents |
| File | category, linked_person, linked_org, description |
| Meeting | attendees, location, linked_work |

## Evidence Accumulation

When captures arrive, the system accumulates evidence using **log-odds scoring** (Fellegi-Sunter model). Each signal adds or subtracts from a cumulative score until thresholds are reached.

### Why Log-Odds?

- Probabilities multiply → numerical underflow
- Log-odds ADD → simple, stable arithmetic
- `score = Σ(signal weights)`, not `score = Π(probabilities)`

### Signal Weights

Each signal has a pre-computed weight based on how informative it is:

| Signal | Weight | Meaning |
|--------|--------|---------|
| `calendar_event_created` | +5.0 | Very strong: explicit scheduled time |
| `invoice_attachment_detected` | +4.0 | Strong: billing relationship |
| `meeting_attendee_unknown` | +3.0 | Strong: participated in call |
| `email_from_unknown_address` | +2.5 | Moderate: direct communication |
| `domain_appears_frequently` | +0.5 | Weak: accumulates per occurrence |
| `looks_like_newsletter` | -3.0 | Negative: likely not a real contact |
| `domain_is_known_spam` | -5.0 | Strong negative: spam |

### Thresholds

| Entity | Suggest | Auto | Dismiss |
|--------|---------|------|---------|
| Person | 4.0 | 8.0 | -3.0 |
| Organization | 3.5 | 7.0 | -3.0 |
| Work | 5.0 | 10.0 | -2.0 |
| Billing | 6.0 | 12.0 | -2.0 |
| File | 3.0 | 6.0 | -2.0 |
| Meeting | 2.0 | 4.0 | -2.0 |

- **Suggest**: Show in HQ as "suggested record"
- **Auto**: Auto-create if workspace has auto-create enabled
- **Dismiss**: Stop watching (too much negative evidence)

### Usage

```typescript
import {
  accumulateEvidence,
  evaluateEvidence,
  logOddsToProbability,
  SIGNAL_WEIGHTS,
} from "@/app/_features/plays/playbooks/v2/_meta/memory-records/scripts";

// Start with score of 0
let score = 0;

// Email from unknown address arrives
score = accumulateEvidence(score, "email_from_unknown_address"); // +2.5

// Same person attends a meeting
score = accumulateEvidence(score, "meeting_attendee_unknown"); // +3.0 = 5.5 total

// Check what to do
const action = evaluateEvidence("person", score);
// action = "suggest" (5.5 > 4.0 suggest threshold)

// Convert to probability for UI display
const confidence = logOddsToProbability(score);
// confidence = 98% (very confident this is a real person)
```

### Flow

```
Capture → Detect Signals → Accumulate Evidence → Check Threshold → Action
                                                         │
                    ┌────────────────────────────────────┼────────────────┐
                    ▼                                    ▼                ▼
              score < dismiss                    suggest ≤ score    score ≥ auto
              → Stop watching                    < auto             → Auto-create
                                                 → Show in HQ
```

---

# Upkeep System

**Source of truth**: `app/_features/memory/taxonomy/field-registry.ts`

## Summary

- **132 fields** across 8 entity types
- **156 fill rules** with confidence scores
- **93 signals** that trigger updates

## How It Works

When a signal arrives (new person, payment received, meeting completed), you:

1. Load the current facts for the entity using `memoryGetFacts`
2. Check the field's `fillRules` array for matching signals
3. Call `memoryUpdateField` with the matched value and confidence
4. The tool handles threshold checking — you just provide the confidence

## Confidence Thresholds

```
You call: memoryUpdateField(person, abc123, "relationship_type", "client", 95, "Payment received")
    ↓
Tool checks: Is 95 >= workspace threshold (85)?
    ↓
Yes → Applied to Memory, returns { action: "applied" }
No  → Evidence accumulated, returns { action: "accumulated" }
```

## Entity Types (132 fields)

### People (15 fields, 24 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| name | text | 1 | keeper_ask |
| email | email | 1 | keeper_ask |
| billingEmail | email | 1 | keeper_ask |
| phone | phone | 1 | keeper_ask |
| timezone | timezone | 1 | keeper_ask |
| title | text | 1 | keeper_ask |
| relationshipType | select | 6 | keeper_ask |
| addressLine1 | text | 1 | keeper_ask |
| addressLine2 | text | 1 | keeper_ask |
| city | text | 1 | keeper_ask |
| state | text | 1 | keeper_ask |
| postalCode | text | 1 | keeper_ask |
| country | country | 2 | keeper_ask |
| recordStatus | select | 2 | keeper_auto |
| lastContactedAt | datetime | 3 | keeper_auto |

### Organizations (16 fields, 20 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| name | text | 1 | keeper_ask |
| billingEmail | email | 1 | keeper_ask |
| industryParent | select | 1 | keeper_ask |
| industryChild | select | 1 | keeper_ask |
| relationshipType | select | 4 | keeper_ask |
| primaryContact | reference | 1 | keeper_ask |
| addressLine1 | text | 1 | keeper_ask |
| addressLine2 | text | 1 | keeper_ask |
| city | text | 1 | keeper_ask |
| state | text | 1 | keeper_ask |
| postalCode | text | 1 | keeper_ask |
| country | country | 1 | keeper_ask |
| taxId | text | 1 | keeper_ask |
| website | url | 1 | keeper_ask |
| recordStatus | select | 2 | keeper_auto |
| lastContactedAt | datetime | 1 | keeper_auto |

### Work (25 fields, 32 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| name | text | 1 | keeper_ask |
| status | select | 6 | keeper_ask |
| workType | select | 1 | keeper_ask |
| stage | select | 1 | keeper_ask |
| serviceId | reference | 1 | keeper_ask |
| billingContactId | reference | 1 | keeper_ask |
| contractValueCents | money | 1 | keeper_ask |
| finalPriceCents | money | 1 | keeper_ask |
| scopeItems | json | 1 | keeper_ask |
| currency | select | 1 | keeper_ask |
| paymentTerms | select | 1 | keeper_ask |
| paymentType | select | 1 | keeper_ask |
| hourlyRateCents | money | 1 | keeper_ask |
| hoursEstimate | number | 1 | keeper_ask |
| retainerMrrCents | money | 1 | keeper_ask |
| renewalDate | date | 1 | keeper_ask |
| billingCycle | select | 1 | keeper_ask |
| decisionDate | date | 1 | keeper_ask |
| startDate | date | 2 | keeper_ask |
| deadline | date | 2 | keeper_ask |
| poNumber | text | 1 | keeper_ask |
| estimatedTimeline | text | 1 | keeper_ask |
| discountPercent | percent | 1 | keeper_ask |
| discountAmountCents | money | 1 | keeper_ask |
| discountReason | text | 1 | keeper_ask |

### Billing (15 fields, 23 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| number | text | 2 | keeper_ask |
| status | select | 3 | keeper_auto |
| direction | select | 0 | user_only |
| category | select | 1 | keeper_ask |
| organization | reference | 1 | keeper_ask |
| billingContact | reference | 1 | keeper_ask |
| linkedWork | reference | 1 | keeper_ask |
| vendorLabel | text | 1 | keeper_ask |
| amountCents | money | 2 | keeper_ask |
| amountPaidCents | money | 2 | keeper_auto |
| currency | select | 2 | keeper_ask |
| issuedAt | date | 2 | keeper_ask |
| dueAt | date | 2 | keeper_ask |
| paidAt | date | 2 | keeper_auto |
| appUrl | url | 1 | keeper_auto |

### Files (14 fields, 14 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| title | text | 0 | user_only |
| url | url | 0 | user_only |
| category | select | 1 | keeper_auto |
| documentType | select | 1 | keeper_auto |
| description | text | 1 | keeper_ask |
| lifecycleStatus | select | 4 | keeper_auto |
| totalAmountCents | money | 1 | keeper_auto |
| currency | select | 1 | keeper_ask |
| dueDate | date | 1 | keeper_auto |
| expiryDate | date | 2 | keeper_auto |
| signedDate | date | 1 | keeper_auto |
| followUpDate | date | 1 | keeper_ask |
| sharedWithClient | boolean | 0 | user_only |
| isOperatorAsset | boolean | 0 | user_only |

### Meetings (13 fields, 13 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| title | text | 0 | user_only |
| meetingType | select | 1 | keeper_ask |
| status | select | 4 | keeper_auto |
| startTime | datetime | 1 | keeper_auto |
| endTime | datetime | 1 | keeper_auto |
| locationType | select | 1 | keeper_auto |
| meetingUrl | url | 1 | keeper_auto |
| address | text | 1 | keeper_ask |
| phoneNumber | phone | 1 | keeper_ask |
| description | text | 1 | keeper_ask |
| notes | text | 0 | user_only |
| visibility | select | 0 | user_only |
| attendees | json | 1 | keeper_auto |

### Me Identity (15 fields, 16 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| preferredName | text | 1 | user_only |
| fullName | text | 1 | user_only |
| gender | select | 0 | user_only |
| roleTitle | text | 2 | user_only |
| phone | phone | 1 | user_only |
| timezone | timezone | 1 | user_only |
| workingHours | text | 0 | user_only |
| location | text | 2 | user_only |
| addressLine1 | text | 1 | user_only |
| addressLine2 | text | 1 | user_only |
| city | text | 1 | user_only |
| state | text | 1 | user_only |
| postalCode | text | 1 | user_only |
| country | country | 2 | user_only |
| professionalCredentials | text | 1 | user_only |

### Me Business (19 fields, 14 rules)

| Field | Type | Fill Rules | Write Policy |
|-------|------|------------|-------------|
| name | text | 0 | user_only |
| tagline | text | 1 | user_only |
| websiteUrl | url | 1 | user_only |
| industry | text | 2 | user_only |
| legalBusinessName | text | 1 | user_only |
| businessType | select | 1 | user_only |
| businessPhone | phone | 1 | user_only |
| businessEmail | email | 0 | user_only |
| location | text | 1 | user_only |
| taxIdType | text | 0 | user_only |
| taxIdLast4 | text | 0 | user_only |
| defaultCurrency | select | 0 | user_only |
| paymentTerms | select | 0 | user_only |
| legalAddressLine1 | text | 1 | user_only |
| legalAddressLine2 | text | 1 | user_only |
| legalCity | text | 1 | user_only |
| legalState | text | 1 | user_only |
| legalPostalCode | text | 1 | user_only |
| legalCountry | country | 1 | user_only |

## Signals (93)

Signals are extracted from connected accounts and trigger field updates.

| Signal | Entity Types | Sources |
|--------|--------------|---------|
| has_payment_received | person | billing |
| has_stripe_payment | person | billing |
| has_invoice_sent | person | billing |
| is_bidirectional_thread | person | email |
| you_initiated | person | email |
| has_calendar_meeting | person | calendar |
| has_signature | person | email |
| email_count | person | email |
| email_count_gte_5 | person | email |
| email_count_gte_10 | person | email |
| email_domain_is_personal | person | email |
| email_domain_matches_workspace | person | email |
| email_domain_in_partner_list | person | email |
| email_domain_in_vendor_list | person | email |
| person_name_extracted | person | email |
| person_email_extracted | person | email |
| person_phone_extracted | person | email |
| person_title_extracted | person | email |
| person_timezone_detected | person | email, calendar |
| person_address_extracted | person | email, documents |
| ... | ... | ... |

*73 more signals — see signal-registry.ts*

## Fill Rules Reference

Each field can have multiple fill rules. When a signal matches, the rule's value and confidence are used.

Example from `field-registry.ts`:

```typescript
{
  key: "relationshipType",
  entityType: "person",
  fillRules: [
    { signal: "has_payment_received", value: "client", confidence: 95, because: "They paid you" },
    { signal: "has_invoice_sent", value: "client", confidence: 90, because: "You invoiced them" },
    { signal: "email_domain_matches_workspace", value: "team", confidence: 92, because: "Same domain" },
  ],
}
```

## References

- `field-registry.ts` — Single source of truth for all fields and fill rules
- `signal-registry.ts` — All signals with descriptions and sources
- `tools.yaml` — Memory tools (`memoryUpdateField`, `memoryGetFacts`, etc.)
