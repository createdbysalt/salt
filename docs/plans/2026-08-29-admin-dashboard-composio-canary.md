# Plan: Founder Ops — Composio Canary + Admin Dashboard

**Date:** 2026-08-29
**Status:** Approved

## Context

The Outlook slug break (double-prefix `OUTLOOK_OUTLOOK_*` 404'd when Composio reverted server-side) silently stubbed 655 emails for weeks. Two gaps caused the blindness: (1) no probe detecting dead tool slugs, (2) no internal visibility into platform health. The founder wants an admin dashboard to "manage Salt as a whole" (user counts, Composio health, more over time), and failure alerting must never be user-visible.

## Research Summary (2026-08-29)

What SaaS companies actually do for internal ops dashboards, and how it maps to Salt:

**Build vs buy.** The standard advice is Retool/ToolJet for pre-seed→Series A internal CRUD, graduating to custom when seat costs cross ~$25–40k/yr or the tool sits on the core workflow. Salt's case fits the custom exception: solo founder (no seat math), data already in the app's Postgres with a service-role pattern, an existing in-app admin surface (`/admin/connectors`), its own design system, and the canary cron must live in-app anyway. Retool would add a vendor, a second surface, and per-seat cost for zero leverage. Vercel's shadcn admin template / Tremor were considered and rejected — `@repo/ui` already is the component system.

**Dashboard design principles that apply:**
- Permission-first, enforced server-side — Salt already does this right (`getPlatformAdmin` + `notFound()`, fail-closed). UI hiding is for nav only.
- 3–5 high-signal KPIs per view with progressive disclosure: KPI cards → filterable tables → history on demand. Drives the four-section v1 layout below.
- URL-based filters + offset pagination for shareable support links; server-rendered pages (no WebSocket complexity — SSE only if live updates ever matter; v1 is render-on-load).
- Append-only audit log from day one *for state-mutating admin actions*. v1 is read-only, so the audit table arrives with the first mutation (impersonation, tier override, refund) — flagged as a fast-follow, not forgotten.
- Standard role set is Owner/Admin/Operator/Viewer — Salt needs only Owner today; the email allowlist stays, no RBAC build-out.

**Third-party dependency monitoring (the canary):** industry pattern is synthetic checks against critical dependencies every 1–5 min, asserting *content* (not just HTTP 200), measuring latency, and alerting with concrete evidence. Contract/schema-diff tooling (oasdiff et al.) catches OpenAPI drift in CI but would NOT have caught the Composio break — Composio's tool catalog is runtime, not a checked-in spec. The metadata probe + consecutive-failure threshold + latency tracking in Phase 1 matches the synthetic-monitoring playbook at the right scale (hourly to start, tighten to 5–15 min for the highest-blast-radius toolkits once signal quality is proven).

**Bootstrapped/solo-founder confirmation.** Bootstrappers specifically do NOT buy Retool — the recurring pattern (BirJob, HTPBE, indie SaaS boilerplates) is one server-rendered admin page hitting the founder's own Postgres directly, locked by a single server-side owner check, with live counts from source (never stored counters that drift) and deep links into Stripe/vendor consoles. That is exactly this plan. For monitoring, bootstrappers pair free-tier external uptime tools (UptimeRobot 50 monitors free, Better Stack heartbeat, self-hosted Uptime Kuma) with in-app crons for vendor-specific semantics — external pingers can't see a dead Composio slug, and the in-app canary can't report its own death. **Gap this surfaces:** if the Vercel cron silently dies, the email alert dies with it. Optional hardening added below: a dead-man's-switch heartbeat on the canary cron (Better Stack / UptimeRobot free tier) so an external watcher watches the watcher.

## Approach

### Phase 1: Composio slug canary (committed)

Metadata-level probe: when Composio kills a slug, both metadata and execute endpoints 404 (confirmed in the Aug 6 incident notes). Probing metadata catches slug death with zero metering cost, zero user data, and no connected account required.

- **New migration** `supabase/migrations/<ts>_platform_health_checks.sql` — table `platform_health_checks`: `id`, `kind` (`slug_canary`), `target` (tool slug), `toolkit`, `status` (`ok`/`failed`), `error_code`, `error_message`, `latency_ms`, `checked_at`. RLS: service-role only (no user reads — ops data never reaches clients).
- **New** `app/_lib/composio/canary.ts` — `CANARY_SLUGS` registry (critical read-class slugs per toolkit: Outlook get/list message, Gmail list, calendar view, Stripe/QuickBooks reads, Drive, Slack, etc., drawn from `tool-slugs.ts` + `tool_classifications` where `status='approved'`); `runSlugCanary()` probes each via the Composio client metadata endpoint, asserting **content** (schema present, not just non-404) and recording `latency_ms`, writes results, and returns failure streaks.
- **New cron** `app/api/cron/composio-canary/route.ts` — guarded by `assertInternalSecret`, hourly in `vercel.json`. Composio's tool catalog is global (not per-environment), so the probe runs in every deployment but **alert emails fire only when `VERCEL_ENV === "production"`** — staging verifies, production pages.
- **New** `app/_lib/email/ops-alerts.ts` — `sendOpsAlertEmail({ subject, lines })` cloning the `sendWaitlistAdminNotificationEmail` pattern; recipients from new `OPS_ALERT_EMAIL` env, falling back to `PLATFORM_ADMIN_EMAILS`. Alert only on **2+ consecutive failures** for a slug (flap protection), with concrete evidence in the body (slug, error code, first-seen timestamp, latency), and send one recovery email when it heals.
- **Dead-man's switch (optional but recommended):** the cron pings a Better Stack / UptimeRobot free-tier heartbeat URL (`OPS_HEARTBEAT_URL` env) on every successful run. If the cron itself dies, the external watcher emails the founder — the in-app canary can't report its own death.
- **SDK tracking:** Dependabot already opens weekly npm PRs covering `composio-core` bumps (currently 0.14.0 vs 0.18.0 latest). The canary is the real safety net — the Aug breaks were server-side slug reworks no SDK version would have prevented. Optional: give `composio-*` packages their own Dependabot group in `.github/dependabot.yml` so those PRs stand out from the grouped minor/patch noise.

### Phase 2: Admin dashboard hub (v1, read-only)

**Environment semantics:** one codebase, two deployments — not two dashboards. Each deployment's `/admin` reads whichever Supabase it is connected to. `app.usesalt.io/admin` (production) is the real ops surface (real users, workspaces, spend); the staging deployment's `/admin` reads staging Supabase (e.g. the Outlook stub count shows up there) and exists to verify the feature before ship. No environment switcher in v1.

**Route safety:** `/admin` does not collide with Sanity — the Studio editing surface is mounted at `/edit` (`app/(sanity)/edit/[[...tool]]/`, with its own auth carve-out in `middleware.ts`). `/admin` is already an established prefix (`/admin/connectors`).

Extend the proven `/admin/connectors` pattern: `getPlatformAdmin()` gate → `notFound()` for non-admins, `createAdminClient()` for cross-tenant reads.

- **New feature module** `app/_features/admin/queries.ts` — platform rollup queries (all count/head or capped scans). **Live counts from source, never stored counters** (bootstrap principle: numbers that can't drift out of sync):
  - Overview: total users (`profiles`), total workspaces, workspaces by tier (`workspace_subscriptions`), signups last 7/30d
  - Composio: `workspace_integrations` grouped by provider × `composio_status` × `is_active`; latest canary result per slug; webhook-outcome failures from `connector_sync_events` (24h)
  - Capture pipeline: `capture_events` by `source_type` (7d), `gate_action` distribution, **stub count** (`raw_payload->>needs_hydration`) — this exact metric would have exposed the Outlook break
  - Spend: MTD COGS summed from `usage_events.cost_estimate_micros`, top 10 workspaces by spend
- **New page** `app/(product)/admin/page.tsx` — `/admin` hub with the four sections as card grids + simple tables (`@repo/ui`), plus a tab row linking `/admin` (Overview) and `/admin/connectors` (Connectors). Components under `app/(product)/admin/_components/`. Tables use URL search-param filters (shareable links); workspace rows deep-link to the Stripe customer/subscription and the Composio dashboard so investigating is one click, not a copy-paste hunt.
- Lift `getPlatformAdmin` from `app/_features/connectors/admin/platform-admin.ts` into `app/_lib/admin/` (re-exported for back-compat) since two surfaces now share it.

### Non-goals (v1)

- No user-visible alerting of any kind; no Slack ops webhook (no channel exists — email only)
- No live-execution canary against customer workspaces (meters ~$0.004/call to their COGS); metadata probe only
- No mutations from the dashboard (read-only); no auth changes; no RBAC beyond the existing founder allowlist
- Append-only admin audit log is a **fast-follow** that ships with the first mutating admin action (impersonation, tier override, refund) — read-only v1 doesn't need it yet

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/<ts>_platform_health_checks.sql` | Create | Canary results table, service-role RLS |
| `app/_lib/composio/canary.ts` | Create | Probe registry + runner |
| `app/api/cron/composio-canary/route.ts` | Create | Cron entry |
| `app/_lib/email/ops-alerts.ts` | Create | Founder email alerts |
| `vercel.json` | Modify | Add hourly cron |
| `app/_lib/admin/platform-admin.ts` | Create | Lifted gate |
| `app/_features/connectors/admin/platform-admin.ts` | Modify | Re-export for back-compat |
| `app/_features/admin/queries.ts` + `queries.test.ts` | Create | Rollups |
| `app/(product)/admin/page.tsx` + `_components/` | Create | Dashboard UI (`/frontend-design`) |
| `docs/reference/environment-variables.md` | Modify | `OPS_ALERT_EMAIL`, `OPS_HEARTBEAT_URL` |
| `.github/dependabot.yml` | Modify | Optional dedicated `composio-*` group |

## Dependencies

- `PLATFORM_ADMIN_EMAILS` already set in 1Password env files; add `OPS_ALERT_EMAIL` (or reuse the admin list); `OPS_HEARTBEAT_URL` optional (Better Stack / UptimeRobot free tier)
- Staging verification needs `STAGING_CRON_SECRET` for a manual cron trigger

## Risks

- Composio metadata endpoint shape differs from execute (mitigate: verify probe against a known-good and known-dead slug before wiring alerts — `OUTLOOK_OUTLOOK_GET_MESSAGE` is a live dead-slug test case right now)
- Cross-tenant count queries could get slow at scale (mitigate: `head: true` exact counts, capped windows, no per-row scans)
- Canary false positives from transient Composio 5xx (mitigate: 2-consecutive-failure alert threshold)
