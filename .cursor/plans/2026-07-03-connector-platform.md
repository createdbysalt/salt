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
- [x] 3.4 COMPLETE (2026-07-04, feat/connector-platform-phase3b): gmail-ingestion.ts RETIRED — bootstrap/backfill now `gmail-backfill.ts`: `fetchGmailMessagesPage` (paginated GMAIL_FETCH_EMAILS, page_token/nextPageToken verified against live tool schema, max 500/page) → adapter → ingestEnvelope; adapter extended for fetch-row shape (preview object, schema-verified fixture); bootstrap People discovery ported to envelopes (90d window now paginated, cap 500/query); Sync & Scan demoted to dev-build-only debug button; dead GmailMessage noise helpers + gmail-messages normalizer deleted. REMAINING (moved to deploy checklist): live trigger payload smoke once deployed (replace synthesized trigger fixtures)
- [x] 3.5 DONE (2026-07-04, feat/connector-platform-phase3b): googlecalendar/googledrive/stripe adapters + fixtures + conformance green; `connector-backfills.ts` (gated executeComposioAction → adapter → ingestEnvelope) replaces the three bespoke services — which were DEAD (raw v2 fetch bypassing the gate, wrote nonexistent enum values `google_calendar`/`google_drive` and nonexistent `external_id` column; capture_events empty on both DBs). Harness relaxed to allow empty triggerSlugs for reconciliation-only sources. **Trigger slugs verified + wired 2026-07-04 (key recovered): calendar GOOGLECALENDAR_GOOGLE_CALENDAR_EVENT_CREATED_TRIGGER (poll, flat snake_case payload handled), drive GOOGLEDRIVE_FILE_CREATED_TRIGGER (poll, nests file object), stripe STRIPE_INVOICE_PAYMENT_SUCCEEDED_TRIGGER (webhook, body-wrapped event handled); drive backfill widened with schema-verified q/orderBy/pageSize. GMAIL_EMAIL_SENT_TRIGGER exists but skipped (no labels in payload — sent mail rides reconciliation).**
- [x] 3.6 DONE (2026-07-04): `/api/cron/capture-reconciliation` (every 6h, CRON_SECRET) sweeps capture_enabled+is_active connections through the provider backfills over short overlap windows (gmail 2d/calendar 7d/drive default/stripe 20); per-connection failures isolate; dispatch + isolation unit-tested. Sync & Scan demoted to dev-build-only debug button (done in 3.4 commit)
- [x] 3.7 DONE (2026-07-04): `hydrate-capture.ts` — transient full-body fetch via GMAIL_FETCH_MESSAGE_BY_MESSAGE_ID (gated, unattended) for envelope captures during the intelligence scan (≤25/run, snippet fallback, never persisted); retention stance written into `docs/architecture/connector-platform.md` (canon doc started; 7.3 extends it)

### Phase 4: Cal.com → Composio capture adapter
- [x] 4.1 DONE (2026-07-04): trigger coverage verified — `cal` toolkit exposes ZERO trigger types; bookings poll CAL_LIST_BOOKINGS (approved read classification confirmed in seed) via backfill + reconciliation cron. Provider key = `cal` (live workspace_integrations row confirms). Note: connector-capabilities maps CAL_* → "calcom" for the mutating trust ladder — pre-existing key mismatch vs provider "cal", flagged for 5.5
- [x] 4.2 DONE (2026-07-04): `adapters/cal.ts` (uid dedupe key, handles v2 booking + webhook-era startTime/organizer spellings, declines cancelled) + `cal-booking-processor.ts` — state-based upsert on cal_booking_id covers create/reschedule/cancel in one pass; findOrCreatePersonFromBooking reused unchanged. Wired into connect-time bootstrap + reconciliation cron
- [x] 4.3 DONE (2026-07-04): native retired — `app/_lib/calcom/`, cal webhook, calcom callback, calcom-sync cron + calcom-sync.ts, orphaned `_features/booking` module, dead env keys (CALCOM_*, Gmail Pub/Sub, Recall, calendar-token) removed from .env.example. Evidence: prod's one native integration produced ZERO client_meetings ever. `20260704030000_drop_meeting_types.sql` authored (guard pattern, timestamp verified free both ledgers + branches, row exports in .backups/pre-drop-meeting_types-*; prod 12 rows) — **NOT pushed, rides the release**

### Phase 5: Signal derivation layer + long-tail extraction
- [x] 5.1 DONE (2026-07-04): `CaptureAdapter.deriveSignals(envelopes, ctx) → Map<email, PersonSignals>`; PERSON_SIGNAL_KEYS runtime registry set enforced by conformance harness. gmail = true bidirectional/you_initiated from direction + email_count + last_email_date (replaces freq>1 approximation); calendar/cal = has_calendar_meeting; stripe = has_stripe_payment/has_payment_received (settled) + has_invoice_sent. Backfills absorb via resolvePerson (existing admission machinery, 50 contacts/run cap); reconciliation keeps signals fresh `[tool: —]`
- [x] 5.2 DONE (2026-07-04): `generic-signal-extractor.ts` — injected-LLM mapping of adapter-less envelopes → PERSON_SIGNAL_KEYS; registry-bounded validation, anti-hallucination (observed emails only), and `RecordsInput.signalsInferred` caps admission at needs_confirmation (ask-first only, unit-tested vs the auto-create path). Wire-up = absorbDerivedSignals fallback, lands with first long-tail capture source (7.2) `[tool: —]`
- [x] 5.3 DONE (2026-07-04): `reprocessCaptureWindow(workspaceId, provider, {lookbackDays, maxItems})` in capture-reconciliation.ts — paginated fetch → adapter → ingest → signal absorption; dedupe idempotent, absorption runs on duplicates so new playbook fill-rules see history without local replay. Canon doc updated `[tool: —]`

