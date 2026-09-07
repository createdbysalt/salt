# Customer Pulse — author notes

> Author-only doc. The user-facing Overview is generated from
> definition.yaml — keep the definition truthful and this file for context
> that doesn't belong in the product: intent, trade-offs, edge cases.

## Intent

Aggregates feedback into themes with a "do these three things this week"
list. Reads the inbox rather than a ticketing tool — for a solo service
professional, email IS the support desk.

## Decisions

- **Schedule trigger (Friday 16:00), not signal-driven.** Pulse is a
  rhythm, not a reaction — the weekly cadence is what turns anecdotes into
  trends. Per-email reactions belong to Complaint Response.
- **Agent gathers AND analyzes in one bounded step.** There is no Memory
  capability for "recent client threads", and a connector category fetch
  returns raw lists without sentiment. The verdict line keeps quiet weeks
  quiet — the near-miss that matters most is a fabricated report.
- **Classify step reads the agent's answer text** (`text ~= 'angry'`).
  Classify rules can test fetched/agent output fields; here the agent's
  natural-language summary is the input, which keeps sentiment judgment in
  the prompt (where the why can be explained) instead of in brittle rules.
- **Output briefing, approval auto.** The report is internal; nothing
  leaves the app. Responses to complaints are a separate play
  (complaint-response) with its own human gate.

## Edge cases

- **Quiet week** (no client threads): QUIET verdict → no output. The
  absence of a pulse IS the pulse.
- **Newsletter/receipt noise**: the gather prompt excludes non-client
  mail explicitly; the classify step never sees it.
- **One angry big client, no theme**: reported as a one-off that matters —
  the prompt calls out that a big client's single grumble outranks a
  small-client theme.
- **Inbox disconnected**: agent says what it couldn't read; if that means
  no conversations at all, QUIET with the reason stated.

## Eval coverage

| Scenario | Near-miss? | What it locks in |
|----------|-----------|------------------|
| complaint-theme | no | Happy path: recurring complaint → themed report with names |
| all-positive | no | Praise week still ships a short, honest pulse |
| quiet-week | yes | No client conversations → quiet end, no fabricated report |
