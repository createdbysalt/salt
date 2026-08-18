# Sources Feature Module

> **See also:** [Connector System](../../../docs/architecture/connector-system.md) | [Capture Feature](../capture/CLAUDE.md) | [Memory Feature](../memory/CLAUDE.md)

Sources is the intake surface at `/sources` — where Salt learns from. It answers one question: **where does Salt learn from, and what came in?**

## Tabs

| Tab | URL | Content |
|-----|-----|---------|
| **Connectors** (default) | `/sources` | The pipes: connector rail/browse/detail panes, marketplace, OAuth + API-key flows, `ReconnectBanner`, `?connector=<id>` deep-linking |
| **Activity** | `/sources?tab=activity` | The capture stream: day-grouped intake firehose with stats header, source icons, signal badges, gate outcomes, forward links to triggered plays. The Filter popover's "Also show → Kept out" toggle reveals dropped/held rows with verdicts + inline correction actions |
| **Customize** | `/sources?tab=customize` | Intake policy by intake **area** (Email, Calendar, Billing, Storage, Messaging, Meetings, CRM, Projects — the same vocabulary as the Activity area filter): read-only transparency ("What Salt does by default"), area-level gate choices, "Always let in" / "Keep out" rules via a smart parse box. Per-account scope controls (which channel/calendar/folder, event types) live on the connector detail pane under Memory capture — not here. `?category=<area>` deep-links an area (legacy `ConnectorCategory` keys normalize); `?category=all` is the workspace-wide rules view. The connector detail pane links here from its Activity tab header |

`?tab=stream` is a pre-rename (2026-08-06) alias for Activity — keep the alias working in `sources-tab-routing.ts`.

## Customize = intake policy

Sources → Customize is the **intake policy** surface (what reaches the stream — the plumbing). Memory → Customize is **semantic steering** (what Salt looks for in records) — same word family, different layer; don't merge them.

- Areas are the user-facing projection of the engineering `ConnectorCategory` enum: `CATEGORY_TO_AREA` / `AREA_CATEGORIES` / `AREA_LABELS` in `capture/adapters/rule-entities.ts` are the single source (the Activity area filter derives its labels there too). `documents` folds into Storage, `communication` → Messaging, `project_management` → Projects.
- Transparency layer is read-only and honest: seeded upstream filters render live from `connector_trigger_types.capture_trigger_config` via `capture/adapters/default-policy.ts` + the `PROVIDER_ARG_TRANSLATORS` registry (`connectors/utils/activity-format.ts`) — never hardcode filter copy that can drift from the DB. Static curated bullets stay few and categorical.
- The Tell Salt box (`components/TellSaltBox.tsx` + `capture/adapters/parse-rule-input.ts`) never guesses — ambiguous deterministic input rejects with a hint; natural-language sentences go through the metered compile route with a confirm step. The zero-typing path stays Kept Out corrections.
- Rules have three scopes (2026-08-17, migration `20260817120000_connector_rules_area_scope.sql`): provider-scoped (legacy rows, shown tagged), **area-scoped** (`provider NULL + area set` — what area views write; covers every account in the area, including accounts connected later), and workspace-wide (both NULL, editable under "All connectors"). Gate precedence: provider > area > workspace, deny > allow at each scope. Write validation dispatches on scope: provider's category vocabulary, the area's union vocabulary (`ruleEntityOptionsForArea`), or the union vocabulary (`ALL_RULE_ENTITY_TYPES`).

## Kept Out corrections (Connector Rules & Learning, P4)

Kept-out review lives in the **Activity stream** (2026-08-17): **Kept out is
a peer status** in the Filter popover's Status facet (alongside Triggered
Play / No Action / Processing / Error / Watching) — selecting it passes
`state: "kept-out"` to `getCaptureStreamPage`, which scans with dropped/held
rows included and filters to them. A capture is either stream-visible or
kept out, never both, so it is a status, not an inclusion toggle. The
**Display** popover beside Filter also has a "Show kept out" preference
(`includeKeptOut`) that mixes kept-out rows into the current view — they
carry no status, so they bypass the state filter when included this way.
The same rows also surface in a full-history search (2+ chars). Kept-out rows render
demoted with a plain-language verdict badge (no category badge — they are
terminal by design, never "Processing") and carry inline correction
actions (`capture/components/KeptOutCorrectionButtons.tsx`). Each row is
**cause-aware**: its `cause` derives from `capture_events.gate_result`
(`memory/queries/admission-gate-result.ts`, mapped as `gate_cause`) —
`"rule"` when an explicit user rule dropped it, `"heuristic"` otherwise.
Actions differ by cause (`capture/actions/corrections.ts`):

- **Rule-caused** → "Remove keep-out rule" (deletes the matching
  `connector_rules` row) — the rule is the reason, so the fix is the rule
- **Heuristic-caused** → "Let in" (one capture), with the durable options in
  the row's overflow menu: "Always let this … in" (adds an allow rule so
  future events from the same entity skip the hold) and "Add to People"

Watching accept/dismiss and Kept-Out let-in/keep-out also write
`approved`/`rejected` outcomes back to `record_capture_decisions`
(`recordDecisionOutcomeForCapture` in
`capture/services/intelligence/record-capture-outcome.ts`) — without those
writes the auto-apply calibration earn loop could never trigger from real
feedback.

## Architecture

This is a **thin composition feature** — it owns the page shell, tab routing, and data loading, but renders components owned by other features:

- Connectors tab → `app/_features/connectors/components/` (rail, browse pane, detail pane, marketplace)
- Activity tab → `app/_features/capture/components/CaptureStreamTab.tsx` and family
- Customize tab → `SourcesCustomizeTab.tsx` (owned here), rendering policy/rules from capture; `ConnectorScopeSection` lives on the connector detail pane (connectors feature)

```
sources/
├── components/
│   ├── SourcesPage.tsx           # Shell + tab composition
│   ├── SourcesTabs.tsx           # Tab bar
│   ├── SourcesCustomizeTab.tsx   # Intake policy by category (rules UI moved from the pane)
│   ├── RuleInputBox.tsx          # Smart parse box for adding rules
│   └── SourcesPageSkeleton.tsx   # Loading state
├── actions/
│   └── fetch-sources-tab-data.ts
├── hooks/
│   └── useSourcesTabCache.ts
├── load-sources-page-data.ts    # Server-side page data
├── sources-tab-routing.ts       # Tab parsing + URL building
└── sources-tab-data.ts          # Tab data shapes
```

## URL Plumbing

- `connectorsPageUrl()` in `app/_features/connectors/constants.ts` is the single source for the connectors URL — it points here (`/sources`). Command palette, settings redirects, and Ask Salt deep links all derive from it.
- Legacy redirects: `/capture` → `/sources?tab=activity`; `/plays?tab=activity&view=captures` → `/sources?tab=activity`; `/plays?tab=customize&customize=connectors` → `/sources`.

## Boundaries

- **Admission decisions are not here.** What the gate let in / kept out is Memory → Activity (`/memory?tab=activity`). The Sources Activity tab is an event-centric operational log; Memory Activity is record-centric decisions — cross-linked, not duplicated.
- **Connector logic is not here.** Lifecycle, adapters, and health live in `app/_features/connectors/` and `app/_features/capture/` — read `docs/architecture/connector-system.md` before modifying connectors.
