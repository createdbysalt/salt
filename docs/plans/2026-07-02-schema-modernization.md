# Plan: Schema Modernization — Consolidate `clients`, Rename Legacy Tables

> **SUPERSEDED 2026-07-03** by `.cursor/plans/2026-07-03-connector-platform.md` (Phase 6 there folds in this plan's remaining work). Key changes: Phase C (`client_emails` → `email_messages`) is CANCELLED — the native Gmail pipeline retires instead (Composio triggers become the only ingestion); Cal.com migrates to Composio (so A.4's `meeting_types` → `calcom_event_types` rename becomes a retirement); Fireflies, Recall.ai, and Vercel Domains retire. Completed phases (A, B0, B Batches 0–3, drop list) remain the historical record here.

**Date:** 2026-07-02
**Status:** Superseded — remaining phases live in `.cursor/plans/2026-07-03-connector-platform.md`
**Supersedes:** the schema-cleanup phases (0–2) of `docs/plans/2026-07-02-me-files-tab.md`
**Sequencing:** execute AFTER `.cursor/plans/2026-07-02-keeper-field-contracts.md` lands (that branch touches `projects`, `client_meetings`, and `project_files` throughout; running both concurrently guarantees conflicts)

## Context

The DB schema still speaks Bridge-era language while the product speaks Salt: `client_meetings` is the live Meetings table, `projects` backs the Work surface, `project_files` backs Files, and a legacy `clients` table runs **in parallel with** the current `people` table. The original me-files-tab plan proposed dropping the `client_*` family as "orphaned test data" — verification on 2026-07-02 proved every one of those tables is load-bearing (details below). This plan replaces "drop it" with the correct sequence: consolidate duplicates, then rename in dependency order, one atomic PR per phase.

**Iron rules for every phase:**
1. One rename/consolidation = one atomic PR: migration + all code edits + `database.types.ts` regen + E2E run in the same merge.
2. Renamed tables KEEP their old constraint/index names (bit this repo twice — see `workspace_integrations` incident). Every rename migration must also rename constraints/indexes or document the stale names.
3. PostgREST embedded joins (`project:projects(...)`, `projects!inner(...)`) break on rename and don't show up in `.from()` greps — search select strings too.
4. Live RLS policies, triggers, functions, and views referencing the old name must be recreated in the same migration.
5. Verify DDL actually ran remotely after push — the migration ledger has lied before (`20260626120000` was recorded applied with no columns created; repaired 2026-07-02).

## Research Summary (verified 2026-07-02, two very-thorough codebase sweeps)

**Why nothing can be dropped as-is:**

| Table | Reality |
|---|---|
| `clients` | ~60 call sites / ~25 files: relationships actions, intake, onboarding, spaces/portal queries, meeting creation (`create-meeting.ts:48`), recall webhook, intelligence generators. Runs in parallel with `people`. |
| `client_users` | AUTH-CRITICAL: `app/_lib/tenancy/context.ts:139,386` + `app/api/auth/callback/route.ts:69`. Dropping it breaks login. 26 call sites (messaging, contacts, dev-login). |
| `client_emails` | Gmail sync writes every synced email (`app/_lib/gmail/sync.ts:202,256,308`); inbox + send-client-email read it. 23 call sites. |
| `client_meetings` | IS the Meetings feature table (~60 call sites): all `app/_features/meetings/` actions, Cal/Fireflies/Recall webhooks, HQ dashboard. RLS hardened 2026-06-30; keeper work added `address`/`phone_number` 2026-07-02. |
| `client_activity_events` | 2 call sites (`send-client-email.ts:1224,1295`). Smallest surface. |
| `client_announcements` | 13 call sites (relationships actions, spaces queries). |
| `client_intakes` | 16 call sites (intake feature, knowledge, proposal generator). |
| `client_knowledge_base` | 4 call sites incl. Fireflies/Recall webhook inserts. |
| `project_retainers` | 3 call sites in `work/actions/retainers/retainer-actions.ts`. |

**`client_id` columns** on conversations, intelligence_events, intelligence_queue, knowledge_items, onboarding_checklists, projects, project_files: all read AND written today (e.g. `intelligence_queue` insert at `queue-actions.ts:149`, email attachments at `send-client-email.ts:366`, Gmail sync at `sync.ts:723`).

**Rename blast radius:**
- `projects` → `work`: 70 `.from("projects")` occurrences in 41 files + ~13 files with embedded-join strings only; 18 tables hold FKs to `projects(id)`; ~9 RLS policies, 2 triggers, ~7 functions, compat views reference it by name. ~55 app files total.
- `project_files` → `files`: 43 occurrences in 14 files + embedded joins. ~16 app files.
- `clients` → cannot be renamed to `people`: **the `people` table already exists** and is the primary store. This is a consolidation, not a rename.

