# Memory field coverage matrix



> GENERATED — do not edit. Run `pnpm coverage:fields` to refresh.

> Source: `app/_features/memory/taxonomy/field-registry.ts` (the field-contract registry).

> A **NO-WRITE-PATH** row is an editable contracted field with no backing column — a visible gap.



**135 contracted fields · 0 uncovered.**



## person (14 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| name | text | — | name | keeper_ask | — | — | ok |
| email | email | — | email | keeper_ask | — | primary | ok |
| billingEmail | email | — | billing_email | keeper_ask | — | — | ok |
| phone | phone | — | phone | keeper_ask | — | — | ok |
| timezone | timezone | timezone | timezone | keeper_ask | — | — | ok |
| title | text | — | title | keeper_ask | — | — | ok |
| relationshipType | select | relationship_type | relationship_type | keeper_ask | — | — | ok |
| addressLine1 | text | — | address_line_1 | keeper_ask | — | — | ok |
| addressLine2 | text | — | address_line_2 | keeper_ask | — | — | ok |
| city | text | — | city | keeper_ask | — | — | ok |
| state | text | — | state | keeper_ask | — | — | ok |
| postalCode | text | — | postal_code | keeper_ask | — | — | ok |
| country | country | country | country | keeper_ask | — | — | ok |
| recordStatus | select | record_status | record_status | keeper_auto | — | — | ok |

## org (16 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| name | text | — | name | keeper_ask | — | — | ok |
| billingEmail | email | — | billing_email | keeper_ask | — | — | ok |
| industryParent | select | industry_parent | industry_parent | keeper_ask | — | — | ok |
| industryChild | select | industry_child | industry_child | keeper_ask | — | — | ok |
| relationshipType | select | relationship_type | relationship_status | keeper_ask | — | — | ok |
| primaryContact | reference | — | organization_people.is_primary | keeper_ask | — | — | junction |
| primaryContact.name | text | — | — | system_derived | — | — | derived |
| addressLine1 | text | — | address_line_1 | keeper_ask | — | — | ok |
| addressLine2 | text | — | address_line_2 | keeper_ask | — | — | ok |
| city | text | — | city | keeper_ask | — | — | ok |
| state | text | — | state | keeper_ask | — | — | ok |
| postalCode | text | — | postal_code | keeper_ask | — | — | ok |
| country | country | country | country | keeper_ask | — | — | ok |
| taxId | text | — | tax_id | keeper_ask | — | — | ok |
| website | url | — | website | keeper_ask | — | — | ok |
| recordStatus | select | record_status | record_status | keeper_auto | — | — | ok |

## work (28 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| name | text | — | name | keeper_ask | — | — | ok |
| status | select | work_status | status | keeper_ask | — | — | ok |
| workType | select | work_type | work_type | keeper_ask | — | — | ok |
| workTypeRetainer | boolean | — | — | system_derived | — | — | derived |
| stage | select | work_stage | stage | keeper_ask | — | — | ok |
| serviceId | reference | — | service_id | keeper_ask | — | — | ok |
| billingContactId | reference | — | billing_contact_id | keeper_ask | — | — | ok |
| primaryContactName | text | — | — | system_derived | — | — | derived |
| contractValueCents | money | — | contract_value_cents | keeper_ask | — | — | ok |
| finalPriceCents | money | — | final_price_cents | keeper_ask | — | — | ok |
| contractValueOrScope | json | — | — | system_derived | — | — | derived |
| scopeItems | json | — | scope_items | keeper_ask | — | — | ok |
| currency | select | currency | currency | keeper_ask | — | — | ok |
| paymentTerms | select | payment_terms | payment_terms | keeper_ask | — | — | ok |
| paymentType | select | — | payment_type | keeper_ask | — | — | ok |
| hourlyRateCents | money | — | hourly_rate_cents | keeper_ask | — | — | ok |
| hoursEstimate | number | — | hours_estimate | keeper_ask | — | — | ok |
| retainerMrrCents | money | — | retainer_mrr_cents | keeper_ask | — | — | ok |
| renewalDate | date | — | renewal_date | keeper_ask | — | — | ok |
| billingCycle | select | billing_cycle | billing_cycle | keeper_ask | — | — | ok |
| decisionDate | date | — | decision_date | keeper_ask | — | — | ok |
| startDate | date | — | start_date | keeper_ask | — | — | ok |
| deadline | date | — | deadline | keeper_ask | — | — | ok |
| poNumber | text | — | po_number | keeper_ask | — | — | ok |
| estimatedTimeline | text | — | estimated_timeline | keeper_ask | — | — | ok |
| discountPercent | percent | — | discount_percent | keeper_ask | — | — | ok |
| discountAmountCents | money | — | discount_amount_cents | keeper_ask | — | — | ok |
| discountReason | text | — | discount_reason | keeper_ask | — | — | ok |

## billing (14 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| number | text | — | number | keeper_ask | Exactly as printed on the document; no normalization | primary | ok |
| status | select | billing_status | status | keeper_auto | — | — | ok |
| direction | select | billing_direction | direction | user_only | — | — | ok |
| category | select | billing_category | category | keeper_ask | — | — | ok |
| organization | reference | — | organization_id | keeper_ask | — | — | ok |
| billingContact | reference | — | person_id | keeper_ask | — | — | ok |
| linkedWork | reference | — | project_id | keeper_ask | — | — | ok |
| vendorLabel | text | — | vendor_label | keeper_ask | — | — | ok |
| amountCents | money | — | amount_cents | keeper_ask | Integer cents in the record's currency | — | ok |
| amountPaidCents | money | — | amount_paid_cents | keeper_auto | — | — | ok |
| currency | select | currency | currency | keeper_ask | Uppercase ISO 4217 (DB currently stores lowercase until Phase 3.3 lands) | — | ok |
| issuedAt | date | — | issued_at | keeper_ask | — | — | ok |
| dueAt | date | — | due_at | keeper_ask | — | — | ok |
| paidAt | date | — | paid_at | keeper_auto | — | — | ok |

