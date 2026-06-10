# Legacy naming reference

Retired product terms and where legacy strings still appear in code. **Do not use these in new user-facing copy, agent docs, or SEO.**

| Retired (user-facing) | Current | Notes |
|----------------------|---------|--------|
| The Bridge | Roundtables | Shared client/project workspace |
| The Table | Roundtables | Same surface; "table" subdomain redirects |
| Client portal | Roundtables | Not lead positioning |
| Studio OS / business OS | Proactive AI for your business | Marketing category |
| Dashboard (product) | HQ | Command center |
| Clients / Relationships routes | People | `/people` |
| Work route | HQ (for now) | `/work` redirects to `/hq` |
| Strategy / Serve / S-modes | Retired (April 2026) | No new UI labels |
| SEE → ACT → APPROVE | LEARN → ACT → GROW | Product loop |
| Creative agencies (ICP) | Solo service entrepreneurs | Audience |

## URL redirects (runtime)

Handled in `middleware.ts` and `app/_features/shell/routes.ts`:

| Legacy path | Redirect |
|-------------|----------|
| `/studio`, `/dashboard` | `/hq` |
| `/studio/clients`, `/dashboard/clients`, `/clients/*` | `/people/*` |
| `/relationships/*` | `/people/*` |
| `/work/*`, `/sales/*` | `/hq` |
| `bridge.*`, `table.*` subdomains | `/roundtables` |
| `app.*` subdomain `/` | `/hq` |

## Code / DB names (migration planned)

| Legacy identifier | Location | Status |
|-------------------|----------|--------|
| `studios`, `studio_id`, `studio_members` | PostgreSQL / Supabase | **Active.** Rename to `workspaces` / `workspace_id` / `workspace_members` planned post–Wave 1 — see `docs/plans/2026-06-09-workspace-rename-rfc.md` |
| `BridgeBrandingConfig`, `bridgeOverviewConfigSchema` | `app/_lib/roundtables/` | Type names; rename in a follow-up if needed |
| `serve` feature module | `app/_features/serve/` | Roundtables branding settings implementation |
| `archive/client-portal-legacy-20260521/` | Archive | Quarantined portal code |
| `/studio/settings` URLs | Onboarding setup cards | **Fixed** → `/settings/integrations` (2026-06-09) |

## Module rename map (May 2026 cleanup)

| Old path | New path |
|----------|----------|
| `app/_lib/table/` | `app/_lib/roundtables/` |
| `app/_features/table-command-center/` | `app/_features/roundtables/` |
| `app/_lib/email/table-emails.ts` | `app/_lib/email/roundtables-emails.ts` |

## Deleted route groups (May 2026)

These App Router groups were removed; middleware redirects cover bookmarks:

- `app/(client_portal)/`
- `app/(clients)/`
- `app/(relationships)/`
- `app/(sales)/`
- `app/(work)/`
- `app/(sandbox)/playground/`
- `app/(sandbox)/design-system/`

**Kept:** `app/(sandbox)/dev-login/`

## Agent doc sources of truth

When docs conflict, prefer in order:

1. `brand-identity/foundation/product-truth.md`
2. `brand-identity/voice/terminology.md`
3. Root `CLAUDE.md` / `AGENTS.md`
4. This file for historical context only
