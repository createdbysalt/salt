# Connector Platform — Ingestion & Retention Canon

**Status:** Living document. Started 2026-07-04 with the ingestion/retention
contract (connector-platform Phase 3.7); sync/classification contracts land
with Phase 7.3.
**Plan:** `.cursor/plans/2026-07-03-connector-platform.md`

## Ingestion model: capture the envelope, extract on demand

Every capture source flows through one pipeline:

```
Composio trigger webhook ─┐
                          ├→ adapter.normalize() → CaptureEnvelope → ingestEnvelope()
paginated backfill fetch ─┘        (noise gate → capture_events insert, dedupe 23505)
```

- **Adapters** (`app/_features/capture/adapters/`) are the only code that
  interprets provider payloads. Each ships with golden fixtures passing the
  shared conformance harness (`adapter-conformance.ts`); the generic ingestor
  only ever sees the `CaptureEnvelope` contract.
- **Envelopes are thin**: participants, timestamps, title, structured fields
  (amounts, event times), a dedupe key, and a **pointer** back to the source
  item. The conformance harness enforces a 4KB bound on the persisted raw
  payload.
- **Arrival paths**: live events arrive via the single webhook ingress
  (`/api/webhooks/composio`, routed by trigger slug); history and gap-repair
  arrive via paginated backfills (`gmail-backfill.ts`,
  `connector-backfills.ts`) and the reconciliation cron
  (`/api/cron/capture-reconciliation` — tiered cadence per plan: Starter
  1×/day, paid 4×/day, skipped for trigger-covered providers with proven
  healthy webhook delivery, Sources plan 3.3). All three converge on
  `ingestEnvelope`, so dedupe makes overlap idempotent.

## Two-lane delivery model (decided 2026-08-08, Sources plan 4.1)

Every connector is mapped to one or both delivery lanes:

- **Lane A — real-time triggers.** Events that matter _now_: Memory-known
  senders, payments, calendar changes. One Composio trigger instance per
  (connection, slug), created at capture-enable time
  (`trigger-subscriptions.ts`), ingress via `/api/webhooks/composio`.
  Upstream filters (`capture_trigger_config`) keep noise from ever firing a
  billed delivery; where the provider exposes no filters (Outlook, Stripe,
  Slack DMs), gating is code-side at the pre-ingest gate instead.
- **Lane B — tiered discovery crons.** Finding _new_ leads/records at
  plan-based cadence via the reconciliation backfills above, plus
  relationship-discovery (held-sender promotion) inside the
  capture-intelligence cron, gated by the same plan cadence — Starter 1×/day,
  paid 4×/day, stamped on `workspace_capture_settings.last_discovery_at`
  (`discovery-cadence.ts`, Sources plan 4.4). Sources → Activity shows the
  workspace's cadence and next due run (`getDiscoveryStatus`), so the
  discovery lane is an explicit product surface rather than a hidden cron.

| Connector       | Lane A (triggers)                     | Lane B (backfill) | Notes                                                |
| --------------- | ------------------------------------- | ----------------- | ---------------------------------------------------- |
| Gmail           | ✓ new message (category-query filter) | ✓                 | Inline transient-body analysis at backfill (3.4)     |
| Outlook         | ✓ received + sent                     | ✓                 | No upstream filters exist — code-side gating         |
| Google Calendar | ✓ event created                       | ✓                 |                                                      |
| Google Drive    | ✓ file created                        | ✓                 |                                                      |
| Stripe          | ✓ charges / invoices / subscriptions  | ✓                 | Payment rail; no upstream filters — code-side gating |
| Slack           | ✓ channel + DM (bot filter)           | —                 | Per-connection channel scoping (4.5)                 |
| Google Docs     | ✓ created + updated                   | —                 |                                                      |
| Google Sheets   | ✓ new spreadsheet                     | —                 |                                                      |
| Notion          | ✓ page created + updated              | —                 |                                                      |
| Cal.com         | —                                     | ✓                 | Lane-B-only by construction (no trigger type)        |
| Calendly        | —                                     | ✓                 | Lane-B-only by construction                          |
| Dropbox         | —                                     | ✓                 | Lane-B-only by construction                          |
| QuickBooks      | —                                     | ✓                 | Lane-B-only by construction                          |

Trigger configs evolve **in place** via the upsert wrapper
(`upsertCaptureTriggerConfig`, Sources plan 4.2) — never delete+recreate, so
filters can tighten without a delivery gap.

### Per-connection scoping (Sources plan 4.5)

On top of the global filters, each connection can carry its own upstream
scope, chosen on the connector's detail pane (Customize tab → "What Salt
watches" — deliberately no separate Rules tab):

