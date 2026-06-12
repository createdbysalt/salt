---
allowed-tools: Read, Glob, Grep, Bash(git log:*), Bash(git diff:*), Bash(ls:*)
description: "Read-only subsystem audit: map the code, find drift from docs, dead code, and risks. One structured report instead of an exploratory Q&A session."
---

# /audit - Subsystem State Audit

On 2026-06-10 alone there were 11 separate "Audit X" sessions (Supabase usage, dead code, connector UI, integration schema, native integrations, settings page, webhook fixes…). This command standardizes them. **Read-only** — it reports, it never fixes.

## Arguments

Invoked with: `$ARGUMENTS` — the subsystem to audit (e.g. `connectors`, `billing`, `auth`, `spaces`, `dead code in app/`).

## Routing — use the specialist when one exists

| Topic | Route to |
|-------|----------|
| Database schema / RLS | `/database audit` |
| Payments / Stripe | `/payment audit` |
| Security posture | `/security-review` |
| UX quality | `/ux-review` |
| Design-system compliance | `/ds-check` |

Anything else (or cross-cutting): proceed below.

## Method

1. **Scope**: locate the subsystem — `app/_features/<x>`, `app/_lib/<x>`, related API routes, migrations, and packages. List the file inventory with one-line roles.
2. **Ground truth check**: compare code against its documentation — relevant `docs/architecture/*`, `docs/guides/*`, `brand-identity/product-internal/features/*`, and nested CLAUDE.md claims. Note every drift (doc says X, code does Y).
3. **Dead code**: exports with no importers (`rg` the symbol), routes nothing links to, feature flags permanently off, legacy `bridge`/`studio`/`table` remnants (retired canon).
4. **Data flow**: trace one happy path end to end (UI → server action → DAL → DB) and flag violations of the Non-Negotiables (DAL bypasses, missing `Result<T,E>`, inline styles, `any`).
5. **Recent churn**: `git log --oneline -15 -- <paths>` — what's actively changing, any half-finished migrations.

## Report format

```
# Audit: <subsystem> — YYYY-MM-DD
## Verdict (one paragraph: healthy / drifting / needs work)
## Inventory (file → role, table)
## Drift (doc vs code, each with file:line)
## Dead code (candidates with evidence — importer count)
## Risks (severity-ranked, each with file:line and why it matters)
## Recommended actions (priority order, each sized S/M/L)
```

Print the report in the conversation. Only write it to `docs/` if the user asks for a durable copy.
