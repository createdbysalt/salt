# Audit: Memory Records & Rules — 2026-08-07

**Scope:** Memory records (people, orgs, work, billing, meetings, files, me), the Memory Care rules that create and enrich them, the Filter surfaces (Watching / Handled / Kept out), dead code from the plays/sources/memory reorganizations, and coupling between memory and sources/plays.
**Status:** Read-only audit. No fixes applied.
**Goals being audited against:** Consistent, Trustworthy, Scalable. Memory should feel like Salt organizing the business in the background — no permission queues, full transparency, teachable over time.

---

## Verdict

The memory system is **architecturally sound but half-populated**. The skeleton is right: all entity types share one evidence table (`entity_evidence`), one learning digest (`salt_learnings`), one correction log (`correction_events`), one edge store (`entity_links`), and one decision pipeline with tiered confidence bars. But the rules feeding that skeleton are lopsided: enrichment effectively serves people and orgs only, meetings and files have zero fill rules, and the scheduled workspace scan is hardcoded to two tables. Watching surfaces diagnostics ("I couldn't connect X to an organization yet") instead of evidence accumulating toward concrete candidates. Kept out is a Sources/capture concern rendered inside Memory. The correction loop records lessons but never feeds them forward. Reorganizations left verified dead code and cross-feature entanglement.

---

## 1. The Watching problem (root cause)

**Symptom:** Watching shows items like "Jane Example — I couldn't connect Lisa to an organization yet." It reports what Salt *cannot* do instead of what it is accumulating evidence *for*.

**Trace:**

1. Hygiene capability finds "orphan" records (person with zero org links, work with null org) via `get-orphan.ts` and emits `_link_candidate` evidence **without searching for a candidate org** — no `targetId`, no `targetName`, just `{ reason: "orphan" }` — `app/_features/memory/care/capabilities/hygiene.ts:119-133`.
2. The copy is hardcoded for the no-candidate case at `app/_features/memory/utils/learning-story.ts:156`:
   `` `I couldn't connect ${entityLabel} to an organization yet.` ``
3. The Watching query (`app/_features/memory/queries/learning-evidence.ts:180-431`) applies **no filter** requiring a concrete proposed value or valid target. Any unresolved evidence row surfaces.

**Deeper gap — link evidence cannot accumulate toward a candidate:**

- Regular fields do this correctly: multiple signals proposing the same `fieldPath + proposedValue` stack confidence (`learning-evidence.ts:364-366`) and show a progress bar toward the auto-apply bar.
- Meta candidates (`_link_candidate`, `_merge_candidate`, `_archive_candidate`) are parsed with `bar: null` (`learning-evidence.ts:381-382`), so `LearningCard.tsx:439` never renders a progress bar. Watching can never show "leaning toward Org X, 2/3 evidence."

**Fix shape (for future plan, not applied):** capabilities emit `_link_candidate` only with a concrete resolved target (candidate search via `memoryGetSimilarRecords`); no-candidate orphan detection stays internal (or feeds a completeness metric), never the user-facing Watching list; meta candidates get the same value-keyed confidence stacking regular fields have.

---

## 2. Kept out is a Sources concern (confirmed)

- Data source: `capture_events` where `gate_action IN ('noise','drop','held')` — `app/_features/memory/queries/admission-decisions.ts:105-167`.
- Reasons come from the capture gate pipeline (`app/_features/capture/services/gates/*`): blocklist, bulk-mail headers, admission scoring. `extractGateReason()` reads `gate_result` JSON (`admission-decisions.ts:53-72`).
- The only Memory tie: "actually, let this in" (`moveKeptOutToWatching()`, `admission-decisions.ts:19`) sets `gate_action = 'candidate'`, moving the item to Watching.
- The blocklist is already capture infrastructure: `capture_blocklist` table, managed by `capture/actions/blocklist.ts`, enforced in `gates/workspace-blocklist-gate.ts` — but its UI lives in Memory → Rules (`BlocklistManager` in `RulesTab.tsx:236-245`).

**Implication:** Kept out (and the blocklist UI) belong on Sources as the intake audit trail. Memory → Filter should be about memory decisions: Watching + Handled.

---

## 3. Per-entity coverage (the parity gap)

Fill-rule counts in `app/_features/memory/taxonomy/field-registry.ts`: **work 25, org 16, person 15, billing 14, meeting 1, file 0, me 26** (me has rules but no automated trigger path).