## file (15 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| title | text | — | file_name | user_only | — | — | ok |
| kind | select | asset_kind | — | system_derived | — | — | derived |
| url | url | — | external_url | user_only | — | — | ok |
| category | select | file_category | category | keeper_auto | — | — | ok |
| documentType | select | file_document_type | document_type | keeper_auto | — | — | ok |
| description | text | — | description | keeper_ask | — | — | ok |
| lifecycleStatus | select | file_lifecycle_status | lifecycle_status | keeper_auto | — | — | ok |
| totalAmountCents | money | — | total_amount_cents | keeper_auto | — | — | ok |
| currency | select | currency | currency | keeper_ask | Uppercase ISO 4217 | — | ok |
| dueDate | date | — | due_date | keeper_auto | — | — | ok |
| expiryDate | date | — | expiry_date | keeper_auto | — | — | ok |
| signedDate | date | — | signed_date | keeper_auto | — | — | ok |
| followUpDate | date | — | follow_up_date | keeper_ask | — | — | ok |
| sharedWithClient | boolean | — | shared_with_client | user_only | — | — | ok |
| isOperatorAsset | boolean | — | is_operator_asset | user_only | — | — | ok |

## meeting (13 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| title | text | — | title | user_only | — | — | ok |
| meetingType | select | meeting_type | meeting_type | keeper_ask | — | — | ok |
| status | select | meeting_status | status | keeper_auto | — | — | ok |
| startTime | datetime | — | start_time | keeper_auto | — | — | ok |
| endTime | datetime | — | end_time | keeper_auto | — | — | ok |
| locationType | select | meeting_location_type | location_type | keeper_auto | — | — | ok |
| meetingUrl | url | — | meeting_url | keeper_auto | — | — | ok |
| address | text | — | address | keeper_ask | — | — | ok |
| phoneNumber | phone | — | phone_number | keeper_ask | E.164 preferred; stored as entered | — | ok |
| description | text | — | description | keeper_ask | — | — | ok |
| notes | text | — | notes | user_only | — | — | ok |
| visibility | select | — | visibility | user_only | — | — | ok |
| attendees | json | — | attendees | keeper_auto | — | — | ok |

## me (35 fields)

| Field | Type | Vocabulary | DB column | Write policy | Format | Dedupe | Coverage |
|-------|------|------------|-----------|--------------|--------|--------|----------|
| preferredName | text | — | preferred_name | user_only | — | — | ok |
| fullName | text | — | display_name | user_only | Also split into first_name/last_name; full_name is a generated column | — | ok |
| gender | select | — | gender | user_only | — | — | ok |
| roleTitle | text | — | role_title | user_only | — | — | ok |
| phone | phone | — | phone | user_only | — | — | ok |
| timezone | timezone | timezone | timezone | user_only | — | — | ok |
| workingHours | text | — | working_hours | user_only | — | — | ok |
| location | text | — | location | user_only | — | — | ok |
| addressLine1 | text | — | address_line_1 | user_only | — | — | ok |
| addressLine2 | text | — | address_line_2 | user_only | — | — | ok |
| city | text | — | city | user_only | — | — | ok |
| state | text | — | state | user_only | — | — | ok |
| postalCode | text | — | postal_code | user_only | — | — | ok |
| country | country | country | country | user_only | — | — | ok |
| professionalCredentials | text | — | professional_credentials | user_only | — | — | ok |
| email | email | — | email | system_derived | — | — | derived |
| name | text | — | name | user_only | — | — | ok |
| tagline | text | — | tagline | user_only | — | — | ok |
| websiteUrl | url | — | website_url | user_only | — | — | ok |
| industry | text | — | industry | user_only | — | — | ok |
| legalBusinessName | text | — | legal_business_name | user_only | Exact registered name | — | ok |
| businessType | select | business_type | business_type | user_only | — | — | ok |
| businessPhone | phone | — | business_phone | user_only | — | — | ok |
| businessEmail | email | — | business_email | user_only | — | — | ok |
| location | text | — | location | user_only | — | — | ok |
| taxIdType | text | — | tax_id_type | user_only | — | — | ok |
| taxIdLast4 | text | — | tax_id_last4 | user_only | Max 4 characters; never store the full ID | — | ok |
| defaultCurrency | select | currency | default_currency | user_only | Uppercase ISO 4217 | — | ok |
| paymentTerms | select | payment_terms | payment_terms | user_only | — | — | ok |
| legalAddressLine1 | text | — | legal_address_line_1 | user_only | — | — | ok |
| legalAddressLine2 | text | — | legal_address_line_2 | user_only | — | — | ok |
| legalCity | text | — | legal_city | user_only | — | — | ok |
| legalState | text | — | legal_state | user_only | — | — | ok |
| legalPostalCode | text | — | legal_postal_code | user_only | — | — | ok |
| legalCountry | country | country | legal_country | user_only | — | — | ok |