## Naming Canon (decided 2026-07-02)

Target state: table names speak current product language — Memory records + workspace scoping — with zero era prefixes.

**Rules:**
1. **Memory record tables = the sidebar product nouns, plural**: `people`, `organizations`, `work`, `billing_records`, `files`, `meetings`, `conversations`, `notes`. Me = `profiles` (identity) + `workspaces` (business) + `operator_*` satellites.
2. **Child/satellite tables = `<parent-singular>_<thing>`**: `meeting_transcripts`, `work_milestones`, `file_tags`, `play_runs`, `space_links`.
3. **Workspace-scoped config = `workspace_*`** (already the convention).
4. **Graph/provenance infra = `entity_*`**; `entity_links` is the one explicit-edge store (keeper Phase 4 retires `entity_relations`).
5. **Era prefixes banned for new tables**: `client_*`, `studio_*`, `portal_*`, `bridge_*`.
6. **Rename mechanics (the `studios` precedent)**: rename table + constraints + indexes **+ columns** in one migration, leave a compatibility VIEW under the old name (views can alias old column names too), sweep code in the same PR, drop the view one release later. (`studio_*` compat views over `workspace_*` tables exist today and get dropped in the final phase.)
7. **Integration/plays plumbing is named by provider or domain, never like a record**: `gmail_*`, `calendar_*`, `workspace_integrations`, `workspace_tool_executions`, `billing_webhook_events`. Synced artifacts use a domain family (`email_messages` + `email_file_attachments`) — emails flow INTO memory via capture; they are not a memory record themselves.
8. **Column renames ride along**: when a table renames, its FK columns elsewhere rename in the same wave (`project_id` → `work_id`), one owning table per PR.

**Full offender → target map** (126 real tables audited; `studio_*` are views, not tables):

| Current | Target | Mechanism |
|---|---|---|
| `client_meetings` | `meetings` | Rename |
| `client_emails` | `email_messages` | Rename (integration domain; pairs with `email_file_attachments`) |
| `projects` | `work` | Rename (biggest sweep) |
| `project_files` | `files` | Rename + legacy FK columns → entity_links |
| `project_members` | `work_members` | Rename (or retire — spaces decision) |
| `project_milestones` | — | Consolidate into existing `work_milestones` (duplicate pair) |
| `project_retainers` | — | Fold into `work` retainer columns |
| `retainer_time_entries` | `work_time_entries` | Rename |
| `clients` | — | Consolidate into `people`/`organizations`, then drop |
| `companies` | — | Consolidate into `organizations` (legacy duplicate) |
| `client_intakes` | — | RETIRE (Bridge; decided 2026-07-02) — remove intake feature reads/writes, drop |
| `client_knowledge_base` | — | RETIRE (Bridge) — delete duplicate Fireflies/Recall webhook inserts (transcripts already land in `meeting_transcripts`/`meeting_summaries`), drop |
| `client_announcements` | — | RETIRE (Bridge) — remove spaces portal-announcement reads, drop |
| `client_activity_events` | — | RETIRE (Bridge) — remove 2 send-client-email writes, drop |
| `client_users` | — | RETIRE (Bridge; NOT renamed to workspace_users — collides semantically with `workspace_members`) — migrate tenancy/auth reads off first, then drop; external access is Spaces' job (`space_participants`) |
| `portal_*` (6 tables) | — | RETIRE (Bridge; Stripe Connect already retired) — verify unreferenced, drop |
| `calendar_connections` | — | Consolidate into `workspace_calendar_connections` (duplicate pair) |
| `service_items` | — | Consolidate into `workspace_services` (projects-era duplicate) |
| `meeting_types` (table) | — | Retire — meeting types are a registry vocabulary now |
| `teams` | keep | Live Memory surface (decided 2026-07-02) |
| `team_members` | — | RETIRE — team membership becomes `entity_links` person↔team edges (unified graph) |
| `tasks` | — | RETIRE (audit remaining readers first) |
| `studio_*` views + `studio_mrr` | — | Drop in final sweep once unreferenced |

Everything else already conforms (`capture_*`, `play*`/`playbook_*`, `intelligence_*`, `space_*`, `ask_salt_*`, `operator_*`, `billing_*`, `meeting_*` children, `workspace_*`, `entity_*`).

