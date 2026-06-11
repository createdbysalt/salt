# Plan: Composio Integration Safety Model & Per-App Connectors
**Date:** 2026-06-11
**Status:** In Progress — Phases 1-3 complete (code + DB migration + Composio auth configs, 2026-06-11). Next: Phase 4 trust ladder + email draft/send mode

## Context

Salt's Composio integration (Phase 1A: Gmail + Google Calendar) is shipped and architecturally sound: workspace-scoped OAuth with HMAC-signed state, a default-deny tool allowlist (`app/_lib/composio/tool-policy.ts`), risk classes, and human approval on mutating tools. A verification pass found four enforcement gaps and produced an updated access model, approved by the founder:

**Decisions (locked):**
1. **Three risk classes**: `read` (auto-execute, logged) / `mutating` (approval card, logged) / `destructive` (never registered as agent tools — Salt can never delete anything).
2. **Gmail email mode is user-configurable per workspace**: `draft` (Salt creates Gmail drafts only; draft creation auto-executes — nothing leaves the account) or `send` (GMAIL_SEND_EMAIL registered, every send behind approval). **Default for new connections: draft mode.** Send stays available as an explicit toggle.
3. **CAL_CANCEL_BOOKING = mutating with explicit approval**, NOT destructive. Only true data destruction (e.g. `GOOGLECALENDAR_DELETE_EVENT`, Gmail delete/trash, Drive share/delete) is `destructive`.
4. **Google is split into per-app connectors**: Gmail, Google Calendar, Google Drive (and Meet later) are separate catalog tiles, each with its own OAuth connect and its own Composio auth config scoped only to that app. No bundled "Google" connection.
5. **Scope minimization via Salt's own Google OAuth client is deferred to pre-launch** (restricted Gmail scopes trigger Google CASA verification). Ship on Composio's shared OAuth app; per-app auth configs still narrow each grant.

## Research Summary

Verified against the codebase and Composio SDK source (`~/.opensrc/repos/github.com/composiohq/composio/next`):

