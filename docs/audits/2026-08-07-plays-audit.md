# Audit: Plays — 2026-08-07

> Read-only audit run after the Sources / Memory / Plays reorg (`aed93f36`), Memory Care replacing Keeper (`8e31e8a0`, `c5642b3f`), and the v1 playbook stack removal (`06d484c5`). Product law under audit: **plays are where all actions live; every play that runs has a playbook; memory mutation and connector intake are no longer plays.**

## Verdict

**Drifting, with one trust-critical defect.** The surface itself is healthy — clean read path, race-safe approval action, tenant guards, no `any`/`ts-ignore`, and the three-tab structure matches the docs. But the reorg's product law is **not enforced anywhere in code**: 6 of 13 run-creation paths stamp no playbook at all, 4 more stamp slugs that don't exist in the registry, and the UI silently falls back to retired demo-player data when a run has no playbook. The worst instance is user-facing: first-scan creates "Approve & send" cards that, when approved, only log — nothing sends. Beyond that, ~31 files are dead (v1 schema root, the entire ProfilePlaybook* component family, orphaned appliers, 6 playbook YAML packages the loader never reads), and `docs/architecture/playbooks.md` plus two brand briefs describe systems that no longer exist.

> **Process note:** another session was modifying the tree during the audit (`playbooks/learning/approve-proposal.ts` was deleted mid-scan). Coordinate before any cleanup.

## Inventory

184 files in `app/_features/plays`, consumed by **106 external files** across 14 features (ask-salt, capture, hq, memory, people, work, billing, orgs, and more). The de-facto public API is much bigger than "the plays page."

| Area | Role | Health |
|---|---|---|
| `actions.ts`, `queries.ts`, `load-plays-page-data.ts` | Queue approve/reject, tab data, page loader | Alive, healthy |
| `components/` (44 files) + `components/PlayCard/` | Plays surface UI; PlayCard renders queue items | Mostly alive; 12 dead files |
| `play-card/` (lowercase) | Data mappers: DB rows → PlayCardViewModel | Alive except barrel + 1 mapper |
| `playbooks/schema/v2/` | The real playbook engine (parser, executor, discovery) | Alive — crons, capture, ask-salt all route through it |
| `playbooks/schema/` (root, non-v2) | v1 engine | **Entirely dead** |
| `playbooks/records-engine/` | Profile field appliers, provenance writes | Alive but **mislocated** — Memory infrastructure with ~30 non-plays importers |
| `playbooks/v2/` (YAML) | 28 playbook packages; **only 12 register** | 6 packages + capture section never loaded |
| `services/` | signal-scanner, intake/finding run creation, execute-connector-tool, earned-autonomy, first-scan | All alive; intake service arguably belongs to Sources/Memory now |
| Crons | `signal-scan` (every 2h), `playbook-schedules` (hourly), plus capture-intelligence / email-digest via capture | Alive |
| DB | `play_runs`, `activity_entries`, `profile_playbook_settings`, `profile_field_provenance`, ~17 more | `play_runs` has **no playbook column** — attribution lives in JSON `source_context` |

**The 12 registered playbooks** (all `layer: act`): cash-runway, invoice-reminder, payment-received, blocker-watch, resource-activity, meeting-recap, meeting-prep, daily-briefing, email-digest, email-triage, relationship-health, follow-up.

**Two play-card directories, both intentional:** `play-card/` (lowercase) is the data-mapping layer (rows → `PlayCardViewModel`); `components/PlayCard/` is the React rendering layer.

## Drift

### "Every play has a playbook" — no doc states it, no code enforces it

- `playbooks/trigger-dispatch.ts:199-219` — the dispatcher inserts signal-triggered runs **without** `source_context.playbook_slug`, even though it knows the slug (it pushes `playbookSlug` into results at :225).
- `playbooks/schema/v2/executor.ts:856-921` — the v2 engine writes the slug into `trigger_evidence`, but the UI only reads `source_context` (`play-card/map-play-run-to-card.ts:37-39`). Every engine-created run renders unattributed. Only earned-autonomy reads `trigger_evidence.playbook_slug` (`actions.ts:194-197`).
- Phantom slugs stamped on live runs — none exist in the registry, so they render as "Playbook unavailable" error cards (`map-play-run-to-card.ts:42-56,84-88`):
  - `"memory-records"` — `services/create-intake-play-run.ts:128` + 9 sites in `capture/services/system-plays/executor.ts` (:357, :547, :747, :1166, :1276, :1403, :1480, :1594, :1705)
  - `"client-risk"` — `services/create-finding-play-run.ts:88` (live via capture-intelligence cron → `daily-scan.ts:1073`)
  - `"route-signal"` — `services/create-finding-play-run.ts:144` (live via `daily-scan.ts:996`)