Three duplicate pairs from unfinished consolidations (`project_milestones`/`work_milestones`, `calendar_connections`/`workspace_calendar_connections`, `companies`/`organizations`) should merge EARLY — before more code reads the wrong copy.

## Implementation Plan

> Each phase is its own PR. Order matters: consolidation first (renaming a table whose semantics are about to change is wasted motion), then renames smallest-risk-first, auth-critical last.

### Phase Pre-0: Environment truth (HARD precondition — no destructive phase runs before this)
- [x] Pre-0.1 **VERIFIED 2026-07-02 — assumption was wrong.** Vercel production AND preview `NEXT_PUBLIC_SUPABASE_URL` point at `ejuobmbpwbinmfqyxhrn` (the stale project), as does `pnpm dev:op` (1Password item `supabase`). Only `dev:staging` + `supabase db push` hit `nbapomfgcsrsqdvenqmf`. Consequence: ~3 weeks of migrations never reached the DB the deployed app uses; production surfaces querying new columns (addresses, AI summaries, ICP) error against it. Both DBs hold ONLY test data (old project idle since 2026-06-10; 0 billing records/notes there).
- [x] Pre-0.2 **RESOLVED (founder, 2026-07-02): staging-first policy.** All schema work (including drops) lands on the CLI-linked project (`nbapomfgcsrsqdvenqmf`); production comes over LATER as a cutover step — either a fresh production project created from the full migration set (recommended; both DBs hold test data only, and the new project never has Bridge tables) or promoting the staging project. The stale `ejuobmbpwbinmfqyxhrn` is never caught up — it retires at cutover. This de-gates the drop list.
- [ ] Pre-0.3 Confirm PITR/backup posture on `nbapomfgcsrsqdvenqmf` before any DROP executes; note the restore procedure in this plan
- [x] Pre-0.4 Deploy choreography note: every rename applies to the LIVE db while old app code is still deployed — the compat view IS the bridge; migration push and app deploy happen back-to-back, view drops one release later

### Phase A: Retire Bridge portal features (DECIDED 2026-07-02: retire all)
- [x] A.1 Founder decision: `client_intakes`, `client_knowledge_base`, `client_announcements`, `client_activity_events`, `portal_*`, and portal logins via `client_users` are Bridge-era — **retire all** (no migration into Spaces)
- [x] A.2 Execute retirements (2026-07-02: 17.5k lines dead code removed; portal reads migrated to billing_records; zero portal_*/client_knowledge_base/client_announcements/client_activity_events/tasks/team_members references remain in app/), one PR per feature: delete the live readers/writers (intake feature actions, duplicate Fireflies/Recall knowledge-base inserts, spaces announcement reads, send-client-email activity writes, portal billing code), then drop tables `[tool: rg + /database migration per table]`
- [x] A.3 client_users retired (2026-07-02: reachability-proven dead clientUser actor path removed from tenancy/auth callback/messaging/dev-login; smoke-verified signin+tenancy on dev server; full login E2E before deploy recommended): migrate tenancy resolution (`app/_lib/tenancy/context.ts`) and auth callback off it, verify login E2E, then drop `[tool: /pragmatic-code-review + /webapp-testing]`
- [x] A.4 Code retired for team_members/tasks/meeting_types UI (2026-07-02). CORRECTION: meeting_types table is LIVE integration plumbing (Cal.com event-type sync writes it via calcom-sync) — reclassified: keep, rename to calcom_event_types in a later rename wave, not retired: `team_members` (membership → `entity_links` person↔team edges), `tasks` (audit readers first), `meeting_types` table (registry vocabulary replaced it)

### Phase B0: Merge the duplicate pairs (AUDITED 2026-07-02 — outcome differs from assumption)
- [x] B0.1 `project_milestones` vs `work_milestones`: **NOT duplicates.** project_milestones = delivery/timeline milestones (title, due_at, depends_on, client_visible; read by HQ dashboard + inbox); work_milestones = PAYMENT milestones (amount_cents, percent, invoice_ref, paid_at; work feature). Both stay; in the Phase F rename wave they become `work_delivery_milestones` and `work_payment_milestones` respectively
- [x] B0.2 `calendar_connections`: ZERO code references (live code uses `workspace_calendar_connections`) — added to the gated drop list
- [x] B0.3 `companies`: ZERO code references — added to the gated drop list (verify no rows worth porting when the drop executes)
- [x] B0.4 `service_items`: ZERO code references — added to the gated drop list
- [x] B0.5 `meeting_types`: reclassified (see A.4) — LIVE Cal.com sync table; rename to `calcom_event_types` in a rename wave