- **Gap 1 — `disabledTools` bypass:** workspace tool toggles are only enforced in `executeComposioAction` (`app/_lib/composio/actions.ts:39-43`), NOT in the Ask Salt path (`load-ask-salt-tools.ts` → Composio's own execute). The connector UI promises a toggle that chat ignores.
- **Gap 2 — no input validation in chat:** Zod schemas (`parseComposioToolInput`) only run in `executeComposioAction`. In Ask Salt, model args go straight to Composio. `GMAIL_SEND_EMAIL` accepts `cc`/`bcc` → prompt-injection exfiltration channel; the approval card must render ALL args.
- **Gap 3 — destructive tools exposed:** `GOOGLECALENDAR_DELETE_EVENT` is allowlisted as mutating+approval; policy says it should be unreachable.
- **Gap 4 — no execution audit log:** nothing records which tool ran, with what args, approved by whom.
- **SDK finding:** Tool Router sessions created without `preload` default to `preload: { tools: "all" }` — every Gmail/Calendar tool plus router meta-tools (`COMPOSIO_MULTI_EXECUTE_TOOL` etc.) is returned by `session.tools()`. Salt's policy filter (`wrapComposioToolsForAskSalt`) drops unknowns, which is the only thing keeping ~100 non-allowlisted tools away from the model. Pass an explicit `preload.tools` list.
- **Bundle finding:** the "one Google connection" works because the Gmail auth config in the Composio dashboard requests calendar scopes; `connectGoogle()` (`app/actions/gmail/connect.ts`) only initiates the `gmail` toolkit. The catalog (`app/_features/connectors/connector-catalog.ts`) already has separate `google`, `google-calendar` (hidden), `google-drive` entries and the DB already stores one row per provider — splitting is config + UI work, no schema migration.
- `first-scan` runs unattended after connect; must be hard-restricted to `read`-class tools at the executor level.

## Implementation Plan

> Each step includes its tool in `[brackets]`. Frontend work MUST use `/frontend-design` (read DESIGN.md first).

### Phase 1: Close enforcement gaps (small contained diffs, no migrations)
- [x] Add `destructive` risk class to `tool-policy.ts`; reclassify `GOOGLECALENDAR_DELETE_EVENT` as destructive; reject destructive in `assertComposioToolAllowed`; drop destructive in `wrapComposioToolsForAskSalt`. `CAL_CANCEL_BOOKING` stays mutating+approval. `[tool: direct edit]`
- [x] Wrap each Ask Salt AI SDK tool's `execute` so chat executions funnel through the same policy checks as `executeComposioAction`: workspace `disabledTools` + `parseComposioToolInput` Zod validation. `[tool: direct edit + /testing-patterns]`
- [x] Pass explicit `preload: { tools: [...allowlisted slugs] }` when creating the Tool Router session in `load-ask-salt-tools.ts`. `[tool: source-code-context to confirm option shape]`
- [x] Guard `first-scan` (and any unattended job) to `read`-class tools at the executor level (not by convention). `[tool: direct edit]`
- [x] Regression tests: destructive class never reachable, disabledTools enforced in chat path, invalid args rejected in chat path. `[tool: /testing-patterns]`

### Phase 2: Audit log + approval card fidelity
- [x] Migration: `workspace_tool_executions` (workspace_id, tool_slug, risk, args summary, approved_by, status, error, created_at) with owner/admin-read RLS. `[tool: /database migration]`
- [x] Log every tool execution (auto and approved) from the shared executor. `[tool: direct edit]`
- [x] Audit/fix the Ask Salt approval UI: render ALL arguments (to/cc/bcc, full body; diff view for event updates). `[tool: /frontend-design]`
- [x] "Activity" timeline in the connector detail modal, fed by the audit table. `[tool: /frontend-design, /ds-check]`

### Phase 3: Per-app Google connectors
- [x] Composio auth configs (done 2026-06-11 via API, not dashboard): gmail config `ac_hRk6lKxesK87` narrowed from FULL `mail.google.com` + Google Contacts/People scopes (over-broad managed default; no calendar scopes were ever on it) to `gmail.readonly` + `gmail.compose` + identity. New googlecalendar config `ac_zuCErSBA77Ye` created with `calendar.events` + identity only. `gmail.compose` covers drafts AND send — ready for Phase 4 draft mode. Existing connections unaffected; new consent screens are minimal.
- [x] Catalog: rename `google` tile → "Gmail"; flip `google-calendar` to `showInCatalog: true`; split `GOOGLE_CAPABILITIES` into per-connector capability groups. `[tool: direct edit]`
- [x] Connect actions: `connectGmail` initiates gmail only; new `connectGoogleCalendar` initiates googlecalendar; per-app status checks. `[tool: direct edit]`
- [x] Ask Salt: load only toolkits whose workspace connection is active (dynamic toolkit list per workspace, not the static `ASK_SALT_COMPOSIO_TOOLKITS`). `[tool: direct edit + /testing-patterns]`
- [x] Chat inline connect: replace "Connect Google" with per-app connect buttons. `[tool: /frontend-design]`
- [x] Back-compat: workspaces connected under the bundled flow keep working (their gmail token carries calendar scopes); calendar tile shows "not connected" until they connect it properly — add a one-time "reconnect Calendar" nudge. `[tool: direct edit]`
- [x] `first-scan` triggers per provider connection. `[tool: direct edit]`

### Phase 4: Trust ladder + email mode (consent UX)
- [ ] Migration: `trust_level` (`read_only` | `act_with_approval`) on `workspace_integrations`; new connections default `read_only`. Email mode (`draft` | `send`) stored in `workspace_integrations.config`; default `draft`. `[tool: /database migration]`
- [ ] Add `GMAIL_CREATE_DRAFT` to `tool-slugs.ts`, policy table (mutating for generic executor; auto-execute in chat when mode=draft, always logged), and capability groups. `[tool: direct edit]`
- [ ] Wire trust level + email mode into tool loading: read-only → zero mutating tools registered; draft mode → `GMAIL_SEND_EMAIL` never registered; send mode → registered with approval. `[tool: direct edit + /testing-patterns]`
- [ ] Connect-flow consent screen built from capability groups, with email-mode choice at connect time and an upgrade prompt when Salt first wants to act. `[tool: /scout for consent patterns, /frontend-design]`
- [ ] Email mode + trust level toggles in connector detail modal. `[tool: /frontend-design, /ds-check]`

### Phase 5: Hardening + remaining Phase 1 connectors
- [ ] Status reconciliation: mark `composio_status` on auth-error tool failures; surface (don't `console.warn`-swallow) remote disconnect failures. `[tool: direct edit]`
- [ ] Google Drive (Phase 1B) read-only: catalog flip, allowlist read/search tools only; share/write/delete = destructive (sharing is an exfiltration vector). `[tool: direct edit]`
- [ ] Fireflies via Composio (all-read, inherently safe); Cal.com after (create booking = approval, cancel booking = approval, no destructive tools). `[tool: direct edit]`
- [ ] E2E: connect per-app → read auto-runs → mutating shows approval with full args → destructive tool absent → draft mode never sends. `[tool: /webapp-testing]`
- [ ] (Pre-launch, deferred) Own Google OAuth client + custom auth configs with minimal scopes (`gmail.readonly`, `gmail.compose`, `calendar.events`); requires Google CASA verification. `[tool: /research]`

## Files to Create/Modify

| File | Action | Purpose | Tool |
|------|--------|---------|------|
| `app/_lib/composio/tool-policy.ts` | Modify | `destructive` class; reclassify delete-event; GMAIL_CREATE_DRAFT policy | — |
| `app/_lib/composio/tool-slugs.ts` | Modify | Add GMAIL_CREATE_DRAFT | — |
| `app/_lib/composio/ask-salt-tools.ts` | Modify | Execute wrapper: disabledTools + Zod validation; drop destructive; trust/email-mode filtering | — |
| `app/_lib/composio/load-ask-salt-tools.ts` | Modify | Explicit `preload.tools`; dynamic toolkit list from active connections | — |
| `app/_lib/composio/tool-policy.test.ts` | Modify | Regression tests for new class + chat-path enforcement | `/testing-patterns` |
| `app/_features/plays/services/first-scan.ts` | Modify | Read-class-only guard for unattended runs | — |
| `app/_features/connectors/connector-catalog.ts` | Modify | Per-app tiles: Gmail, Google Calendar visible | — |
| `app/_features/connectors/connector-capabilities.ts` | Modify | Split capability groups per connector; draft capability | — |
| `app/actions/gmail/connect.ts` | Modify | Gmail-only connect | — |
| `app/actions/calendar/` (new action) | Create | `connectGoogleCalendar` | — |
| `supabase/migrations/<ts>_workspace_tool_executions.sql` | Create | Audit log table + RLS | `/database migration` |
| `supabase/migrations/<ts>_integration_trust_level.sql` | Create | trust_level column | `/database migration` |
| Ask Salt approval UI components (`app/_features/ask-salt/`, `app/_features/shell/components/AskSaltPanel.tsx`) | Modify | Full-args approval cards; per-app connect buttons | `/frontend-design` |
| Connector detail modal components | Modify | Activity timeline; email mode + trust toggles | `/frontend-design`, `/ds-check` |
| `e2e/tests/` (new spec) | Create | Connector safety E2E | `/webapp-testing` |

## Tool Summary

| Phase | Tools | Purpose |
|-------|-------|---------|
| Research | `source-code-context` (opensrc Composio SDK) | Confirm preload/session API shapes |
| Frontend | `/frontend-design`, `/ds-check` | **MANDATORY** — approval cards, consent screen, connector tiles (read DESIGN.md first) |
| Backend | `/database migration` | Audit table, trust_level | 
| Testing | `/testing-patterns`, `/webapp-testing` | Policy unit tests + connector E2E |
| Review | `/ux-review`, `/security-review` | Consent flow audit; chat-path enforcement audit |

## Open Questions

- Does the existing Composio Gmail auth config power production workspaces? Confirm before removing calendar scopes from it (Phase 3 dashboard step) — may need a new auth config rather than editing the live one.
- Google Meet as a connector: Composio has a Meet toolkit, but Meet links are normally created via Calendar events. Decide whether Meet earns a tile or stays a Calendar capability.
- Approval card persistence: where approved/denied decisions are stored for the audit trail (message metadata vs audit table as source of truth).

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Prompt injection via email content steering tool calls | Destructive class unreachable; approval cards render ALL args (esp. recipients); draft-mode default; system-prompt hardening; `stepCountIs(8)` bound |
| Editing the live Composio auth config breaks existing connections | Create new per-app auth configs; migrate connect flow first; keep old config until existing tokens reconnect |
| Bundled-era workspaces see Calendar as "disconnected" after split | Back-compat nudge to reconnect Calendar; gmail token's extra scopes keep old flows working meanwhile |
| Chat-path wrapper drifts from `executeComposioAction` policy logic | Single shared enforcement function both paths call; regression tests |
| Composio ships new toolkit tools | Default-deny allowlist + explicit `preload.tools` makes the surface deterministic |
| User revokes access at Google; Salt shows connected | Status reconciliation on auth-error + periodic check (Phase 5) |
