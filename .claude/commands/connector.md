---
allowed-tools: Read, Glob, Grep, Edit, Write, Bash, WebFetch
description: "Composio connector lifecycle: add, audit, test, enable, and fetch brand icons. One sentence instead of twenty 'add X' messages."
---

# /connector - Composio Connector Lifecycle

You manage Salt's Composio connector catalog end-to-end. This command exists because adding/auditing connectors was the #1 repeated request of June 2026 (~45 prompts).

## Arguments

Invoked with: `$ARGUMENTS`

Subcommands: `add <names...>` | `audit [name]` | `test [name]` | `enable <name>` | `icons [names...]`

## Source of Truth (read before acting)

| What | Where |
|------|-------|
| Catalog (single source of truth for scope) | `app/_features/connectors/connector-catalog.ts` |
| Provider registries (`COMPOSIO_WORKSPACE_PROVIDERS`, `COMPOSIO_API_KEY_PROVIDERS`) | `app/_lib/composio/providers.ts` |
| Connection flow | `app/_lib/composio/connections.ts` |
| Icon assets | `public/connectors/<id>.png` |
| Icon registration | `app/_features/connectors/components/connector-icons.tsx` |
| Access model (risk classes, draft/send mode) | memory: `project_composio_access_model` + `docs/plans/2026-06-11-composio-integration-safety-model.md` |
| Google = custom auth configs on Salt's own OAuth client | memory: `project_composio_own_oauth_client` |

## Existing scripts — reuse, do not rewrite

All in `.scratch/` (gitignored, run with `op run --env-file=.env.1password -- pnpm tsx <script>` or `node` for `.mjs`):

| Script | Purpose |
|--------|---------|
| `composio-connector-audit.ts` | Full catalog audit → `composio-connector-audit-report.json` |
| `composio-provision-auth-configs.ts` | Provision managed-OAuth auth configs → `composio-provisioned-auth-configs.json` |
| `fetch-connector-brands.mjs` | Fetch brand logos → `public/connectors/` |
| `composio-connect-smoke.mjs` | Connect-flow smoke test |
| `composio-apikey-initiation-test.ts` | API-key flow initiation test |
| `connector-ui-e2e-check.mjs` | UI-level connector check |
| `test-composio-toolkits.mjs` | Verify a Composio toolkit exists for a provider key |

If a script is missing or stale, fix it in place in `.scratch/` rather than creating a new variant.

## Subcommand: `add <names...>`

For EACH connector name (accept many at once — never make the user send one message per app):

1. **Resolve toolkit**: verify a Composio toolkit exists for the provider key (`test-composio-toolkits.mjs` or Composio API). No toolkit → catalog entry with `comingSoon: true` + reason comment.
2. **Catalog entry**: add a `Phase2ConnectorSpec` to `connector-catalog.ts` — correct `category`, `authMethod`, and a description in Salt voice (short, benefit-led, no AI personification; see `brand-identity/foundation/voice-principles.md`).
3. **Provider registry**: add `providerKey` to `COMPOSIO_WORKSPACE_PROVIDERS`. If `authMethod: "api_key"`, ALSO add to `COMPOSIO_API_KEY_PROVIDERS` or the connect dialog routes wrong.
4. **Auth config**: provision via `composio-provision-auth-configs.ts` (managed OAuth) — except Google apps, which use custom auth configs on Salt's own OAuth client (managed + custom scopes breaks at Google).
5. **Icon**: fetch via `fetch-connector-brands.mjs`, save `public/connectors/<id>.png`, register in `connector-icons.tsx`.
6. **Verify**: `pnpm tsc --noEmit` (or `pnpm lint`) + run the audit script for the new entries.

Report a table at the end: connector | toolkit ✓ | auth config ✓ | icon ✓ | connectable / coming soon (reason).

## Subcommand: `audit [name]`

Run `composio-connector-audit.ts` (all, or filtered to `name`). Cross-check every catalog entry:
- providerKey exists in `providers.ts` registries (both lists for api_key)
- auth config provisioned in Composio (live API check)
- icon file exists + registered
- `comingSoon` entries have a reason comment
- no orphans: providers.ts keys with no catalog entry

Output: pass/fail table + exact fixes. Apply fixes if the user says so.

## Subcommand: `test [name]`

Smoke-test connect flows without burning real OAuth grants:
1. `composio-connect-smoke.mjs` for OAuth initiation (redirect URL resolves, no 401).
2. `composio-apikey-initiation-test.ts` for API-key connectors.
3. `connector-ui-e2e-check.mjs` against localhost:3000 (start dev server via `/devup` if needed).
Report per-connector: initiation OK / failed (error + suspected cause).

## Subcommand: `enable <name>`

Flip `comingSoon` off: verify toolkit + auth config + icon first (steps from `add`), then remove the flag, run audit for that entry.

## Rules

- Batch everything. If the user lists 20 apps, process all 20 and report once.
- Never delete an existing connector without confirmation.
- New auth scopes for Google apps: flag that scope changes require updating the custom auth config AND the Google Cloud consent screen — list the exact scopes.
- Square icons in circular chips: icons are rendered in rounded containers; pad transparent margins when fetching (the brand fetch script handles this — verify visually).