| Capability | person | org | work | billing | meeting | file | me |
|---|---|---|---|---|---|---|---|
| Records enrichment (fill rules) | ✅ 15 | ✅ 16 | ✅ 25 | ✅ 14 | ⚠️ 1 rule (status only) | ❌ 0 rules | ⚠️ 26 rules, no trigger |
| Scheduled workspace scan | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Connections inference | ✅ person↔org via email domain | ⚠️ target only | ❌ | ✅ payment match | ✅ attendee links | ❌ | ❌ |
| Hygiene: duplicates | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Hygiene: stale detection | ✅ | ✅ | ❌ | ⚠️ | ⚠️ `updated_at` only | ❌ | ❌ |
| Field tiers (safety bars) | ✅ | ✅ | ✅ | ✅ | ❌ not tierable | ❌ not tierable | ⚠️ no sensitive fields |
| Capture → auto-create | ✅ | ✅ | ⚠️ detect only | ✅ invoice detection | ❌ detect only | ❌ detect only | ⚠️ field extraction only |
| Ask Salt intake create | ✅ tier 2 | ✅ tier 1 | ✅ tier 3 | ✅ tier 4 | ✅ tier 3 | ✅ tier 2 | ✅ tier 1 |
| Memory-tools write support | ✅ full | ✅ full | ✅ full | ⚠️ links only | ⚠️ links only | ⚠️ links only | ⚠️ fields only |

### Key evidence

| Finding | File:Line |
|---|---|
| `runRecordsForWorkspace` queries **only** `people` and `organizations` — the scheduled cron never enriches work, billing, meetings, or files | `care/capabilities/records.ts:260-292` |
| Records capability self-describes as "people, org, work, and billing" — meetings/files excluded by design; even that claim overstates the scan | `care/types.ts:37` |
| Meeting fields: 13 defined, only `status` is `care_auto`, only `meetingType` has a fill rule. Attendees, location, transcript: zero rules | `taxonomy/field-registry.ts:1387-1564` |
| File fields: 15 defined, **zero** fill rules — classifier detects MSA/NDA/contract/proposal/SOW/receipt but nothing enriches file records | `taxonomy/field-registry.ts:1184-1386`; `evidence/classifier.ts:203-403` |
| Connections capability switch covers person / meeting / billing; work, file, me hit `default: skipped` | `care/capabilities/connections.ts:67-79` |
| `memoryGetSimilarRecords` has branches for person/org/billing only | `app/_lib/memory-tools/get-similar.ts:65-78` |
| `memoryGetStale` covers person/org only | `app/_lib/memory-tools/get-stale.ts:46-89` |
| `TieredEntityType` = person, organization, work, billing, me — meeting and file cannot be tiered (no sensitive/never-touch enforcement) | `app/_lib/learning/field-tiers.ts:32-37` |
| Me record has empty `SENSITIVE_FIELDS` — business-model fields default to standard bar | `field-tiers.ts:56-62` |
| Email classifier emits person/org/file/billing signals but **no meeting signals**; detected file/meeting signals have no creation path (intake parity broken — Ask Salt can create all six) | `evidence/classifier.ts:15-196`; `care/intake/index.ts:22-44` |
| Notes capability synthesizes notes but never enriches parent records | `care/capabilities/notes.ts:26-60` |

### DB-level parity

All entity types share `entity_evidence`, `salt_learnings`, `correction_events`; `entity_links` covers everything except me. Gaps:

| Feature | people | orgs | work | billing | meetings | files | me |
|---|---|---|---|---|---|---|---|
| `profile_field_provenance` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `lifecycle_events` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Trash (`deleted_at`) / archive | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `record_status` (active/inactive) | ✅ | ✅ | ❌ | ❌ (own 7-value enum) | ❌ | ❌ | ❌ |
| `entity_links` support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

Schema modernization is otherwise clean: Keeper vocabulary retirement complete (`20260807080000` — enum renamed to `memory_evidence_type`, provenance values normalized to `care`, threshold column renamed to `memory_care_auto_apply_threshold` with zero stale app references); table renames (`projects` → `work`, `client_meetings` → `meetings`, `project_files` → `files`) completed `20260704*` with compat views pending final drop.

---

## 4. Filter data flows (reference)

| Pill | Source | Query | Notes |
|---|---|---|---|
| Watching (evidence) | `entity_evidence` unresolved | `queries/learning-evidence.ts:180` | No filter on empty proposed values; meta candidates lack targets (see §1) |
| Watching (captures) | `capture_events` `gate_action='candidate'` | `queries/admission-decisions.ts` | Works correctly |
| Handled (writes) | `salt_learnings` `undone_at IS NULL`, 14-day window | `queries/handled-items.ts:61-116` | — |
| Handled (admitted) | `capture_events` `gate_action='signal'` | `queries/admission-decisions.ts` | — |
| Kept out | `capture_events` noise/drop/held, 7-day window | `queries/admission-decisions.ts:105-167` | Sources concern (§2) |

