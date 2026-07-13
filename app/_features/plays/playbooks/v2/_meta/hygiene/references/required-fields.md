# Required Fields

Which fields are considered "required" per entity type and severity of missing them.

## Severity Levels

| Severity | Score | Meaning |
|----------|-------|---------|
| **Critical** | 90-100 | Blocks core functionality |
| **High** | 70-89 | Significantly degrades usefulness |
| **Medium** | 50-69 | Nice to have, helps automation |
| **Low** | < 50 | Optional, cosmetic |

## People

| Field | Severity | Why Required |
|-------|----------|--------------|
| `email` | Critical (95) | Primary identifier, needed for communication |
| `relationship_type` | High (80) | Determines how Salt treats them |
| `name` | High (75) | Display and search |
| `organization` link | Medium (65) | Context for relationship |
| `phone` | Low (40) | Alternative contact |
| `timezone` | Low (35) | Scheduling optimization |

## Organizations

| Field | Severity | Why Required |
|-------|----------|--------------|
| `domain` | High (85) | Used to match people, dedupe |
| `primary_contact` | High (78) | Who to contact |
| `name` | High (75) | Display and search |
| `relationship_type` | Medium (65) | Client/vendor/partner classification |
| `industry` | Medium (55) | Context, optional |
| `billing_email` | Medium (50) | Invoicing automation |

## Work

| Field | Severity | Why Required |
|-------|----------|--------------|
| Client link (`organization_id` or `person_id`) | Critical (92) | Who is this for? |
| `status` | High (82) | Pipeline tracking |
| `name` | High (75) | Display and search |
| `deadline` | Medium (65) | Scheduling, reminders |
| `contract_value_cents` | Medium (58) | Revenue tracking |
| `work_type` | Medium (50) | Categorization |

## Billing

| Field | Severity | Why Required |
|-------|----------|--------------|
| Party link (`organization_id` or `person_id`) | Critical (90) | Who is this from/to? |
| `amount_cents` | High (85) | The core data |
| `due_at` | High (75) | Payment tracking |
| `status` | High (70) | Payment state |
| `number` | Medium (60) | Reference |
| `linked_work` | Medium (55) | Project attribution |

## Files

| Field | Severity | Why Required |
|-------|----------|--------------|
| `title` | High (70) | Display and search |
| `url` | High (70) | Access the file |
| `category` | Medium (55) | Organization |
| Entity link | Medium (60) | Context |

## Meetings

| Field | Severity | Why Required |
|-------|----------|--------------|
| `title` | High (70) | Display |
| `start_time` | High (70) | When it happens |
| `attendees` | Medium (65) | Who's involved |
| `meeting_type` | Medium (50) | Categorization |
| `notes` (after meeting) | Medium (55) | Capture outcomes |

## Field Inference

Some fields can be inferred from connected accounts:

| Field | Inference Source | Confidence |
|-------|------------------|------------|
| `email` | Email threads | 95 |
| `organization` | Email domain | 85 |
| `relationship_type` | Payment history | 95 |
| `domain` | People email domains | 90 |
| `status` (work) | Activity patterns | 75 |
| `category` (file) | Content analysis | 85 |
| `meeting_type` | Title patterns | 80 |

Hygiene playbook uses these inferences to suggest fills for missing fields.