### Silent playbook discovery gap

`schema/v2/discovery.ts:145-172` loads only `definition.yaml`; the filename `playbook.yaml` is never read anywhere, and PLAYBOOK.md-only dirs are explicitly skipped. Six shipped packages are **silently invisible** — no validation error, never in `allErrors`:

- `billing/contract-renewal-alert`
- `billing/retainer-billing`
- `relationships/upsell-opportunity`
- `meetings/meeting-preparation` (live `meetings/prep` covers the same concept)
- `work/content-calendar-sync`
- `work/engagement-crisis`

`docs/guides/playbook-troubleshooting.md` doesn't cover this failure mode — its whole premise is "invalid playbooks appear in `allErrors`," but these never reach Zod. Its `value.estimate` error is also inverted: the guide says "must be >= 1" but `schema.ts:109` is `.nonnegative()` ("Allow 0").

### Docs describing removed systems

| Doc | Drift |
|---|---|
| `docs/architecture/playbooks.md` | **Most drifted.** Documents `scripts/run.ts` execution model (:19-24, :126-145), `adoptPlaybookBlueprint` / `play_templates` adoption flow (:157-176), `pnpm playbooks:compile` (:242), `pattern`/`chat` trigger types (:76), a `tools:` definition field (:81-84) — **none exist**. Schema has signal / schedule / manual only (`schema/v2/schema.ts:43-75`). |
| `app/_features/plays/CLAUDE.md` | References `playbooks/execution-router.ts` (:70) and `routing-evals/` (:33) — neither exists (`memory-care.md:102` itself says execution-router is retired). Points to `section-capabilities.ts`, which is dead. "Ten sites" writing `state: 'ran'` (:5) — currently 8 non-test sites. |
| `schema/v2/CLAUDE.md` | Section list includes `capture`, omits `notes` (:35, :47); code is the reverse (`schema.ts:14-24`, `discovery.ts:29-40`). |
| `brand-identity/product/features/plays.md` | Claims four tabs including **Players** (:36-43) — code has three (`load-plays-page-data.ts:18`, `PlaysTabs.tsx:21-23`). Contradicts `feature-inventory.md:113` in the same Lane B layer — per brand rules, flag for human review. |
| `brand-identity/product/features/players-playbook-activity.md` | Canonizes the retired Players model ("every Playbook belongs to exactly one Player", Players tab) as current reality; still linked from `feature-inventory.md:115` with no retirement banner. |
| `docs/architecture/signals.md` | Phantom signal `stripe_payment_succeeded` (:153) — not in any `*_SIGNAL_KEYS` array. Stale counts (:207-218): actual total **191** signals, doc says ~145. The 26-signal `EMAIL_INTELLIGENCE_SIGNAL_KEYS` category (`records-engine/types.ts:506`) is entirely undocumented. References `pnpm playbooks:compile` (:273) — doesn't exist. |
| `docs/architecture/tools.md` | Documents `get_voice_profile` (:278-339) and `notify` (:361-377) tools with no implementation (`app/_lib/voice/` doesn't exist). `memory_update_field` source union missing `"cron"` (`app/_lib/memory-tools/types.ts:23`). |
| `docs/architecture/primitives.md` | Example (:87-101) shows `payment-received` with `layer: learn` comment — the actual file is `layer: act`, and the doc's own :118 says playbooks are act-only. |

**Healthy docs:** root `CLAUDE.md` plays claims (tabs + legacy redirects exactly match `plays-tab-routing.ts:43-72`), `docs/architecture/memory-care.md` (best in set), `feature-inventory.md`'s plays entry, most signal names in `signals.md`, keeper-derived brand docs carry explicit 2026-08-07 reframing notes.

### Reorg boundary drift (code vs. product law)

- **Intake still lands in the plays queue** via two live chains:
  1. Capture enrichment → `enrichment-pipeline.ts:556` → `enrichment/create-decision-processor.ts:58` → `createIntakePlayRun` — every CREATE-tier capture decision becomes a plays queue item.
  2. Memory evidence ingestion → `memory/evidence/actions.ts:178,190,281,293` → `createIntakePlayRun` for suggest-tier records. (The P6-compliant no-play path exists but only covers the auto tier — `memory/evidence/auto-create-record.ts:102`.)
- **Plays actions still execute memory mutations** for legacy queue rows: `actions.ts:463` (`applyMemoryCarePlayRun`), `:548` (`answerMemoryCareQuestionPlayRun`), `:708` (`routePlayRunToProfile`) apply profile fields; `actions.ts:232` (`applyIntakePlayRun`) creates memory records on approval.
- **Memory mutations still written into `play_runs`**: `capture/services/system-plays/executor.ts:1249-1279` (`logAutoHandledMemoryRun`) logs every auto-handled memory mutation as an approved `play_runs` row (slug `memory-records`) — contradicts "Memory Care never creates play_runs" (`memory/care/index.ts:5`, `memory-care.md:127`).
- **memory-monopoly under-enforced**: `playbooks/memory-monopoly.ts:1-16` promises rejection "at parse and at runtime"; actual enforcement is exactly one place — Ask Salt's playbook tool (`ask-salt/playbook-tools.ts:77`). Zero imports in `schema/v2/parser.ts` or `executor.ts`.
- **Reverse coupling**: `plays/services/signal-scanner.ts:14-17` imports signal processors from `capture/services/play-triggers`, which insert playless runs (`play-triggers.ts:290-312`).
- `playbooks/schema/v2/capture-fetch.ts` hard-couples the playbook engine to capture internals (alive — imported by `executor.ts:32` — but a boundary smell).

## Dead code

**31 candidates (24 code + 7 YAML), all verified zero-importer outside their own tests:**

| Cluster | Files | Evidence |
|---|---|---|
| v1 schema root (4) | `playbooks/schema/{executor,parser,types,index}.ts` | 0 importers outside the dir; includes its own stale `play_runs` insert (`executor.ts:203-217`) |
| ProfilePlaybook* family (8) | `components/ProfilePlaybook{Hero,Sidebar,OverviewTab,ActivityTab,RulesTab,RulesEditor,SettingsForm}.tsx` + `utils/profile-rule-display.ts` | 0 importers; `profile-rule-display` only imported by dead `ProfilePlaybookRulesTab` |
| Orphaned profile appliers (3) | `records-engine/apply-{billing,meeting,file}-profile.ts` | 0 importers (person/org/work appliers are alive). Deleting also orphans their field-key types in `records-engine/types.ts` |
| Orphaned components (4) | `DuplicateMergeReview.tsx`, `PlaysFilterPopover.tsx`, `PlaybookSidebarV2.tsx`, `PlayCard/PlayCardSkeleton.tsx` | 0 importers each |
| Dead barrels & mappers (4) | `play-card/index.ts`, `play-card/map-queue-play-to-card.ts`, `schema/v2/index.ts`, `utils/map-queue-play.ts` | Consumers import files directly; barrels unused |
| Orphaned modules (2) | `section-capabilities.ts` (14 exports), `playbooks/load-playbook-resources.ts` | 0 importers; `PlaybookSectionNav` defines its own `SECTION_COLOR_STYLES` |
| Never-loaded YAML (7) | 6 `playbook.yaml` packages (list in Drift) + `playbooks/v2/capture/_section.yaml` | `playbook.yaml` filename never read; `capture` not in discovery `SECTIONS` array (`discovery.ts:29-39`) |

**Near-dead:** `MemoryPlaybookOverviewTab.tsx` is imported (`PlaybookDetailPageV2.tsx:43,139`) but only renders when `definition.layer === "learn"` — all 12 registered playbooks are `layer: act`, so the branch is unreachable, along with `queries.ts:534` (`getProfilePlaybookSettings`) feeding it.

**Capture side:** `capture/services/pattern-scanner.ts` (`runPatternScans`) — exported from the barrel, never called; also inserts playless runs (:331-349).

**Legacy canon: clean.** No `bridge`/`studio` references; `/table` hits are HTML `<table>` false positives; remaining `keeper` hits (~15) are intentional legacy-data provenance fallbacks with explanatory comments.

**Records-engine clarification:** Memory Care did *not* replace the records-engine. `write-provenance.ts` has 10+ non-plays importers (people/orgs/work/me/billing/workspace-settings actions, capture system-plays, ask-salt); `load-profile-playbook.ts` and the person/org/work appliers are consumed by capture's resolvers and Memory. It is shared Memory infrastructure that happens to live under plays — relocating it is a Memory-feature refactor, not a plays cleanup.

## Risks

1. **HIGH — Approve-but-nothing-happens.** `services/first-scan.ts:103-118` (live via Composio OAuth callback, `_lib/composio/connections.ts:429-432`) inserts hardcoded `FALLBACK_PLAYS` with `draft_body`, `channel: "Gmail"`, no playbook, no source_context. They render as "Approve & send" acting cards (`map-play-run-to-card.ts:238-240,293`), but approval hits the log-only branch (`actions.ts:265-289` — "Approved (logged — this play has no pre-approved actions to execute)"). **The user approves a send that never sends** — the exact trust failure plays exist to prevent; same class as the bug documented in `resume-paused-playbook.ts:9-15`.
2. **HIGH — Runtime-broken Ask Salt tool, masked by untyped admin client.** `ask-salt/capture-review-tools.ts:132-148,449-461` inserts columns that don't exist on `play_runs` (`playbook_slug`, `trigger_type`, `trigger_capture_id`, `created_by`, `context`) — fails at runtime (PGRST204). It compiles because `_lib/supabase/admin.ts:21` returns a client **without the `Database` generic**, disabling type safety for every admin call site in the app.
3. **HIGH — Unattributed engine runs.** The executor/trigger-dispatch write the slug to the wrong JSON field, so the trust story — "this play came from this playbook" — is broken for the very runs the real engine creates. The UI falls back to retired demo-player data in a production path (`map-play-run-to-card.ts:2,138-139,258-267` imports `_lib/demo/plays-demo-data`); `utils/queue-section.ts:43-44` buckets playless runs into "work" by default.
4. **MED — Six invisible playbooks.** Shipped YAML silently never loads; anyone enabling "contract renewal alert" work will debug a ghost.
5. **MED — Boundary erosion.** Intake and memory mutations still flow through plays (chains cited in Drift); without an enforced "playbook required" invariant, new playless paths will keep appearing.
6. **LOW — Convention nits.** Ad-hoc `{ success, error }` returns instead of `ActionResult` (`actions.ts:463,548,708,825`); admin client queried inside a component file (`TrustDashboard.tsx:152-167`); realtime hook direct DB access (`hooks/usePlayRunsRealtime.ts:29` — conventional); dynamic inline styles (`PlaybookHeroV2.tsx:65`, `ApproveCelebration.tsx:115,122,147` — mostly justified animation/gradient values). No `any`, `as any`, `@ts-ignore`, or `@ts-expect-error` anywhere under `app/_features/plays/`.

**Happy paths verified healthy:** read path (`app/(product)/plays/page.tsx` → `PlaysPage` → `load-plays-page-data.ts` → `queries.ts`, all server-side with workspace scoping) and mutation skeleton (`actions.ts:141` `approvePlayRun` — atomic claim :157-163, tenant-guarded, DI-injected resume path, consent-scoped tool execution via `execute-connector-tool.ts:31`, metering via `meter-play.ts`).

## Recommended actions (priority order)

1. **[S] Fix the first-scan trust bug** — make first-scan plays real playbook-backed drafts or stop rendering them as "Approve & send." Smallest change, biggest trust payoff.
2. **[S] Standardize playbook attribution** — one canonical location (`source_context.playbook_slug`), written by executor + trigger-dispatch, read by UI and earned-autonomy. This is the enforcement point for "every play has a playbook."
3. **[S] Rename the 6 `playbook.yaml` files → `definition.yaml`** (or delete if intentionally shelved) and make discovery loudly report skipped packages.
4. **[M] Delete the 31 dead files** — after coordinating with the concurrent session; deleting the 3 appliers also allows pruning their field-key types in `records-engine/types.ts`.
5. **[S] Type the admin client** (`admin.ts:21`, add the `Database` generic) — immediately surfaces the broken capture-review insert and any others like it.
6. **[M] Register or retire the phantom slugs** (`memory-records`, `client-risk`, `route-signal`) — decide whether intake/findings are plays with real playbooks or don't belong in the queue at all. **Product decision — interview input.**
7. **[M] Relocate `records-engine/` out of plays** — Memory infrastructure with ~30 external importers. A move, not a deletion; pairs with the Memory workstream.
8. **[L] Documentation pass** — rewrite `docs/architecture/playbooks.md`; banner/retire the two brand play briefs; fix `plays/CLAUDE.md` phantom files, `schema/v2/CLAUDE.md` section list, `signals.md` counts + email-intelligence category, `primitives.md` example, `tools.md` aspirational tools, and the troubleshooting guide's inverted error + silent-skip gap. Best done **after** the interview settles what plays canonically is.

## Open questions for the plays interview

The code currently answers "sort of" to all of these:

- Are intake approvals (record creation from captures/evidence) plays, or do they belong to Sources/Memory surfaces?
- Is an Ask Salt tool approval (human-in-chat) a play? It creates a playless run today (`_lib/composio/ask-salt-tools.ts:232` via `lib/play-record.ts:226-249`).
- Are intelligence findings (`client-risk`, `route-signal`) plays with real playbooks, or a different primitive?
- Should auto-handled memory mutations appear in `play_runs` for transparency, or in a Memory-owned log?
- Where should the "every play has a playbook" invariant live — insert-time check, DB constraint, or both?