**Rules tab today:** 4 capability toggles (`profile_playbook_settings`, slugs `memory-*`, legacy `keeper-*` read fallback, missing row = enabled — `care/settings.ts:54-83`), threshold slider 50–100 default 85 (`workspaces.memory_care_auto_apply_threshold`), blocklist (capture-owned, see §2). No per-field overrides, no per-capability weighting, no custom rules.

---

## 5. The trust loop hole (corrections don't recalibrate)

"That's wrong" on a Handled item: rolls back via `memoryRollbackField()`, records `correction_events`, applies a confidence penalty to **pending** evidence on the same entity+field (`app/_features/me/actions/corrections.ts:204-240`; penalties: quick_undo 10, structured 30, conversational 40, diminishing).

What's missing:

- Penalties never feed forward — future classifier runs, capability scoring, and the decision pipeline do not read `correction_events`. Hygiene re-emits the same orphan at full confidence next run.
- No re-application guard: a corrected write re-applies if fresh evidence crosses the bar again.
- Rollback silently no-ops when provenance is missing (`actions/handled-items.ts:50-57`).

This is the largest gap between the product promise ("teach the system over time") and the code.

---

## 6. Drift (docs vs code)

| Doc claim | Reality | Evidence |
|---|---|---|
| memory-care.md: records keeps "people, org, work, and billing" complete | Workspace scan covers person/org only | `records.ts:260` vs `care/types.ts:37` |
| Six memory entity types (`MEMORY_ENTITY_TYPES`) | Field tiers support five; meeting/file untierable | `types/entity-type.ts:19` vs `field-tiers.ts:32` |
| database-schema.md: `client_meetings`/`projects` renames "pending" | Completed 2026-07-04 (`20260704*`) | migration series |
| database-schema.md | No section on `capture_events → capture_routing_decisions → entity_evidence` admission pipeline; `correction_events` undocumented | — |
| database-schema.md | Work status enum (6 values) vs billing status enum (7 values) mismatch unnoted | — |

---

## 7. Dead code (importer counts verified)

| Candidate | Evidence | Action |
|---|---|---|
| `memory/utils/emit-learning-signal.ts` | 0 importers (verified by rg) — pre-Care signal stub | Delete |
| `intelligence/generators/hygiene-generator.ts` | Imported only by `hygiene-actions.ts` | Delete |
| `intelligence/actions/hygiene-actions.ts` | 0 importers (verified) — never wired to any route/cron/UI | Delete |
| `plays/playbooks/learning/approve-proposal.ts` (`synthesizePlaybookImprovementProposal`, `approvePlaybookImprovementProposal`) | @deprecated v1 stubs; only callers are themselves-unreachable server actions | Delete |
| `proposePlaybookImprovement` / `approvePlaybookImprovement` in `plays/actions.ts` | 0 importers | Delete |
| `CAPABILITY_SPECS` export in `memory/capabilities/readiness.ts` | Internal-only | Un-export/inline |
| All `keeper*` code references | Read-side fallbacks for historical rows (settings slugs, provenance display, tag normalization). No new code writes keeper-*. | **Keep** — intentional |
| `/spaces/*` redirect pages | 308 redirects to `/work` | Keep — intentional |

---

## 8. Coupling (memory ↔ sources/plays)

### Clean, load-bearing boundaries (keep)

- Capture → memory single handoff: `capture/services/ingest-envelope.ts:5` → `processCaptureForEvidence`.
- Signal routing: `plays/playbooks/trigger-dispatch.ts:6` → `runCareForSignal` (learn layer first, act layer second).
- Records-engine writes route through `processCareProposal` (`plays/playbooks/records-engine/write-provenance.ts:9`).
- **`play_runs` verified clean:** nothing under `memory/care` writes `play_runs`.
- Activity separation: care rows use `metadata.source: "memory-care"`, filtered out of Plays Activity.

### Entanglement (fix)

