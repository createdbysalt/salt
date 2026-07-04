# Plan: Connector Platform — Composio-Only Integrations at Scale

**Date:** 2026-07-03
**Status:** Draft — native-integration fates resolved with founder 2026-07-03 (see Decisions)
**Supersedes:** `docs/plans/2026-07-02-schema-modernization.md` (its remaining phases are folded into Phase 6 here)
**Sequencing:** starts after `.cursor/plans/2026-07-02-keeper-field-contracts.md` fully lands (Phase 6 provenance work pending there); consumes its field registry + signal contracts.

## Context

Salt will eventually offer hundreds-to-thousands of connectors. Today, adding one touches ~7 hand-maintained structures (`COMPOSIO_WORKSPACE_PROVIDERS`, `COMPOSIO_APP_NAMES`, `COMPOSIO_AUTH_CONFIG_IDS`, `COMPOSIO_API_KEY_PROVIDERS`, `CONNECTOR_CATALOG`, `connector-manifest`, `tool-slugs` + `tool-policy-registry`), plus a bespoke ingestion service if it produces captures. That's a drift machine — the same bug class the field-contracts plan spent Phase 0 killing.

This plan rebuilds connectors on three principles:

1. **Composio's catalog is the source of truth; Salt stores only deltas** — risk classifications, auth-config pins, workspace trust, capture adapters. A sync job pulls the catalog; drift is a detected event (auto-disable + alert), never a runtime surprise.
2. **Fail-closed classification as a pipeline, not a file** — every tool starts `unclassified` = unusable at the execution gate. An LLM proposes risk class from the tool schema; a human approves in a review queue. Adding 500 connectors adds zero risk until classified.
3. **Two-tier connectors** — the long tail is data-driven and action-only (catalog-only until demand pulls them forward); the head (~30–50 capture sources) gets hand-written adapters that must pass a shared conformance harness.

**Ingestion model (decided): capture the envelope, extract on demand.** Ingest thin normalized envelopes for everything in-window (sender, timestamps, subject, ids, amounts + a pointer to the source item); full content is hydrated on demand via Composio fetch tools for items that pass the noise gate / entity resolution. The provider stays the source of truth — Salt stores extracted facts + provenance, not a mirror of the user's inbox. Matches the naming canon: *"emails flow INTO memory via capture; they are not a memory record themselves."*

**Composio-only rule (decided):** no native user-facing integrations. The only native Stripe is Salt's own SaaS billing (`app/_lib/stripe/`); user Stripe accounts stay on the Composio connector. Platform infra (Resend, LLM providers, Supabase, Sanity, analytics, PageSpeed/CrUX) is not a connector and stays native.

## Research Summary (verified 2026-07-03)

- **Gmail does NOT over-import.** Current pipeline is bounded: 90-day bootstrap / 7-day sync windows, promo/social/noreply query exclusions, noise gate, hard 100-message cap with **no pagination**, and **no scheduled sync** — only connect-time bootstrap + manual "Sync & Scan". The problem is under-ingestion, not over-ingestion.
- **Composio triggers verified in source** (`~/.opensrc/repos/github.com/composiohq/composio/next`): `composio.triggers` — `create/enable/disable/listTypes/getType`; Gmail + Calendar are polling triggers, **1-minute minimum interval on Salt's own OAuth client** (15-min on managed auth); delivery = **one project-level Webhook Subscriptions API endpoint** (`POST /api/v3/webhook_subscriptions`, V3 envelope, HMAC-SHA256 verify via `triggers.verifyWebhook`, secret returned once); route on `trigger_slug` + `connected_account_id`; `composio.connected_account.expired` event exists for re-auth prompts.
- **Programmatic catalog verified**: `toolkits.get`, `tools.getRawComposioTools({toolkits, important, limit})` (caveat: toolkit-only filter defaults to `important: 'true'` subset — pass `important: false`), `getRawComposioToolBySlug(slug)` (full input/output JSON schemas), `triggers.listTypes({toolkits})`. Cursor-based pagination throughout.
- **Field-contracts demand side already exists**: `FIELD_REGISTRY.keeperSignal` + playbook fill-rule `ProfileSignalKey`s declare what playbooks want. Gmail populates only 2 signals today (`is_bidirectional_thread`, `email_count`); the signal layer is the declared-but-unbuilt bridge.
- **Native integration inventory** (full sweep): violations = native Gmail watch/sync (Pub/Sub → `client_emails`), Cal.com (own OAuth + booking webhook + cron), Fireflies, Recall.ai, Vercel Domains (Bridge white-label). Already dead = Google Calendar native (stub routes, zero importers), Gmail native send (`sendViaGmail`, zero consumers). Dead deps = `@calcom/embed-react`, `nodemailer` (test fixture only).
- **Capture pipeline is push-dominant**: ingestion → `capture_events` (pending) → resolvers → records-engine → provenance. Two pull consumers: `routing.ts` and `play-triggers.ts`. This backbone is kept; only the *front* (how items arrive) changes.

