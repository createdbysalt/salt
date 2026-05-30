## Description

We want **Composio** as our unified integration platform for Salt. Currently, each integration (Gmail, Google Calendar, Cal.com, Fireflies) has its own custom OAuth flow, token storage, and API client — all hand-rolled. Composio would replace or wrap these with a single managed layer: OAuth, auth lifecycle, and action execution in one SDK.

### Why Composio?

- **Unified OAuth** — one flow, one token store, no per-provider refresh logic
- **Action SDK** — call Gmail/Calendar/Cal.com/etc. from Composio actions instead of per-provider APIs
- **Managed auth lifecycle** — no more encryptToken/refreshToken code in per-provider _lib/
- **Extensible** — adding Slack, Notion, Zoom, HubSpot becomes a config change, not months of custom code
- **Already evaluated** — Composio is in our stack, just not productized

---

## Current State

### Existing integrations (all custom, no Composio)

| Integration | Status | Approach |
|---|---|---|
| Gmail / Google | Working | Custom OAuth (googleapis), encrypted tokens in gmail_connections table |
| Google Calendar | Stubbed | Throws "requires googleapis" — never finished |
| Cal.com | Working | Custom OAuth + API key, bidirectional sync (680 lines) |
| Fireflies.ai | Scaffolded | Provider enum exists, minimal code |
| Stripe Connect | Working | Native Stripe OAuth (stays native) |

### Key files involved:

- app/actions/gmail/ — Gmail OAuth connect/disconnect/status
- app/actions/calendar/ — Google Calendar stubs
- app/_features/integrations/ — Generic integration connect/disconnect actions
- app/_features/meetings/calcom-sync.ts — Cal.com sync logic (679 lines)
- app/(studio)/settings/_components/sections/IntegrationsSection.tsx — Settings UI
- supabase/migrations/20260406000000_create_studio_integrations.sql — studio_integrations table
- app/_lib/gmail/ — Gmail OAuth + AES crypto helpers
- app/_lib/calcom/ — Cal.com API client

### How custom OAuth works today:
1. Server action generates Google auth URL with state param (userId, studioId in base64)
2. User authorizes via Google, callback exchanges code for tokens
3. Tokens encrypted with AES-256-GCM, stored in per-provider table
4. Per-provider refresh logic handles expiry
5. Each provider's API client reads from its own table

---

## Phased Plan

### Phase 1: Foundation — Composio SDK

**Goal:** Install Composio, set up connected accounts, replace ONE integration as proof.

1. **Install Composio SDK** — `pnpm add composio-core`
2. **Create `app/_lib/composio/`** — client factory, connected account CRUD, typed action wrappers
3. **Replace Gmail as pilot** — simplest self-contained integration with its own table
4. **Update `studio_integrations` schema** — add `composio_connection_id`, `composio_status` columns
5. **Remove `gmail_connections` table** after data migration

### Phase 2: Expand Coverage

6. **Google Calendar via Composio** — replace stubbed calendar code, use `GOOGLECALENDAR_*` actions
7. **Cal.com via Composio** — keep existing sync logic (`calcom-sync.ts`), swap OAuth/API key for Composio connected account
8. **Fireflies via Composio** — implement actual meeting transcription via `FIREFLIES_*` actions

### Phase 3: New Integrations

9. **Add via Composio config** — Slack, Zoom, Notion, HubSpot, Linear, QuickBooks/Xero
10. **Integration marketplace in settings** — browse Composio apps, one-click connect

### Phase 4: Cleanup

11. **Remove legacy tables** — `gmail_connections`, `calendar_connections`
12. **Remove legacy lib** — `app/_lib/gmail/`, `app/_lib/calcom/`, `app/_lib/gmail/crypto.ts`
13. **Remove legacy actions** — `app/actions/gmail/`, `app/actions/calendar/`
14. **Data migration script** — migrate existing connected accounts to Composio connections

---

## Proposed Architecture

```
app/_lib/composio/
  client.ts          — Composio client singleton
  connections.ts     — connectAccount(), disconnectAccount(), refreshAccount()
  actions.ts         — Typed action execution (Gmail, Calendar, etc.)
  types.ts           — Composio-specific types

studio_integrations table:
  provider            — 'composio:gmail' | 'composio:googlecalendar' | etc.
  composio_connection_id — Composio-managed connection ID
  composio_status     — 'connected' | 'expired' | 'error'
  config              — Provider-specific settings (username, event mappings)
```

---

## Open Questions / Decisions Needed

1. **Stripe Connect** — Keep native? (Stripe doesn't support third-party OAuth aggregators)
2. **Cal.com sync** — Use Composio for credentials only, or replace sync logic with Composio actions too?
3. **Composio pricing** — Verify API call limits and connected account limits for our usage level
4. **Environment setup** — Add `COMPOSIO_API_KEY` to `.env.1password` vault `salt-software-development`
5. **Composio workspace** — Set up project/workspace on composio.dev for Salt

---

## Dependencies

- Composio API key provisioned in 1Password vault `salt-software-development`
- Composio project configured on composio.dev
- Decision on Stripe Connect strategy (keep native?)