**Drop list EXECUTED 2026-07-02** (`20260702170000_drop_bridge_tables.sql`, staging-first policy; rows exported to `.backups/pre-drop-*` first — all empty except one client_users test row): client_users, client_intakes, intake_templates, client_knowledge_base, client_announcements, client_activity_events, all six portal_*, tasks, team_members, companies, service_items, calendar_connections, discovery_cache, knowledge_items, client_engagement_stats matview. Table count 126 → 107. **Still pending:** clients (Batch 4 guard), project_retainers (after G.1), studio_* compat views (Phase G.2).

### Phase B: Consolidate `clients` → `people`/`organizations` (port matrix built + Batch 0 executed 2026-07-02)
Mapping keys: `people/organizations.migrated_from_client_id` (modern→legacy) and `clients.migrated_to_person_id/org_id` (legacy→modern, from migration 20260514000200).

- [x] B.1 Full port matrix built (agent inventory 2026-07-02): every remaining `.from("clients")` site classified live/dead with port target
- [x] B-Batch0 **Dead-code deletion executed**: relationships client CRUD, people/actions/clients (except live create-client-from-booking), entire orphaned messaging module (+ConversationsPageClient, dead realtime hooks), onboarding demo actions, /api/clients/list, dead meeting create/complete/cancel + AddMeetingSheet, dead intelligence queue/feed/library actions, DUAL_WRITE_ENTITIES flag + branches, HQ seeder clients writes. **clients refs: 64/28 files → 16/10 files**
- [x] B-Batch1 **Stop minting legacy rows** (needs schema): add `client_meetings.person_id`, `projects.person_id/organization_id`, `project_files.person_id/organization_id`; port capture executor `createClientMeeting` (the last runtime writer of clients rows + migrated_from_client_id!), project-fields resolvers, files resolveClientFromOrg `[interlocks with keeper Phase 4 entity_links + rename FK-column decisions — design the columns once]`
- [x] B-Batch2 Webhook ingestion: create-client-from-booking → people upsert by email; cal webhook, calcom-sync, recall-calendar (match people), gmail sync (person_id on client_emails + project_files)
- [x] B-Batch3 Read-side cleanup: meetings queries join people, HQ insights read people/orgs relationship_status, drop clients fallbacks in work/connections/files queries, health recompute keyed by entity id, strip clientId/migratedFromClientId from view models
- [x] B-Batch4 **EXECUTED 2026-07-03 (founder waived the access-log guard: Bridge fully deleted).** All remaining clients joins/reads ported to person/org (HQ dashboard, inbox, meetings MEETING_SELECT, capture lookups, health signals); migrated_from_client_id fallbacks deleted; gmail sync stopped writing client_id. 20260703160000 dropped the orphaned client_users_view_projects policy + is_client_user_of_client() (function body referenced the dropped client_users table — same class as the auth-trigger bug); 20260703170000 dropped client_id from all 11 carrier tables, migrated_from_client_id from people/orgs, and `clients` itself. Types regenerated clean. Still pending: project_retainers (G.1), studio_* compat views (G.2); teams table dead but kept.

### Phase C: Rename `client_emails` → `email_messages`
- [ ] C.1 Migration: rename table + constraints/indexes + `client_id` column decision (→ `person_id`?) + recreate RLS; compat view `client_emails` `[tool: /database migration]`
- [ ] C.2 Code: Gmail sync, messaging send-client-email, inbox queries, unread hooks (23 sites); types regen; E2E inbox flow `[tool: —, /webapp-testing]`

### Phase D: Rename `client_meetings` → `meetings`
- [ ] D.1 Migration: rename + constraints/indexes (incl. the 2026-06-30 RLS set and `valid_meeting_type` CHECK) `[tool: /database migration]`
- [ ] D.2 Code: meetings feature actions/queries, Cal/Fireflies/Recall webhooks, HQ dashboard, inbox, health signals (~60 sites); embedded joins (`get-meetings`, `get-upcoming-meetings`); types regen; meetings E2E `[tool: —, /webapp-testing]`

### Phase E: Rename `project_files` → `files` + retire legacy FK columns
- [ ] E.1 Precondition: keeper-field-contracts Phase 4 (unified `entity_links` edge store) is live — file links then have a real home `[tool: —]`
- [ ] E.2 Backfill `entity_links` from `project_files.project_id`/`client_id` (client_id targets resolve via `migrated_from_client_id` on people/orgs) `[tool: /database migration]`
- [ ] E.3 Switch the legacy-fallback readers (`files/queries.ts` "legacy client_id/project_id" paths, spaces queries, orgs file counts, connections projections) to entity_links `[tool: —]`
- [ ] E.4 Rename table, drop `client_id`/`project_id` columns, rename constraints/indexes, recreate RLS (`20260623223100` set + `20260630120000` additions) `[tool: /database migration]`
- [ ] E.5 Code sweep (~16 files) + types regen + files E2E `[tool: —, /webapp-testing]`

