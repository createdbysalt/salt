# Weekly Briefing — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

One Monday brief covering cash, sales, pipeline, the week ahead, and the
top to-dos. Degrades gracefully with zero connectors by leaning on Memory
fetches (blocked work, quiet clients) that need no connector at all.

## Decisions

- **Lives in `me`, not `billing`.** The brief is the operator's surface,
  not a cash report — Cash Forecast owns the deep money view; this play
  cites it in one or two sentences and moves on.
- **Schedule trigger, Monday 08:00.** The cron is the one knob that
  matters — a Friday variant is a workspace fork away, not a second
  near-identical package.
- **Agent step verifies the calendar, not the whole brief.** Memory
  fetches are already trusted; the calendar is the volatile source
  (cancellations), so that's where verification buys accuracy.
- **Always ships.** A quiet week still gets a brief — the habit is the
  product. The only failure mode is a section silently missing, which the
  PARTIAL verdict + estimate marking exists to prevent.

## Edge cases

- **No connectors at all**: all four fetches are optional or Memory-based;
  the agent returns PARTIAL and the brief ships from Salt's records.
- **Nothing notable**: the brief still ends with top-N to-dos (outreach
  to quiet clients is always available).
- **Stale receivables**: agent drops invoices paid since the rollup ran so
  the brief never asks the owner to chase money already collected.

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| full-week | no | Happy path: all sources verified, brief ships |
| quiet-week | yes | No meetings/receivables → brief still ships, outreach-focused |
| no-connectors | yes | Calendar+billing down → PARTIAL, degraded brief, no dropped sections |