## Decisions (resolved with founder, 2026-07-03)

1. **Native Gmail watch/sync** — RETIRE. Composio triggers become the only Gmail ingestion. `client_emails` writers stop; schema-mod Phase C (rename → `email_messages`) is **cancelled** — replaced by retirement.
2. **Cal.com** — MIGRATE to the Composio `cal` toolkit: booking ingestion becomes a capture adapter on Composio triggers; native OAuth lib, sync cron, and `meeting_types` table retire (supersedes schema-mod A.4's "rename to calcom_event_types").
3. **Fireflies + Recall.ai** — RETIRE BOTH. Meeting transcription/bot-recording leaves the product for now; meeting content tables (`meeting_transcripts`, `meeting_summaries`, …) stay (future transcript sources can refill them).
4. **Vercel Domains** — RETIRE (Bridge-era white-labeling).
5. **Raw payload retention** — envelope + pointer only; no raw mirrors. "Reprocess history against a new playbook" = a paginated Composio backfill job, not a local replay. State this in the canon doc.
6. **Tool allowlist stays human-approved** — programmatic catalog scaffolds, LLM proposes, human classifies. Policy *data* lives in the DB; policy *enforcement* (fail-closed gate, trust ladder, Zod at the boundary) stays code.

## Implementation Plan

> Each step includes its tool in `[brackets]`. One atomic PR per numbered group. Iron rules inherited from schema-modernization: renames keep constraint/index hygiene; PostgREST embedded-join strings swept (`rg ':table(' 'table!'`); RLS/triggers/functions recreated in-migration; post-push schema assertion (the ledger has lied before).

### Phase 0: Preconditions
- [x] 0.1 (verified 2026-07-03) `<project-ref>`: **PITR disabled**, daily physical WAL-G backups COMPLETED (latest 2026-07-03 09:00 UTC, 8-day history). Restore: dashboard → Database → Backups → daily restore (≤24h loss; test data only). Per-drop row exports to `.backups/pre-drop-*` stay mandatory
- [x] 0.2 Superseded pointer added to `docs/plans/2026-07-02-schema-modernization.md` (in main tree, riding the keeper branch)
- [x] 0.3 keeper-field-contracts Phase 6 in flight in a parallel session on `feat/address-integration`; connector-platform work isolated on `feat/connector-platform` (worktree). **Migration timestamps renumbered 2026-07-03** (drop→240000, core→210000, seed→220000) after the parallel session minted its own 180000/190000

### Phase 1: Retirements (do these FIRST — every later rename sweep gets smaller)
> Executed 2026-07-03 on branch `feat/connector-platform` (worktree), one atomic commit per step; ~8,400 lines deleted; typecheck green throughout (4 pre-existing billing-test errors at branch point excluded — owned by the parallel keeper session).
- [x] 1.1 (aba983ea) Fireflies retired: GraphQL client, webhook, Fireflies webhook types; meeting content tables + historical source labels kept; Composio fireflies toolkit untouched
- [x] 1.2 (a0b62921) Recall.ai retired: lib, both webhooks, calendar-recording-actions (already importerless), whole `_lib/transcription/` (AI summary's only consumer was the Recall webhook); Cal webhook no longer schedules bots; `svix` dropped; `recall_bot_id` column stays frozen
- [x] 1.3 (2310bfb3) Vercel Domains retired: domain-manager, entire `serve` feature, both Settings sections — neither was rendered anywhere (dead since Bridge retirement)
- [x] 1.4 (fe7bbeed) Native Gmail pipeline retired: `_lib/gmail/`, Pub/Sub webhook + watch routes, manage-watch, webhook-verify, gmail dev scripts; auth callback no longer captures Google provider tokens — **Salt now stores zero provider OAuth tokens**. `client_emails` frozen; Conversations reads continue until the conversations rebuild (open question 1)
- [x] 1.5 Dead stubs/deps dropped: Google Calendar native stubs, legacy `/api/auth/google` callback, importerless google-calendar action; `googleapis`, `@calcom/embed-react`, `nodemailer` removed (transitive security pin kept). **Bonus: sign-in trimmed to identity-only scopes** — Google login no longer requests gmail.send/readonly/modify + calendar scopes; connector access is per-toolkit via Composio
- [x] 1.6 Drop migration authored: `20260703240000_drop_native_gmail_calendar_tables.sql` (gmail_connections/watches/sync_logs + calendar_connections) with an orphaned-trigger guard encoding the drop_bridge_tables login incident. **NOT pushed** — parallel session has an unpushed `…160000` migration in the main tree; push at merge, after row export to `.backups/pre-drop-*`; `database.types.ts` regen rides the push

### Phase 2: Connector platform core — catalog sync + fail-closed classification
- [x] 2.1 (870b9743) Schema landed: `20260703210000_connector_platform_core.sql` — 6 tables + 4 enums, RLS authenticated-read / service-role-write, drift log table `connector_sync_events`, `set_updated_at` triggers. `database.types.ts` hand-extended pending regen at push
- [x] 2.2 (50c31658) `catalog-sync.ts` + `/api/cron/connector-catalog-sync` (daily 4am, CRON_SECRET): shallow toolkit sync for all providers, deep tools+triggers for action/capture tiers only; removed/schema-changed tools auto-disable their approved classification (cache invalidated) + sync event; new tools land `unclassified`; per-toolkit failures isolate as `sync_failed` events
- [x] 2.3 (870b9743) `scripts/generate-connector-seed.ts` → `20260703220000_seed_connector_platform.sql`: 92 providers, 92 overrides (tier action for the 7 manifest connectors), 69 approved classifications — generated, zero rows retyped; guard refuses to run with env overrides present
- [x] 2.4 (19aaf684) Gate reads `tool_classifications` via `classification-store.ts` (60s TTL, negative-cache 15s, errors → null → blocked). `assertComposioToolAllowed` takes the resolved policy; in-code registry is legacy-fallback-only until 2.5. Parity test green (seed === registry, nothing extra); fail-closed unit tests green. **Deploy coupling: this code requires migrations 210000+220000 applied — push before or with deploy**
- [x] 2.5 COMPLETE for this phase's scope (2026-07-03, final commit 172f4d03): catalog UI fully DB-driven — `ConnectorsPageData.catalog` carries registry rows; ConnectorsPage/DetailModal/Marketplace/FilterPopover read them via `catalog-view.ts`; Ask Salt connect-handlers + connector actions resolve from the registry; `connector-catalog.ts` + `providers.ts` demoted to SEED SOURCE ONLY (zero runtime importers, banner-marked). Earlier steps: Done: (a) orphaned Settings connector surfaces + dead integration-status deleted (2f9ef192); (b) `connector-registry.ts` — cached DB accessors over catalog+overrides, env-var → pinned auth config resolution, fail-closed on registry unavailability; connections.ts / composio-connect / Ask Salt toolkit loading / OAuth-state validation repointed, provider params widened to string (577e753b); (c) `getConnectorsPageData` connectable set is DB-driven — enabling a connector = a connector_overrides row flip (74512461). **Remaining:** client prop-drill (ConnectorsPage / DetailModal / Marketplace / FilterPopover read static CONNECTOR_CATALOG_BY_ID for display metadata — embed catalog rows in ConnectorsPageData, then delete `connector-catalog.ts` data + `providers.ts` maps [seed generator keeps its own frozen copy]). **Deliberately deferred to Phase 5.5:** `connector-manifest.ts`, `tool-policy-registry.ts`, `ask-salt-tools.ts` statics — that surface gets rebuilt as two-stage tool exposure anyway; rebuilding it twice is wasted motion `[tool: /pragmatic-code-review]`
- [x] 2.6 (2026-07-03) `/admin/connectors` review queue: PLATFORM_ADMIN_EMAILS-gated (fail closed, 404 otherwise, not in nav); lists unclassified/proposed/drift-disabled/rejected tools + unacknowledged sync events; "Propose next batch" = LLM pass (new `toolClassification` routing slot, temp 0) writing model_proposal only; human verdict (risk chip + confirm-each-run) approves with provenance + gate-cache invalidation. Gate allowlist unit-tested
- [x] 2.7 (2026-07-03) `/connector` command rewritten for the DB lifecycle: add = auth config + DB rows + sync + icon (zero app-code for action-only); new `classify` subcommand; iron rules encode frozen seed sources, human-only approvals, migration-timestamp cross-branch check

### Phase 3: Trigger ingress + generic ingestor (the ingestion backbone)
- [x] 3.1 (2026-07-03) Ingress LIVE: /api/webhooks/composio — HMAC verified (webhook-signature.ts, unit-tested incl. replay tolerance + key rotation), V1/V2/V3 envelopes normalized, routed by trigger slug, workspace from connected_account_id, honors is_active + capture_enabled, connected_account.expired marks integration for reconnect. Requires COMPOSIO_WEBHOOK_SECRET env. STILL TODO: create the Webhook Subscription on the Composio project pointing at this URL. Original: Webhook Subscriptions API setup (one URL per Composio project, V3 envelope) + `app/api/webhooks/composio/route.ts`: HMAC verify (`triggers.verifyWebhook`), resolve workspace from `connected_account_id`, route by `trigger_slug`; handle `composio.connected_account.expired` → integration status + re-auth play card `[tool: —]`
- [x] 3.2 (2026-07-03) capture/adapters/types.ts (envelope: participants/ids/timestamps/thin raw ≤4KB) + adapter-conformance.ts harness (identity, dedupe stability, source integrity, retention bound, noise coverage). Original: CaptureEnvelope contract (typed): source pointer (toolkit, external id, thread/parent id), participants, timestamps, subject/title, structured fields (amounts, event times), dedupe key. Conformance harness: golden payload fixtures per adapter → envelope asserts (fields present, dedupe key stable, declared signals ⊆ registry set, noise gate consulted) `[tool: /testing-patterns]`
- [x] 3.3 (2026-07-03) ingest-envelope.ts: one write path — noise gate → capture_events insert (23505 dedupe); downstream consumers untouched. Original: Generic ingestor: trigger payload → adapter.normalize() → envelope → `capture_events` insert (dedupe 23505) → noise gate → existing resolver/records-engine push + routing/play-trigger pull consumers unchanged `[tool: —]`
- [x] 3.3b (2026-07-03) workspace_integrations.capture_enabled shipped (20260703230000, default false, grandfather backfill for active gmail/calendar/drive/stripe); webhook ingress enforces it. Toggle UI + lifecycle DONE (detail-modal Memory capture section, Off/On consent pills; setCaptureEnabled creates/deletes trigger instances, all-or-nothing with rollback, ids in integration config). **Capture is a per-connection user toggle, independent of action trust (decided 2026-07-03).** Platform `tier` stays a ladder (capture-capable ⊃ action-capable — adapters ingest via read tools); but per workspace connection, `capture_enabled` is its own setting orthogonal to the trust ladder. Legit combinations: action-only (capture off), capture-only (trust read_only — capture's unattended reads are read-class), both, neither. Default OFF with an explicit opt-in at connect time ("Should Salt learn from your Gmail?") — consent provenance recorded like play enablement. Trigger subscriptions are created/deleted when this toggle flips, not at connect `[tool: /database migration + /frontend-design]`
- [~] 3.4 PARTIAL (2026-07-03): Gmail adapter shipped (GMAIL_NEW_GMAIL_MESSAGE, defensive across payload spellings, conformance-fixtured — fixtures synthesized from trigger schema, replace with first live capture). Trigger-at-opt-in DONE via setCaptureEnabled. STILL TODO: migrate bootstrap/backfill off the gmail-ingestion fetch path; live payload smoke once deployed (replace synthesized fixtures). Original: Gmail adapter first (replaces `gmail-ingestion.ts` fetch path; bootstrap becomes a paginated Composio backfill using the same adapter); enable `GMAIL_NEW_GMAIL_MESSAGE` trigger at connect `[tool: —]`
- [ ] 3.5 Migrate calendar/drive/stripe ingestion services onto adapters (same conformance suite); delete bespoke services `[tool: /pragmatic-code-review]`
- [ ] 3.6 Reconciliation cron: low-frequency paginated fetch per capture-enabled connection to catch missed events; "Sync & Scan" demoted to debug affordance `[tool: —]`
- [ ] 3.7 On-demand hydration: full-content fetch (e.g. `GMAIL_FETCH_MESSAGE_BY_ID`) only for captures passing noise gate/resolution; envelope+pointer retention stance written into the canon doc `[tool: —]`

### Phase 4: Cal.com → Composio capture adapter
- [ ] 4.1 Composio `cal` toolkit: auth config provisioned, booking trigger types verified via `triggers.listTypes` (fall back to reconciliation-cron polling of booking list tools if trigger coverage is thin — verify BEFORE deleting native) `[tool: /connector]`
- [ ] 4.2 Booking adapter: normalize booking events → envelope; lead-person creation + meeting creation reuse existing resolvers (`resolvePerson`, meeting system plays) — port the bespoke webhook logic into the adapter `[tool: —]`
- [ ] 4.3 Retire native: `app/_lib/calcom/`, `app/api/webhooks/cal/`, `app/api/integrations/calcom/callback/`, `app/api/cron/calcom-sync/`, `calcom-sync.ts`; drop `meeting_types` table (registry vocabulary already replaced its UI role) `[tool: rg sweep + /database migration]`

### Phase 5: Signal derivation layer + long-tail extraction
- [ ] 5.1 Signal layer: per-adapter `deriveSignals(captures) → Partial<ProfileSignalKey facts>`; registry `keeperSignal` is the contract; Gmail extends beyond today's 2 signals; calendar/stripe adapters fill the signals the fill-rules already reference `[tool: —]`
- [ ] 5.2 Generic LLM extractor for adapters-less connectors: map envelope → registry signals via `aiDescription`s, confidence-discounted, ask-first only (records-engine absorbs via existing provenance/threshold machinery) `[tool: —]`
- [ ] 5.3 Backfill job: "reprocess window W against playbook P" = paginated Composio fetch → adapter → engine (the retention-stance counterpart) `[tool: —]`

### Phase 5.5: Ask Salt tool surface + safety hardening (depends on Phase 2 classifications)
- [ ] 5.5.1 **Single-gate invariant**: Ask Salt, plays, and background jobs all execute through `executeComposioAction` — no separate chat path, ever. Unit test asserts the chat route has no other execution import `[tool: /testing-patterns]`
- [ ] 5.5.2 **Two-stage tool exposure** (replaces loading every connected toolkit's tools into context): Ask Salt gets (a) a small pinned core set for connected head toolkits (today's 7-connector manifest equivalent, now DB-driven), plus (b) a `search_connector_tools` meta-tool querying the synced catalog (approved classifications ∩ connected toolkits ∩ workspace policy only) and (c) one generic `execute_connector_action(slug, args)` that resolves the synced JSON schema, validates args (Zod-from-schema at the boundary), and calls the gate. Scales to any connector count with constant context cost `[tool: —]`
- [ ] 5.5.3 **Preview-first mutation UX** (generalize draft mode): every `mutating` tool call from Ask Salt returns a human-readable preview artifact (recipient/amount/content diff) requiring one-tap approval in-chat; auto-execution only when the provider sits at `act_with_approval` trust AND the tool's classification allows it. `destructive` never executes via AI regardless of trust (existing rule, now enforced from DB) `[tool: /frontend-design]`
- [ ] 5.5.4 **Untrusted-content rule (the lethal-trifecta defense)**: connector-fetched content (email bodies, doc text, webhook payloads) enters prompts only inside the existing fencing pattern (`buildMemoryContextBlock` precedent) and is labeled untrusted; when a mutating tool's arguments contain spans derived from untrusted content, the gate **forces confirmation regardless of trust level** (argument-provenance check). Instruction-following from fenced content is red-teamed in CI (5.5.7) `[tool: —]`
- [ ] 5.5.5 **Rate limits + anomaly alerts**: per-workspace per-tool-class rate limits at the gate (reuse `app/_lib/rate-limit/`); burst anomaly (e.g. N sends/hour) pauses the provider to ask-first and raises a play card `[tool: —]`
- [ ] 5.5.6 **Audit parity**: every gate execution already lands in `workspace_tool_executions`; surface them in user-visible Activity ("Salt sent X because Y" with consent provenance), same pattern as record provenance `[tool: /frontend-design]`
- [ ] 5.5.7 **Injection eval suite in CI**: fixture conversations where fenced email content attempts tool invocation, data exfiltration via send/draft args, and scope escalation — asserts the gate blocked or forced confirmation. Runs against the chat route with a mocked model where feasible, prompt-level asserts otherwise `[tool: /testing-patterns]`
- [ ] 5.5.8 **Token custody note in canon**: after Phases 1+4, Salt holds ZERO provider OAuth tokens (native Gmail encrypted-token custody retired; Composio is sole token custodian; API keys already pass through without storage). Least-privilege scopes reviewed per auth config at provisioning. Document in the security model + `docs/architecture/security-model.md` `[tool: —]`

### Phase 6: Schema modernization (folded from 2026-07-02 plan; renames AFTER retirements)
- [ ] 6.1 B-Batch4: backfill person/org ids on remaining `client_id` tables from mapping columns; access-log trigger one release; drop `clients` `[tool: /database migration]`
- [ ] 6.2 ~~Phase C rename `client_emails`~~ CANCELLED per Decision 1 — replaced by: migrate/retire remaining `client_emails` readers (conversations inbox) per open question 1, then drop table + `email_file_attachments` decision `[tool: —]`
- [ ] 6.3 Rename `client_meetings` → `meetings`: migration (constraints/indexes/RLS incl. 2026-06-30 set) + code sweep (~60 sites, now smaller post-1.1/1.2/4.3) + types regen + meetings E2E `[tool: /database migration + /webapp-testing]`
- [ ] 6.4 Rename `project_files` → `files`: entity_links backfill from legacy FK columns (keeper Phase 4 store is live), switch legacy-fallback readers, rename + drop `client_id`/`project_id` columns, RLS recreate, sweep (~16 files) `[tool: /database migration]`
- [ ] 6.5 Rename `projects` → `work` (the big one): inventory refresh at execution time; rename + 18 inbound FK constraints + ~9 RLS + 2 triggers + ~7 functions + compat views; `project_id` → `work_id` columns ride along one owning table per PR; ~55-file sweep; field-registry generics update; full E2E `[tool: /database migration + /webapp-testing]`
- [ ] 6.6 Endgame: fold `project_retainers` into `work` retainer columns; `project_milestones`→`work_delivery_milestones`, `work_milestones`→`work_payment_milestones`; drop all compat views (`studio_*` et al.) at zero references `[tool: /database migration]`

### Phase 7: Batch-enable connectors
- [ ] 7.1 Sweep the former `PHASE_2_CONNECTORS` list through the new machinery: sync already has them; provision auth configs (batched via `/connector`), classify tools in the review queue, flip tiers `[tool: /connector]`
- [ ] 7.2 Promote first new capture adapters by demand (candidates: Slack, QuickBooks, Calendly) — each is one adapter file + conformance fixtures `[tool: —]`
- [ ] 7.3 Docs: `docs/architecture/connector-platform.md` (sync/classification/ingestion contracts), update `app/_lib/composio/CLAUDE.md`, connector brief in `brand-identity/product-internal/features/` `[tool: —]`

## Ask Salt Integration & Security Model (added 2026-07-03)

The security posture in one sentence: **one gate, fail closed, previews for anything that mutates, and untrusted content can never steer a mutation without a human tap.**

| Layer | Rule | Where enforced |
|---|---|---|
| Token custody | Composio holds all provider tokens; Salt stores none (post Phases 1+4). API keys pass straight to Composio, never Salt's DB | Provisioning + retirements |
| Tool availability | unclassified = unusable; approved classifications ∩ connected toolkit ∩ workspace policy | Gate (DB lookup, fail closed) |
| Risk classes | read = auto; mutating = preview + approve (trust ladder can earn auto per provider); destructive = never via AI | Gate |
| Execution context | unattended/background = read-only tools only (existing rule) | Gate |
| Prompt injection | connector content fenced + labeled untrusted; mutating args derived from untrusted spans force confirmation regardless of trust; CI injection evals | Chat context builder + gate + CI |
| Blast radius | per-workspace per-class rate limits; burst anomaly → provider drops to ask-first + play card | Gate + rate-limit lib |
| Accountability | every execution audited (`workspace_tool_executions`) with consent provenance, surfaced in Activity | Gate + Activity |

Scalability rule for chat: context cost is **constant** in connector count — pinned core tools for head toolkits + `search_connector_tools` discovery + one generic validated executor. Adding connector #4000 changes nothing about the chat route.

**Trust model at scale (decided 2026-07-03): per-integration, with inherited defaults and earned upgrades — never a global act-without-approval switch.**
1. *Workspace default posture* (one setting): new connections inherit it; default = always ask. Connecting connector #47 requires zero trust decisions.
2. *Per-integration override*: the existing `read_only → act_with_approval` ladder + per-integration mutation styles (Gmail draft/send). Users reason about trust per account; blast radius differs per provider.
3. *Per-tool floor* (platform-owned): risk classes + workspace disabledTools. Trust can never override a risk class — act_with_approval still can't reach destructive.
4. *Earned autonomy (the scaling mechanism)*: trust upgrades are PROPOSED from the `workspace_tool_executions` approval streak per integration (ask-first play card, one-tap, consent provenance), and auto-DOWNGRADED on rejection or rate-limit anomaly. Users never browse 100 toggles; the override list only contains integrations they deliberately promoted. GROW applied to the platform itself.
Gate resolution order: tool risk class → disabled tools → integration trust → workspace default → ask.

## Files to Create/Modify (representative)

| File | Action | Purpose | Tool |
|------|--------|---------|------|
| `supabase/migrations/*_connector_platform_core.sql` | Create | Catalog/tools/classifications/overrides tables + seed | /database migration |
| `app/_lib/composio/catalog-sync.ts` + cron route | Create | Composio catalog sync + drift diff | — |
| `app/_lib/composio/actions.ts` | Modify | Gate reads DB classifications, fail closed | — |
| `app/_lib/composio/providers.ts`, `connector-manifest.ts`, `tool-policy-registry.ts`, `connector-catalog.ts` | Delete/gut | Replaced by synced tables + overrides | — |
| `app/api/webhooks/composio/route.ts` | Create | Single trigger ingress (HMAC, route by slug) | — |
| `app/_features/capture/adapters/{types,gmail,calendar,stripe,drive,cal}.ts` | Create | CaptureEnvelope adapters + deriveSignals | /testing-patterns |
| `app/_features/capture/adapters/__fixtures__/` | Create | Golden payloads for conformance harness | /testing-patterns |
| `app/_features/capture/services/{gmail,calendar,stripe,drive}-ingestion.ts` | Delete | Replaced by generic ingestor + adapters | — |
| `app/_lib/gmail/`, `app/_lib/recall/`, `app/_lib/calcom/`, `app/_lib/transcription/fireflies-client.ts`, `app/_lib/vercel/domain-manager.ts` | Delete | Native retirements | — |
| `app/(settings)/.../ConnectorsCatalog.tsx` + review queue surface | Modify/Create | DB-driven catalog + classification queue | /frontend-design |
| `supabase/migrations/*_rename_*.sql` (meetings/files/work waves) | Create | Folded schema modernization | /database migration |

## Verification & Acceptance

1. **Classification fail-closed test**: an unclassified tool slug can never execute (unit on the gate); parity test proves today's allowlist survives the DB move exactly.
2. **Conformance harness green per adapter**: golden fixtures → envelope contract asserts; an adapter cannot ship without fixtures.
3. **Drift drill**: simulate a removed/renamed slug in a sync run → classification auto-disabled + alert row exists (test with a fixture snapshot diff).
4. **Ingestion round-trip E2E**: fire a fixture trigger payload at the webhook route → capture_events row → resolver ran → provenance row exists.
5. **Rename waves**: post-push `information_schema`/`pg_constraint` assertions per migration; embedded-join rg sweeps recorded in each PR; full E2E per wave (Anti-Drift Protocol).
6. **Marginal-cost proof (the point of the plan)**: enabling one new action-only connector = zero code changes (auth config + review-queue clicks). Demonstrate on one Phase-7 connector and record the steps taken.
7. **Security drill**: single-gate test (no execution path bypasses `executeComposioAction`), injection eval suite green (fenced content cannot trigger or steer a mutation without confirmation), and a manual red-team pass — send yourself an email containing tool-invocation instructions, confirm Ask Salt surfaces it as content, never as action.

## Open Questions

1. **Conversations reads on frozen `client_emails`**: acceptable to leave the inbox reading a frozen table until the conversations memory-type rebuild, or should the surface be hidden at Gmail-native retirement? (Affects 1.4/6.2 timing.)
2. **Cal.com trigger coverage**: does the Composio `cal` toolkit expose booking-created triggers, or does Cal ingestion ride the reconciliation cron? (Verified in 4.1 before native deletion — native stays until the adapter is proven.)
3. **`email_file_attachments`**: retire with the native pipeline, or keep as the attachment store for capture-hydrated content?

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Composio trigger delivery gaps (missed events) | Reconciliation cron per capture connection; envelope dedupe keys make replays idempotent |
| One project-level webhook URL is a single point of failure | HMAC verify + fast-ack + queue-style processing in the route; alert on sustained 4xx/5xx from Composio dashboard side |
| Catalog sync brings in 120k tools | Sync toolkits shallowly; deep-sync tools only for tiered providers; long tail stays catalog_only rows |
| Deleting native Cal.com before Composio parity | 4.1 verifies trigger coverage first; native deleted only after adapter passes conformance + a live booking test |
| Classification queue becomes a bottleneck | By design (earned autonomy); LLM pre-fill + batch approve keeps throughput at ~50/session |
| DB-driven policy weakens the safety model | Enforcement stays code + fail-closed default; classifications carry provenance; destructive class still never executes |
| Rename waves conflict with connector work | Hard sequencing: Phase 6 starts only after Phases 1–4 merge (smaller sweeps, no moving targets) |
| Migration ledger lies (recorded, not executed) | Post-push schema assertion per phase (inherited iron rule) |
