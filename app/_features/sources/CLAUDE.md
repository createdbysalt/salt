# Sources Feature Module

> **See also:** [Connector System](../../../docs/architecture/connector-system.md) | [Capture Feature](../capture/CLAUDE.md) | [Memory Feature](../memory/CLAUDE.md)

Sources is the intake surface at `/sources` — where Salt learns from. It answers one question: **where does Salt learn from, and what came in?**

## Tabs

| Tab | URL | Content |
|-----|-----|---------|
| **Connectors** (default) | `/sources` | The pipes: connector rail/browse/detail panes, marketplace, OAuth + API-key flows, `ReconnectBanner`, `?connector=<id>` deep-linking |
| **Activity** | `/sources?tab=activity` | The capture stream: day-grouped intake firehose with stats header, source icons, signal badges, gate outcomes, forward links to triggered plays, **plus Kept Out section + BlocklistManager** (P11 move from Memory) |
| **Customize** | `/sources?tab=customize` | Intake policy by intake **area** (Email, Calendar, Billing, Storage, Messaging, Meetings, CRM, Projects — the same vocabulary as the Activity area filter): read-only transparency ("What Salt does by default"), per-account scope controls, "Always let in" / "Keep out" rules via a smart parse box. `?category=<area>` deep-links an area (legacy `ConnectorCategory` keys normalize); `?category=all` is the workspace-wide rules view. The connector detail pane links here from its Activity tab header |

`?tab=stream` is a pre-rename (2026-08-06) alias for Activity — keep the alias working in `sources-tab-routing.ts`.

## Customize = intake policy

Sources → Customize is the **intake policy** surface (what reaches the stream — the plumbing). Memory → Customize is **semantic steering** (what Salt looks for in records) — same word family, different layer; don't merge them.

- Areas are the user-facing projection of the engineering `ConnectorCategory` enum: `CATEGORY_TO_AREA` / `AREA_CATEGORIES` / `AREA_LABELS` in `capture/adapters/rule-entities.ts` are the single source (the Activity area filter derives its labels there too). `documents` folds into Storage, `communication` → Messaging, `project_management` → Projects.
- Transparency layer is read-only and honest: seeded upstream filters render live from `connector_trigger_types.capture_trigger_config` via `capture/adapters/default-policy.ts` + the `PROVIDER_ARG_TRANSLATORS` registry (`connectors/utils/activity-format.ts`) — never hardcode filter copy that can drift from the DB. Static curated bullets stay few and categorical.
- The Tell Salt box (`components/TellSaltBox.tsx` + `capture/adapters/parse-rule-input.ts`) never guesses — ambiguous deterministic input rejects with a hint; natural-language sentences go through the metered compile route with a confirm step. The zero-typing path stays Kept Out corrections.
- Rules are provider-scoped or workspace-wide (`provider NULL`, editable under "All connectors") — **no category- or area-scoped rules in v1**, no `connector_rules` migration. Server-side write validation still uses the provider's own category vocabulary (`ruleEntityOptionsForCategory`).

## Kept Out corrections (Connector Rules & Learning, P4)

The Kept Out section is **cause-aware**: each item's `cause` derives from
its `capture_events.gate_result` (`memory/queries/admission-gate-result.ts`)
— `"rule"` when an explicit user rule dropped it, `"heuristic"` otherwise.
Actions differ by cause (`capture/actions/corrections.ts`):

- **Rule-caused** → "Remove keep-out rule" (deletes the matching
  `connector_rules` row) — the rule is the reason, so the fix is the rule
- **Heuristic-caused** → "Let this in" (one capture), "Always let this in"
  (adds an allow rule so future events from the same entity skip the hold),
  "Add to People"

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
- Customize tab → `SourcesCustomizeTab.tsx` (owned here), rendering `ConnectorScopeSection` from connectors and policy/rules from capture

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