| Issue | Files | Fix direction |
|---|---|---|
| Memory UI imports Plays components (`PlaysSectionHeader`, `PlaysTabEmptyState`, `getSectionColorStyles`) | `FilterTab.tsx:5-6`, `WatchingSection.tsx:7`, `RulesTab.tsx:14`, `HandledSection.tsx:6`, `TrashPage.tsx:3`, `LearningCard.tsx:25`, `connections/MemoryGraphPage.tsx:4` | Extract to `@repo/patterns` |
| Memory borrows Plays types (`ActionResult`, `ProfileFieldKey`/`ProfileEntityType` from records-engine) | `memory/actions/profile-field-actions.ts:7,15` | Field vocabulary → `app/_lib/learning/`; `ActionResult` → shared lib |
| Capture reaches into memory internals (field-registry, classifier utils, `createSaltNote`) | `capture/services/intelligence/apply-field-extractions.ts:30`, `daily-scan.ts:53`, `note-extractor.ts:10-16`, `persist-extracted-notes.ts:9-17`, `system-plays/executor.ts:32` | Route through memory-tools / move shared types to `_lib/learning` |
| Ask Salt creates notes directly | `ask-salt/memory-tools.ts:6,8` | Route through memory-tools bridge |
| Care settings live in `profile_playbook_settings`; care scheduled by `playbook-schedules` cron | `care/settings.ts:61`, `care/actions.ts:83`, `app/api/cron/playbook-schedules/route.ts:25` | Acceptable interim; consider dedicated settings table + neutral cron naming later |
| Plays imports memory UI (`ProfileActivityTimeline`, `memory-layout`) | `plays/components/ProfilePlaybookActivityTab.tsx:4`, `PlaybookDetailPageV2.tsx:40` | Acceptable (memory is canonical); revisit if generalizing |

### Product-philosophy tension (needs founder decision)

`memory/evidence/actions.ts:18` routes evidence-threshold **record-creation** suggestions into `plays/services/create-intake-play-run.ts` — new-record proposals become Plays Queue items. Defensible as "record creation is an act," but it is an approval-queue shape inside the memory flow, which contradicts the no-permission-queue goal. Decide deliberately: either record creation follows the same confidence-tiered auto-apply + Handled correction model as field writes, or it is explicitly classified as act-layer.

---

## 9. Risks (ranked)

1. **High — Watching erodes trust daily.** No-candidate diagnostics presented as work-in-progress (`hygiene.ts:119`, `learning-story.ts:156`). First impression of the feature reads as "what Salt can't do."
2. **High — corrections are write-only.** Teach-the-system loop doesn't recalibrate anything (`corrections.ts:204-240`); mistakes recur at full confidence.
3. **High — scheduled enrichment silently skips most entity types** (`records.ts:260`). Background organization is only true for contacts.
4. **Medium — capture detects meetings/documents but never creates records**; parity with Ask Salt intake broken; real signal dropped.
5. **Medium — meeting/file fields aren't tierable** (`field-tiers.ts:32`), so extending enrichment to them today has no safety net.
6. **Low — me record lacks sensitive-field policy** (`field-tiers.ts:56-62`) despite holding business-model fields.

---

## 10. Recommended actions (priority order)

| # | Action | Size | Serves |
|---|---|---|---|
| 1 | **Candidate-only Watching**: emit `_link_candidate` only with concrete resolved target; suppress no-candidate orphans from UI; remove "couldn't connect" copy branch | M | Trustworthy |
| 2 | **Link-evidence accumulation**: meta-candidates get field+value confidence stacking and progress display | M | Trustworthy, Transparent |
| 3 | **Close the correction loop**: pipeline + capabilities read `correction_events`; standing penalty/cooldown per corrected entity+field; re-application guard | M | Teachable |
| 4 | **Extend workspace scan** beyond people/orgs — work first (25 rules exist), then billing, meetings, files | M | Consistent, Scalable |
| 5 | **Move Kept out + blocklist UI to Sources**; Memory Filter = Watching + Handled | S/M | Consistent |
| 6 | **Delete verified dead code** (§7) | S | Scalable |
| 7 | **Meeting/file parity**: add to `TieredEntityType`, write fill rules, wire classifier signals → intake-tier record creation | L | Consistent, Scalable |
| 8 | **Decouple** (§8): field vocabulary → `_lib/learning`, shared UI → `@repo/patterns`, capture via memory-tools | M | Scalable |
| 9 | **Doc fixes**: memory-care.md coverage claims; database-schema.md admission pipeline + correction_events + completed renames | S | — |

Items 1–3 are the trust package. Items 4 + 7 are the whole-business-brain package. Item 8 is feature separation.

---

## Method note

Audit produced from five parallel codebase investigations (entity coverage, Filter data flows, dead code, coupling, database layer) on branch `feat/capture-pipeline` at commit `06d484c5`, plus manual verification of dead-code importer counts. File:line references are accurate as of this commit and will drift.
