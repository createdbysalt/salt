# Admin Ops (Founder Dashboard)

The `/ops` hub is Salt's internal operations surface: read-only platform health for the founder, gated by `PLATFORM_ADMIN_EMAILS`. It exists so that **platform-level problems surface to the operator, not to users**.

> **Design rule:** user-facing UI shows *user-actionable states* ("reconnect Gmail", "retry analysis"). Platform-ops signals (dead Composio slugs, playbook discovery failures, capture pipeline stubs, cross-tenant spend, raw vendor errors) belong here. If a user can't fix it, it doesn't belong in their UI.

## Routes

| Route               | Contents                                                                 | Gate               |
| ------------------- | ------------------------------------------------------------------------ | ------------------ |
| `/ops`            | Dashboard KPIs, signup trend, vendor spend (feature detail lives on the feature pages) | `getPlatformAdmin` |
| `/ops/connectors` | Connectors overview — adoption KPIs, gate posture, connections by provider | `getPlatformAdmin` |
| `/ops/connectors/review` | Tool classification review queue (read/write classification)      | `getPlatformAdmin` |
| `/ops/connectors/health` | Slug canary results + webhook ingress outcomes (`?canary=failed` triage view) | `getPlatformAdmin` |
| `/ops/captures`     | Capture pipeline detail — stub backlog, 7d volume, source/gate distributions | `getPlatformAdmin` |
| `/ops/memory`       | Memory Care health — applies vs user undos, corrections by field         | `getPlatformAdmin` |
| `/ops/plays`        | Playbook library discovery health (validation errors, structural skips)  | `getPlatformAdmin` |
| `/ops/users`        | Users overview — trial-first pulse (signups, funnel, plan mix, churn)    | `getPlatformAdmin` |
| `/ops/users/prospects` | Pre-account pile (`waitlist_leads`) + qualification mix               | `getPlatformAdmin` |
| `/ops/users/people` | Account directory — plan, status, usage, Stripe link                     | `getPlatformAdmin` |

Not in the product nav. Reachable only by direct URL; non-admins get `notFound()` (404) — the surface fails closed and is invisible, not just hidden.

## The shell

`/ops` runs in its own route group, `app/(admin/)` — **not** the product shell (`app/(product)/`). Platform ops is not the product: no product nav, no command palette, no workspace context. The group layout (`app/(ops)/layout.tsx`) enforces auth (signed-out → `/signin`) and the founder gate (non-admin → 404) at the shell level, then renders `AdminShell` — the product's sidebar + scrolling `<main>` anatomy (same row anatomy, width, active states, same content container) minus the product topbar (no search / Ask Salt). The sidebar carries ops navigation only: **Dashboard** and **Users**, plus a **Features** accordion (same pattern as the product's Memory nav) grouping feature-level surfaces — **Connectors**, **Captures**, **Memory**, and **Plays** — with **Spend / Audit log** shown disabled as roadmap wayfinding; the footer has the environment badge, the signed-in admin email, and a "Back to app" link. The badge reflects the **Supabase target** (derived from `NEXT_PUBLIC_SUPABASE_URL`, not `VERCEL_ENV`) so local runs tell the truth: `pnpm dev:op` shows **Production**, `pnpm dev:staging:op` shows **Staging**, a local Supabase shows **Local dev**. Desktop-first: the sidebar is the only nav (hidden below `lg`). Page-level sub-views use the pill-tab pattern (`AdminTabs`, same as `MemoryTabs`) — e.g. Connectors growing Review queue / Catalog / Health tabs. Pages keep their own `getPlatformAdmin` checks as defense in depth. The admin surface uses the standard Salt product theme — the distinction comes from the shell, not a separate palette.

## The gate

`app/_lib/ops/platform-admin.ts` → `getPlatformAdmin()`:

- Reads `PLATFORM_ADMIN_EMAILS` (comma-separated) from the environment.
- Compares against the session user's email. No match → `{ ok: false }`.
- Every `/ops` page and every query in `app/_features/ops/queries.ts` checks it independently (defense in depth: page 404s, queries return `null`).
- Admin queries use `createAdminClient()` (service role) for cross-tenant reads. **Never** import these queries into user-facing pages — RLS is deliberately bypassed.

## Sections and data sources

The dashboard (`/ops`) carries platform-wide KPIs, the signup trend, and spend; feature sections live on their feature pages (`/ops/connectors/*`, `/ops/captures`, `/ops/memory`, `/ops/plays`, `/ops/users/*`).

| Section            | Source tables / input                                        | Notes                                                        |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Dashboard          | `profiles`, `workspaces`, `workspace_subscriptions`, `waitlist_leads` | Users, workspaces, 7d signups, waitlist, tier mix            |
| Composio health    | `platform_health_checks`, `workspace_integrations`, `connector_sync_events` | Slug canary (below), connections by provider, webhook outcomes (24h) |
| Capture pipeline   | `capture_events` (`raw_payload->>needs_hydration`)           | Stub counts + source/gate distribution, scan-capped          |
| Memory Care        | `salt_learnings` (`created_at` / `undone_at`), `field_corrections` | Applies vs "That's wrong" undos (7d), corrections by field (30d) |
| Playbook library   | `discoverV2Playbooks()` (repo filesystem, no DB)             | Validation errors + structural skips in the shipped library  |
| Spend              | `usage_events` (month-to-date)                               | Vendor spend rollup, top workspaces, scan-capped             |
| Users overview     | `profiles`, `workspace_subscriptions`, `usage_events`        | Trial-first funnel; waitlist leftover is a leftover count    |
| Prospects          | `waitlist_leads`                                             | Pre-account only. Qualification mix is this cohort           |
| People             | `profiles`, `workspace_members`, `workspace_subscriptions`, `usage_events` | Plan, status, batched play usage. No per-row entitlement N+1 |