### Phase 5.5: Ask Salt tool surface + safety hardening (depends on Phase 2 classifications)
- [x] 5.5.1 DONE (2026-07-04): the Composio session provides schemas ONLY — ask-salt-tools wrapper delegates execution to `executeComposioAction` (connectionIdByToolkit threaded through the loader; humanApproved=true after in-thread needsApproval). `single-gate.test.ts` source-scans the chat surface: no module but actions.ts touches the raw execute API `[tool: /testing-patterns]`
- [x] 5.5.2 DONE (2026-07-04): (a) pinned preload unchanged for head toolkits; (b) `search_connector_tools` (synced catalog ∩ approved ∩ connected ∩ policy, destructive never advertised); (c) `execute_connector_action` validates against synced input_schema (`input-schema-store.ts` + `json-schema-validate.ts`, fail closed) then calls the gate — gate's own validation falls back Zod→synced-schema for long-tail slugs. Mutations via generic executor blocked pending approval (5.5.3 adds preview UX). NOTE: meta-tools return empty until the catalog sync cron populates connector_tools `[tool: —]`
- [x] 5.5.3 DONE (2026-07-04): pinned tools already had full-argument preview cards + Approve/Deny (needsApproval). Extended to the generic executor: `execute_connector_action` needsApproval resolves the DB risk class (unknown = approval required); the card unwraps and previews the INNER tool's args by slug. Post-approval passes humanApproved to the gate `[tool: /frontend-design]`
- [x] 5.5.4 DONE (2026-07-04): chat system prompt now carries UNTRUSTED_CONTENT_SYSTEM_SECTION. Argument-provenance backstop is structural today — every chat mutation requires an in-thread tap with full-argument preview at any trust level; span-level provenance tracking deferred to earned-autonomy (when auto-execution becomes possible) `[tool: —]`
- [~] 5.5.5 PARTIAL (2026-07-04): gate-level per-workspace per-risk-class sliding-window limits SHIPPED (mutating 30/h, read 600/h; in-memory burst brake; limit hits blocked + audited). REMAINING: burst-anomaly auto-downgrade (pause provider to ask-first + play card) — needs the trust-settings write path; rides the earned-autonomy machinery `[tool: —]`
- [x] 5.5.6 DONE (2026-07-04): logToolExecution mirrors successful mutating executions into activity_entries ("Salt ran X", action=ran) with consent provenance per source (Ask Salt approval / play pre-approval / background); metadata carries slug+provider+risk+approver. Reads/blocked stay out of the feed; full trail in workspace_tool_executions `[tool: /frontend-design]`
- [x] 5.5.7 DONE (2026-07-04): `injection-evals.test.ts` — prompt layer (untrusted section in chat system), approval layer (registry-wide sweep at maximal trust: every mutating tool keeps needsApproval, destructive never registers), preview layer (injected bcc surfaces verbatim, incl. via generic executor). Model-level red-team (malicious email to self) = manual release drill per Verification #7 `[tool: /testing-patterns]`
- [x] 5.5.8 DONE (2026-07-04): security-model.md updated — single-gate section (actions.ts as THE execution gate, enforced by single-gate.test.ts) + "Provider token custody" section (zero OAuth tokens post Phases 1+4, Composio sole custodian, API keys pass-through, identity-only sign-in scopes) `[tool: —]`

### Phase 6: Schema modernization (folded from 2026-07-02 plan; renames AFTER retirements)
- [x] 6.1 DONE 2026-07-03 (executed early, rode the keeper branch — see schema-mod plan B-Batch4): founder waived access-log guard; `20260703160000` dropped orphaned client_user policy/function, `20260703170000` dropped `client_id` from 11 carrier tables + `migrated_from_client_id` + `clients` itself; zero `.from("clients")` refs remain (verified 2026-07-04 reconcile) `[tool: /database migration]`
- [x] 6.2 DONE (2026-07-04, feat/schema-phase6): ~~Phase C rename~~ CANCELLED per Decision 1 — inbox is a multi-source aggregator, so open question 1 resolved as "retire the source, keep the surface": getUnreadEmails + markAsRead/Unread client_emails branches deleted (HQ inbox keeps conversations/proposals/meetings/milestones/SEO sources); email InboxItem type kept (generic UI, refills at conversations rebuild). `20260704040000_drop_client_emails.sql` authored (guard pattern) dropping client_emails + email_file_attachments (zero refs — open question 3 resolved: retire; capture hydration is transient, never persisted) + `project_files.source_email_id`; types hand-trimmed pending regen at push. **NOT pushed — rides the release with row exports** `[tool: —]`
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
2. **Cal.com trigger coverage**: ANSWERED 2026-07-04 — `GET /api/v3/triggers_types?toolkit_slugs=cal` returns ZERO trigger types. Cal ingestion rides the reconciliation cron polling CAL_LIST_BOOKINGS.
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