### Phase F: Rename `projects` → `work` (the big one)
- [ ] F.1 Inventory refresh: regenerate the 41-file `.from("projects")` + embedded-join list at execution time (it will have drifted) `[tool: rg]`
- [ ] F.2 Migration: rename table; rename all 18 inbound FK constraints; recreate ~9 RLS policies, 2 triggers (`trg_update_project_stage_entered_at`, work-types trigger), ~7 functions, compat views `[tool: /database migration]`
- [ ] F.3 Rename `project_id` FK columns to `work_id` everywhere in the same wave (DECIDED 2026-07-02: columns ride along), one owning table per PR; compat views alias the old column names `[tool: /database migration]`
- [ ] F.4 Code sweep (~55 files across 20 features) + types regen + full E2E suite `[tool: —, /webapp-testing]`
- [ ] F.5 Update keeper field-registry generics (`FieldDescriptor<"projects">` → `<"work">`) and taxonomy docs `[tool: —]`

### Phase G: Endgame
- [ ] G.1 `project_retainers`: fold into `work` retainer columns (retainer_mrr_cents etc. already exist); 3 call sites in retainer-actions `[tool: /database migration]`
- [ ] G.2 Drop all compat views (`studio_*`, `studio_mrr`, and every view created by phases C–F) once `rg` shows zero references `[tool: /database migration]`

## Files to Create/Modify (representative)

| File | Action | Purpose | Tool |
|------|--------|---------|------|
| `supabase/migrations/*_consolidate_clients.sql` | Create | Access-log trigger, then drop `clients` | /database migration |
| `supabase/migrations/*_rename_client_emails.sql` | Create | Table + constraint + RLS rename | /database migration |
| `supabase/migrations/*_rename_client_meetings.sql` | Create | Table + constraint + RLS rename | /database migration |
| `supabase/migrations/*_files_entity_links_backfill.sql` | Create | FK → entity_links backfill | /database migration |
| `supabase/migrations/*_rename_project_files.sql` | Create | Rename + drop legacy FK columns | /database migration |
| `supabase/migrations/*_rename_projects_to_work.sql` | Create | Rename + 18 FKs + RLS/triggers/functions | /database migration |
| ~25 files on `clients` | Modify | Port to people/orgs | — |
| ~23 sites on `client_emails` | Modify | Rename sweep | — |
| ~60 sites on `client_meetings` | Modify | Rename sweep | — |
| ~16 files on `project_files` | Modify | Rename sweep + entity_links reads | — |
| ~55 files on `projects` | Modify | Rename sweep | — |
| `app/_lib/supabase/database.types.ts` | Regen | After every phase | — |

## Tool Summary

| Phase | Tools | Purpose |
|-------|-------|---------|
| A | /interview | Portal feature retire-vs-migrate decisions |
| B–G | /database explore, /database migration | Audits + rename/consolidation migrations |
| All | /webapp-testing | E2E per phase (meetings, files, work, inbox) |
| All | /pragmatic-code-review | Review each atomic PR |

## Open Questions

1. ~~Phase A: portal features live or dead?~~ RESOLVED 2026-07-02: all Bridge portal features retire.
2. ~~Phase F.3: rename columns too?~~ RESOLVED 2026-07-02: yes, columns ride along with table renames.
3. Should `conversations.client_id` etc. migrate to person/org references during B, or be dropped as part of each owning feature's cleanup?
4. `client_emails.client_id` → `person_id` mapping during Phase C (needs the B consolidation to resolve targets).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Renamed tables keep old constraint names (hit twice before) | Every rename migration explicitly renames constraints/indexes; post-push verification query against pg_constraint |
| Embedded PostgREST joins missed by `.from()` greps | rg select-string patterns (`:projects(`, `projects!`) in every sweep; full unit + E2E before merge |
| Migration ledger lies (recorded but not executed) | Post-push schema assertion (information_schema check) per phase |
| Concurrent work on the same tables | Hard sequencing: this plan starts only after keeper-field-contracts lands |
| Dropping `clients` while a stray reader remains | Phase B.4 access-log trigger for one release before the drop |
| `files` name collision with Supabase Storage mental model | Acceptable; document in supabase/CLAUDE.md that `files` = app table, Storage buckets are separate |