| Connector | Control | Trigger config key |
| --------- | ------- | ------------------ |
| Slack | One channel (default: every channel; DMs always come through) | `SLACK_CHANNEL_MESSAGE_RECEIVED.channel_id` |
| Google Calendar | One calendar (default: primary) | `…EVENT_CREATED_TRIGGER.calendarId` |
| Google Drive | One folder (default: whole Drive) | `GOOGLEDRIVE_FILE_CREATED_TRIGGER.folder_id` |
| Gmail | Category toggles (default: all four excluded) | `GMAIL_NEW_GMAIL_MESSAGE.query` `-category:*` clause |
| Stripe, Outlook, Google Docs, Notion | Trigger selection — which event slugs subscribe (default: all) | none (subscribed-slug set, `trigger_selection` scope kind, P7) |

The choice persists on `workspace_integrations.config.captureScope` and is
merged into the trigger spec by every subscribe path — capture enable,
trigger reconciliation re-create, and the 4.2 upsert — so scoping survives
re-subscribes (`capture-scope.ts`). Picker options load through metered
read tools; each scoped event is an upstream event that never bills a
delivery.

**Trigger selection (Connector Rules & Learning, P7):** for providers whose
capture triggers are all zero-config and multi-slug (live-audited
2026-08-10: Stripe's 5 event slugs, Outlook received/sent, Docs
created/updated, Notion created/updated), the only upstream filter
available is WHICH slugs subscribe. The scope is a slug set, not a config
merge: `applyScopeToSpecs` filters the spec list, and the Customize tab
writes changes live through `syncCaptureTriggerSelection` (selected slugs
upsert first; a failure aborts before anything is torn down; deselected
slugs are deleted after). An empty or fully-stale selection reads as
unscoped — capture is never silently killed by a malformed or drifted
scope. Providers without any upstream filter (Sheets, Fireflies, …) say so
honestly in the UI instead of rendering a dead control.

### Workspace rules ("Always let in" / "Keep out")

Connector Rules & Learning (2026-08-10) added a user-facing rules layer on
top of scoping. Scope decides which upstream events ever fire; **rules
decide what the gate does with the captures that arrive** — explicit deny >
explicit allow > heuristics, enforced as Gate 0 of the capture pipeline
(`app/_features/capture/services/rules-manager.ts`, `connector_rules`
table). Managed per-connector in the Customize tab and workspace-wide from
Sources → Activity. See `app/_features/capture/CLAUDE.md` for the gate
contract.

## Retention stance (decided 2026-07-03)

**Salt stores extracted facts + provenance, never a mirror of the user's
account.**

- `capture_events.raw_payload` holds the envelope pointer, not content. No
  raw payload mirrors, no full email bodies at rest.
- Full content is **hydrated transiently** through the source pointer
  (`hydrate-capture.ts`, e.g. `GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID`) only for
  items that already passed the noise gate and only when a processing pass
  (intelligence scan, entity resolution) needs it. The fetched body feeds the
  analysis and is discarded; what persists is the analysis outcome with
  provenance.
- The one place the body arrives without a dedicated fetch is the Gmail
  backfill: pages are fetched with `include_payload` and admitted captures
  are analyzed **inline on the transient body** (`backfill-inline-scan.ts`,
  Sources plan 3.4). Only the thin envelope is persisted — outcome metadata
  merges into the stored row by id, so the body never reaches the database.
- Hydration is bounded per scan run — it is an assist, not a sync.
- **"Reprocess history against a new playbook" = a paginated Composio
  backfill job**, not a local replay. There is no local archive to replay;
  the provider is the source of truth. Entry point:
  `reprocessCaptureWindow(workspaceId, provider, { lookbackDays })` in
  `capture-reconciliation.ts` — dedupe makes capture rows idempotent, and
  signal absorption runs for duplicates too, so a new playbook's fill-rules
  see the whole window without re-ingesting.

## Signal derivation

- Head adapters implement `deriveSignals(envelopes, ctx)` — direct
  observation, bounded to the `PERSON_SIGNAL_KEYS` registry set (enforced by
  the conformance harness). Backfills absorb through `resolvePerson`; the
  records-engine admission machinery decides creation with provenance.
- Adapter-less (long-tail) sources use the **generic LLM extractor**
  (`generic-signal-extractor.ts`): registry-bounded validation, contacts
  restricted to observed participant emails, and `signalsInferred=true` caps
  admission at needs_confirmation — **LLM-inferred evidence is ask-first
  only and can never auto-create a record.**

## Consent model

- `workspace_integrations.capture_enabled` is a per-connection user toggle,
  independent of the action-trust ladder. Default OFF; explicit opt-in at
  connect time, consent provenance recorded.
- Trigger subscriptions are created when the toggle flips ON and deleted when
  it flips OFF (`trigger-subscriptions.ts`) — "connected" and "feeding my
  memory" are separate consents.
- The webhook ingress and reconciliation cron both honor `capture_enabled`
  and `is_active`; a lingering trigger instance cannot ingest.

## Token custody

Salt stores zero provider OAuth tokens. Composio is the sole token
custodian; API keys (e.g. the user's Stripe key) pass through to Composio at
connect and are never written to Salt's DB or logs.
