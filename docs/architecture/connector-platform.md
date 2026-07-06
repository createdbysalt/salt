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
  (`/api/cron/capture-reconciliation`, every 6h over capture-enabled
  connections). All three converge on `ingestEnvelope`, so dedupe makes
  overlap idempotent.

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
