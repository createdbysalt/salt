# Sources Feature Module

> **See also:** [Connector System](../../../docs/architecture/connector-system.md) | [Capture Feature](../capture/CLAUDE.md) | [Memory Feature](../memory/CLAUDE.md)

Sources is the intake surface at `/sources` — where Salt learns from. It answers one question: **where does Salt learn from, and what came in?**

## Tabs

| Tab | URL | Content |
|-----|-----|---------|
| **Connectors** (default) | `/sources` | The pipes: connector rail/browse/detail panes, marketplace, OAuth + API-key flows, `ReconnectBanner`, `?connector=<id>` deep-linking |
| **Activity** | `/sources?tab=activity` | The capture stream: day-grouped intake firehose with stats header, source icons, signal badges, gate outcomes, forward links to triggered plays, **plus Kept Out section + BlocklistManager** (P11 move from Memory) |

`?tab=stream` is a pre-rename (2026-08-06) alias for Activity — keep the alias working in `sources-tab-routing.ts`.

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

```
sources/
├── components/
│   ├── SourcesPage.tsx          # Shell + tab composition
│   ├── SourcesTabs.tsx          # Tab bar
│   └── SourcesPageSkeleton.tsx  # Loading state
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
