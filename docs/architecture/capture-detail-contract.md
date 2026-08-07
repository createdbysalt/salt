# Capture Detail Contract

**Status:** Living document — extend when a provider's adapter or card changes.
**Owner:** Capture pipeline (`app/_features/capture/adapters/categories/*`).
**Verified by:** category adapter tests via `runAdapterConformance` + the
contract-field assertions described at the bottom.

## Why this exists

Each capture card renders provider-specific detail rows
(`CaptureStreamTab.tsx` → `AreaContext`), but the fields it reads come from
`extracted_data`, which each category adapter writes at ingest. Before this
contract, the card and the adapters disagreed: the storage card read
`folder_path`/`owner_email`/`file_size` that no adapter wrote, the meetings
card rendered `action_items` that were never extracted, and the CRM card
formatted `deal_value` no CRM adapter produced. The result was capture detail
panes full of empty rows.

The contract below is the single source of truth for **what the envelope MUST
carry and the card MUST render, per provider** — chosen for play-creation
value (can Salt draft a follow-up, chase an invoice, prep a meeting from this
row?).

## Conventions

- All `extracted_data` keys are `snake_case`.
- Money fields are **decimal dollars (major units)** plus a `currency` ISO
  code — see Phase A of the capture quality repair; adapters convert minor
  units (Stripe cents) at ingest, the UI never divides.
- `deep_link` is the canonical "open in provider" URL key.
- When a trigger payload is pointer-only (HubSpot, Outlook events), the
  envelope carries `needs_hydration: true` and the card must show the
  hydration state honestly instead of empty rows.
- Fields marked *(hydrated)* come from a follow-up API fetch, not the trigger
  payload.

## Contract per category

### Email — Gmail, Outlook (`email.ts`)

| Field | Required | Notes |
|---|---|---|
| `subject` | yes | |
| `sender_email`, `sender_name` | yes | lowercase email |
| `to`, `cc` | yes | string arrays |
| `snippet` | yes | body preview, ≤500 chars |
| `has_attachments`, `attachments` | yes | `[{name, contentType?, size?}]` |
| `thread_id` | yes | |
| `is_reply`, `isSentByUser` | yes | drive reply loops + Memory-first policy |
| `labels` | Gmail | powers category drops in the pre-ingest gate |
| `deep_link` | yes | Gmail/Outlook web URL |
| `raw.headers` | Gmail | gate-relevant headers (List-Unsubscribe, Precedence…) |

Card renders: From, Subject, To/Cc, Attachments, classification chip, deep
link. Outlook minimal trigger payloads set `needs_hydration: true`.

### Calendar — Google Calendar, Outlook Calendar, Cal.com, Calendly (`calendar.ts`)

| Field | Required | Notes |
|---|---|---|
| `summary` / `title` | yes | event title |
| `start`, `end` | yes | ISO timestamps |
| `attendees` | yes | `[{email, name}]` — the card lists names |
| `attendee_count` | yes | |
| `organizer_email` | yes | |
| `location` | when present | physical location |
| `meeting_link` | when present | video-call URL (Meet/Teams join link) |
| `status` | when present | confirmed/cancelled |
| `deep_link` | when present | open event in provider |
| Calendly: invitee Q&A | when present | `invitee_qa` |

Card renders: Time range, Location (falls back to meeting link), Attendees,
Organizer. Outlook Calendar **trigger** payloads are pointer-only
(`{id, event_type}`) → `needs_hydration: true`; backfill rows carry the full
Graph event resource and must reach Google parity.

### Billing — Stripe, QuickBooks, Xero (`billing.ts`)

| Field | Required | Notes |
|---|---|---|
| `amount` | yes | canonical decimal-dollar alias |
| `currency` | yes | ISO code, default `usd` |
| `status` | yes | paid/open/failed… |
| `customer_name` / `customer_email` | yes | at least one |
| `invoice_number` | when present | |
| `due_date` | when present | |
| `deep_link` | when present | hosted invoice / dashboard URL |
| `amount_paid` / `amount_due` | compat | keep for older readers |

