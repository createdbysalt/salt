---
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, WebFetch
description: "Composio connector lifecycle on the DB-driven platform: add, classify, audit, test, enable, icons. Zero code changes for action-only connectors."
---

# /connector - Composio Connector Lifecycle (DB-driven)

You manage Salt's connector platform. Since connector-platform Phase 2 (2026-07-03), **the catalog lives in the DB, not in code**: `connector_catalog` + `connector_overrides` (Salt's tier + pinned auth config) + `tool_classifications` (fail-closed per-tool risk verdicts). Adding an action-only connector requires ZERO app-code changes.

## Arguments

Invoked with: `$ARGUMENTS`

Subcommands: `add <names...>` | `classify [toolkit]` | `audit [name]` | `test [name]` | `enable <name>` | `icons [names...]`

## Source of Truth (read before acting)

| What | Where |
|------|-------|
| Catalog + overrides + classifications | DB tables `connector_catalog`, `connector_overrides`, `tool_classifications` (staging `<project-ref>`) |
| DB accessors (runtime) | `app/_lib/composio/connector-registry.ts` |
| Sync job (mirrors Composio, drift detection) | `app/_lib/composio/catalog-sync.ts` + `/api/cron/connector-catalog-sync` |
| Review queue UI (human classification verdicts) | `/admin/connectors` (PLATFORM_ADMIN_EMAILS-gated) |
| Execution gate (fail closed on classifications) | `app/_lib/composio/actions.ts` + `classification-store.ts` |
| Frozen seed sources (NEVER add entries here) | `connector-catalog.ts`, `providers.ts` — banner-marked SEED SOURCE ONLY |
| Icon assets / registration | `public/connectors/<id>.png` / `connector-icons.tsx` |
| Access model + Google custom-OAuth rule | memories `project_composio_access_model`, `project_composio_own_oauth_client`; plan `.cursor/plans/2026-07-03-connector-platform.md` |

## Existing scripts — reuse, do not rewrite

In `.scratch/` (gitignored; run with `op run --env-file=.env.1password -- pnpm tsx <script>`): `composio-provision-auth-configs.ts` (managed-OAuth auth configs), `fetch-connector-brands.mjs` (logos), `test-composio-toolkits.mjs` (toolkit existence), `composio-connect-smoke.mjs`, `composio-apikey-initiation-test.ts`. Fix stale scripts in place.

## Subcommand: `add <names...>`

For EACH connector (batch — never one message per app):

1. **Toolkit exists?** Verify via Composio API / `test-composio-toolkits.mjs`. No toolkit → insert `connector_catalog` row with `coming_soon: true` and stop.
2. **Auth config**: provision via `composio-provision-auth-configs.ts` (managed OAuth) or the user-api-key pattern. Google apps ALWAYS use custom auth configs on Salt's own OAuth client. Record the `ac_…` id.
3. **DB rows** (SQL against staging, or a migration if it should ride to prod):
   - `connector_catalog`: provider_key, toolkit_slug, name, description (Salt voice: short, benefit-led, no personification), category, auth_method, coming_soon=false.
   - `connector_overrides`: tier (`catalog_only` default; `action` only when tools will be classified now), auth_config_id, `auth_config_env_var` = `COMPOSIO_<KEY>_AUTH_CONFIG_ID`, api_key_field_name for api_key connectors (`generic_api_key` default; `bearer_token` for Vercel/Meta-style).
4. **Sync**: trigger `/api/cron/connector-catalog-sync` (CRON_SECRET) or run `runCatalogSync()` so tools/triggers mirror in. New tools land `unclassified` (unusable — correct).
5. **Icon**: `fetch-connector-brands.mjs` → `public/connectors/<id>.png` → register in `connector-icons.tsx` (the one remaining code touch, display-only).
6. **Classify** (only if tier=action): point the user at `/admin/connectors` or run `classify`.

Report a table: connector | toolkit ✓ | auth config ✓ | DB rows ✓ | synced tools N | icon ✓ | tier.

## Subcommand: `classify [toolkit]`

1. Confirm sync has run for the toolkit (`connector_tools` rows exist).
2. "Propose next batch" in `/admin/connectors` runs the LLM pass (`proposeClassifications()`); proposals are NOT approvals.
3. The human approves per tool (risk class + confirm-each-run). NEVER approve on the user's behalf — the fail-closed pipeline IS the safety model.
4. Verify: an approved read tool executes through the gate; an unclassified sibling is blocked.

## Subcommand: `audit [name]`

Cross-check DB truth end-to-end (read-only SQL):
- every `connector_overrides.auth_config_id` non-empty where `coming_soon=false`
- tier action/capture toolkits have synced `connector_tools` rows
- zero `approved` classifications on `sync_status='removed'` tools (drift job working)
- unacknowledged `connector_sync_events` surfaced to the user
- icons exist for every `showInCatalog` row

Output: pass/fail table + exact fixes. Apply fixes if the user says so.

## Subcommand: `test [name]`

1. `composio-connect-smoke.mjs` (OAuth initiation resolves, no 401); `composio-apikey-initiation-test.ts` for API-key connectors.
2. `/plays?tab=connectors` renders the row (DB-driven since 2.5) — dev server via `/devup` if needed.
3. Action tiers: one approved read tool executes through the gate.

## Subcommand: `enable <name>`

Flip `connector_overrides.tier` (`catalog_only` → `action`) after classification, or set `coming_soon=false` once an auth config lands. No deploy — registry cache TTL is 5 minutes.

## Subcommand: `icons [names...]`

`fetch-connector-brands.mjs` → `public/connectors/` → register in `connector-icons.tsx`. Icons render in circular chips — pad transparent margins; verify visually.

## Iron rules

- NEVER add entries to `connector-catalog.ts` / `providers.ts` — frozen seed sources; the app reads the DB.
- NEVER mark a classification approved without an explicit human verdict.
- Google connectors: custom auth configs on Salt's own OAuth client, always. Scope changes require updating the custom auth config AND the Google Cloud consent screen — list exact scopes.
- API keys go straight to Composio; never into Salt's DB, logs, or env files.
- Batch everything; never delete an existing connector without confirmation.
- Check migration timestamps against BOTH active branches before minting one (parallel-session collision lesson, 2026-07-03).