Large rollups are scan-capped (`CAPTURE_SCAN_CAP`, `SPEND_SCAN_CAP`) so the dashboard can never issue an unbounded read; capped sections say so in the UI.

## Composio slug canary

Synthetic monitoring for the tool slugs Salt executes — a dead slug (e.g. the `OUTLOOK_OUTLOOK_GET_MESSAGE` 404) is caught here before users notice.

- **Cron:** `app/api/cron/composio-canary/route.ts`, hourly at minute 37 (`vercel.json`), gated by `assertInternalSecret` (`CRON_SECRET` / `STAGING_CRON_SECRET`).
- **Probe:** metadata fetch per curated slug (`CANARY_SLUGS` in `app/_lib/composio/canary.ts`); classifies `ComposioToolNotFoundError` vs. other failures; asserts the response schema is non-empty.
- **Persistence:** every probe appends a row to `platform_health_checks` (service-role only, RLS with no policies by design).
- **Alerts:** `computeStreakAlert` fires after `ALERT_THRESHOLD` consecutive failures (flap protection; recovery email on first success after an alerted streak). Email via `app/_lib/email/ops-alerts.ts` → `OPS_ALERT_EMAIL` (fallback: `PLATFORM_ADMIN_EMAILS`).
- **Environment gate:** alert emails only send when `VERCEL_ENV === "production"`. Staging runs the cron and writes rows but never emails.
- **Dead-man's switch:** optional `OPS_HEARTBEAT_URL` ping after each run — alerts if the cron itself stops running.

Manual runs / probe verification (staging):

```bash
op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/run-composio-canary.ts
op run --env-file=.env.staging.1password -- env NODE_OPTIONS="--require ./scripts/dev-server-only-stub.cjs" pnpm tsx scripts/verify-canary-probe.ts
```

## Connector sources (future: Native + Composio)

The Connectors surface is designed for a future where Salt has both **Composio-backed** and **native** connectors:

- **Overview** stays unified — source is a facet of the data (badge on the provider table today, per-row Source column when a second source exists), never a separate page.
- **Review queue** stays unified — the trust ladder (risk class → human verdict → executable) is source-agnostic. It gains a Source column when native tools exist.
- **Health** is grouped **per source** because the machinery differs: the slug canary and webhook ingress are Composio-specific; native connectors will get their own probe section as a sibling on the same tab.

## Users

`/ops/users` is designed around **signed up on a trial → paid → canceled**. The waitlist is a leftover inbound channel, not the product model.

| Tab | Job |
| --- | --- |
| Overview | Pulse: trials started, active trials, trial → paid, churn, usage risk, this-vs-prior signup bar, funnel, plan mix, just-happened |
| Prospects | Anyone who is not yet an account (`waitlist_leads` today) |
| People | Every account, including trial. Plan, status (`trial` / `paid` / `canceling` / `canceled` / `past_due`), plays used / included |

Trial users belong on People (`status: trial`), not Prospects. Grant / revoke access and Stripe cancellation *reason* are not in v1 (we only persist `status`, `canceled_at` via `updated_at`, and `cancel_at_period_end`). People usage is the account's play bundle; platform COGS stays on the future Spend page.

## Environment semantics

One codebase, two deployments. Each deployment's `/ops` reads whichever Supabase it is connected to: `app.usesalt.io/ops` is the real ops surface; staging's `/ops` verifies the machinery. `PLATFORM_ADMIN_EMAILS` must be set per environment.

## Debug endpoints

`GET /api/debug/playbooks` (discovery dump) is founder-gated with the same 404 posture as `/ops`. Depth for the Playbook library section; see `docs/guides/playbook-troubleshooting.md`.

## Adding a new ops signal

1. Decide the home: if users can't act on it, it goes here — not in product UI, not in Settings.
2. Add a gated fetcher to `app/_features/ops/queries.ts` (check `getPlatformAdmin`, return `null` on error, scan-cap large reads, keep aggregation pure and unit-tested).
3. Render with `@repo/ui` primitives in `app/(ops)/ops/_components/` (follow `ComposioHealthSection` — `Section`, `Table`, `Badge`; section failures render `SectionError` without taking down the page).
4. If the signal currently leaks into user-facing UI, remove it there and leave a user-actionable state if one exists.
5. If it needs scheduled probing/alerting, extend the canary pattern (new `kind` in `platform_health_checks`) rather than inventing a parallel pipeline.

## Non-goals

- **Read-only.** No mutations from `/ops` (the connectors tab's classification review is the one deliberate exception). Users invite / grant access is later. Remediation happens in the vendor's dashboard or a deploy.
- **Not a metrics platform.** Charts on Dashboard and Users are live rollups from source, not a history explorer.
- **Audit log** of admin actions is a fast-follow, not yet built.

## Related

- `docs/architecture/security-model.md` — auth model the gate builds on
- `docs/architecture/billing-metering.md` — spend primitives behind the Spend section
- `docs/guides/playbook-troubleshooting.md` — playbook discovery failures in depth
- `docs/reference/environment-variables.md` — `PLATFORM_ADMIN_EMAILS`, `OPS_ALERT_EMAIL`, `OPS_HEARTBEAT_URL`, cron secrets