Card renders: Amount + currency + status, Customer, Invoice #, Due date.

### Storage — Google Drive, Dropbox, OneDrive (`storage.ts`)

| Field | Required | Notes |
|---|---|---|
| `file_name` | yes | |
| `folder_path` | when available | Dropbox/OneDrive have real paths; Drive only has parent IDs — omit rather than fake |
| `owner_email`, `owner_name` | when available | who changed/shared it |
| `mime_type` | when available | |
| `file_size` | when available | bytes |
| `web_view_link` | yes | doubles as `deep_link` |
| `is_folder` | yes | |

Card renders: File, Folder, Shared by, mime/size details.

### Communication — Slack (`communication.ts`)

| Field | Required | Notes |
|---|---|---|
| `text` | yes | message body |
| `channel` | yes | channel ID (name needs hydration) |
| `is_dm` | yes | `channel_type` im/mpim |
| `sender_id` | yes | Slack member ID |
| `sender_name`, `sender_email` | hydrated | trigger payload carries only the member ID — `needs_hydration: true` until a member-cache/enrichment fetch resolves it |
| `team_id` | when present | for permalink construction |

Card renders: Channel (hidden for DMs), From (falls back to member ID),
Message text.

### CRM — HubSpot, Pipedrive (`crm.ts`)

| Field | Required | Notes |
|---|---|---|
| `entity_type` | yes | contact / deal / organization |
| `entity_name` | yes | |
| `status` | deals | |
| `stage` | deals | stage name or ID |
| `deal_value` | deals | **decimal dollars** — same semantics as billing |
| `currency` | deals | ISO code |
| `email`, `company` | contacts | |
| `needs_hydration` | HubSpot triggers | payloads are `{objectId, subscriptionType}` pointers |

Card renders: Name, Type, Status, Stage, Value (formatted with `currency`,
not hardcoded USD).

### Meetings — Fireflies, Otter (`meetings.ts`)

| Field | Required | Notes |
|---|---|---|
| `title` | yes | |
| `duration_minutes` | yes | normalized to minutes |
| `participants` | yes | string array (names or emails) |
| `summary` | when present | overview text |
| `action_items` | when present | string array — the card renders these; extraction is the adapter's job |
| `deep_link` | when present | transcript URL |

Card renders: Duration, Participants, Summary, Action items.

### Documents — Notion, Google Docs/Sheets/Slides (`documents.ts`)

| Field | Required | Notes |
|---|---|---|
| `title` | yes | |
| `editor_email` / `editor_name` | when available | who changed it |
| `change_type` | when available | created/updated |
| `deep_link` | yes | |

### Project management — Linear, Asana, Jira (`project-management.ts`)

| Field | Required | Notes |
|---|---|---|
| `title` | yes | |
| `project` | when present | |
| `status` | yes | |
| `priority` | when present | |
| `assignee` | when present | |
| `description` | when present | |

## Enforcement

1. **Golden fixtures** live in `adapters/__fixtures__/` per provider; every
   capture-enabled trigger slug needs at least one fixture proving its
   adapter populates the contract fields above.
2. **`runAdapterConformance`** (`adapters/adapter-conformance.ts`) asserts
   envelope identity/shape; the contract-field check is layered on top via
   `expectContractFields` in each category test — a fixture whose envelope
   misses a required contract field fails the suite.
3. When adding a provider: pull its trigger schema
   (`scripts/pull-composio-trigger-schemas.ts`), add a fixture, then write
   the normalizer until the contract test passes.

## Known gaps (tracked, honest)

- **Slack sender name** needs a member cache or enrichment fetch — rows carry
  `needs_hydration` until then.
- **Google Drive folder path** — the API returns parent IDs, not names;
  requires a hydration fetch to resolve.
- **HubSpot trigger captures** are pointer-only until a hydration pass runs.
- **Otter** has no verified payload shape yet — generic extraction only.
