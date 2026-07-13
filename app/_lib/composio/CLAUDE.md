# Composio integration (`app/_lib/composio/`)

> **⚠️ BEFORE ADDING A CONNECTOR:** Read `docs/architecture/connector-system.md` for the full architecture, unified registry pattern, and step-by-step guide.

Managed OAuth and tool execution for Phase 1 user connectors (Gmail, Google Calendar, etc.). Salt stores **connection metadata** in `workspace_integrations`; Composio stores OAuth tokens and API keys.

Stripe is an **API-key connector** (the user's own Stripe account, Phase 1C): no OAuth redirect — `initiateApiKeyConnection` in `connections.ts` completes synchronously and the key goes straight to Composio, never into Salt's DB or logs. Salt SaaS billing (`app/_lib/stripe/`) is separate and stays native.

## Packages

- `@composio/core` — connections, connected accounts, tool execution
- `@composio/vercel` — Vercel AI SDK provider for agentic tools

## Key modules

| File | Purpose |
|------|---------|
| `client.ts` | Singleton Composio clients (`getComposioClient`, `getComposioAgentClient`) |
| `connections.ts` | OAuth initiate/callback/disconnect; persists to `workspace_integrations` |
| `oauth-state.ts` | HMAC-signed, expiring OAuth state + safe return URLs |
| `workspace-auth.ts` | Workspace membership checks before connect/disconnect/tools |
| `tool-policy.ts` | Provider/action allowlist; mutating tools require approval |
| `actions.ts` | Server-side tool execution wrapper |
| `providers.ts` | Salt provider keys ↔ Composio app/toolkit names |

## Environment

- `COMPOSIO_API_KEY` — server-only (1Password)
- `COMPOSIO_OAUTH_STATE_SECRET` — preferred for OAuth state signing; falls back to `SUPABASE_SERVICE_ROLE_KEY`

## Source reference (opensrc)

When docs or types are unclear, read the upstream SDK source (do not guess APIs):

```bash
pnpm opensrc path composiohq/composio
# ~/.opensrc/repos/github.com/composiohq/composio/next
```

Useful paths in that checkout:

| Topic | Path |
|-------|------|
| Connected accounts / OAuth | `ts/packages/core/src/models/connectedAccounts*` |
| Connected account tests | `ts/packages/core/test/connectedAccounts/` |
| Tool execution | `ts/packages/core/src/models/tools*` |
| Vercel provider | `ts/packages/vercel/` |

`pnpm opensrc path @composio/core` does not work — npm does not publish source; use the GitHub repo above.

## Related

- **Connector System Architecture**: `docs/architecture/connector-system.md` — **START HERE**
- Unified Registry (single source of truth): `app/_lib/composio/unified-connector-registry.ts`
- Capture Adapters: `app/_features/capture/adapters/`
- Connector catalog & Settings UI: `app/_features/connectors/`
- Callback route: `app/api/integrations/composio/callback/route.ts`
