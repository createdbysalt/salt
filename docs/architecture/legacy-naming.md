# Legacy naming reference

Retired product terms and where legacy strings still appear in code. **Do not use these in new user-facing copy, agent docs, or SEO.**

| Retired (user-facing) | Current | Notes |
|----------------------|---------|--------|
| The Bridge | Spaces | Shared client/project workspace |
| The Table / Roundtables | Spaces | Same surface; "table" and "roundtables" subdomains redirect to `/spaces` |
| Client portal | Spaces | Not lead positioning |
| Studio OS / business OS | Proactive AI for your business | Marketing category |
| Dashboard (product) | HQ | Command center |
| Clients / Relationships routes | People | `/people` |
| Capture (top-level route) | Plays Activity → Captures | `/capture` redirects to `/plays?tab=activity&view=captures` |
| Notes (top-level route) | Me | `/notes` redirects to `/me` |
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
| `/sales/*` | `/hq` |
| `/capture` | `/plays?tab=activity&view=captures` |
| `/notes` | `/me` |
| `/roundtables`, `/tables` | `/spaces` |
| `bridge.*`, `table.*` subdomains | `/spaces` |
| `app.*` subdomain `/` | `/hq` |

**Canonical (not legacy):** `/work` and `/spaces` are active product routes under `app/(product)/`.

## Code / DB names (migration planned)

| Legacy identifier | Location | Status |
|-------------------|----------|--------|
| `studios`, `studio_id`, `studio_members` | PostgreSQL / Supabase | **Active.** Rename to `workspaces` / `workspace_id` / `workspace_members` planned — see `docs/plans/2026-06-09-workspace-rename-rfc.md` |
| `BridgeBrandingConfig`, `bridgeOverviewConfigSchema` | `app/_lib/spaces/` | Type names; legacy Bridge naming in types |
| `serve` feature module | `app/_features/serve/` | Spaces branding settings implementation |
| `/studio/settings` URLs | Onboarding setup cards | **Fixed** → `/settings/integrations` |

## Module rename map (2026 cleanup)

| Old path | New path |
|----------|----------|
| `app/_lib/table/` | `app/_lib/spaces/` |
| `app/_lib/roundtables/` | `app/_lib/spaces/` |
| `app/_features/table-command-center/` | `app/_features/spaces/` |
| `app/_features/roundtables/` | `app/_features/spaces/` |
| `app/(hq)/` | `app/(product)/` |
| `app/(billing)/` | `app/(product)/billing/` |
| `app/(studio)/settings/` | `app/(settings)/settings/` |

## Deleted route groups

These App Router groups were removed; middleware redirects cover bookmarks:

- `app/(client_portal)/`
- `app/(clients)/`
- `app/(relationships)/`
- `app/(sales)/`
- `app/(billing)/`
- `app/(hq)/` (replaced by `(product)/`)
- `app/(studio)/`
- `app/(sandbox)/playground/`
- `app/(sandbox)/design-system/`

**Kept:** `app/(sandbox)/dev-login/`, `app/(sandbox)/email-preview/`

## Brand drift check exceptions

`scripts/check-brand-drift.sh` flags the retired term **The Table**. These strings are **allowed** — they refer to the **Money on the Table** calculator, not Spaces:

| Allowed string | File(s) | Reason |
|----------------|---------|--------|
| `Money On The Table Quiz` | `money-on-the-table-links.ts`, `site-settings-fallback.ts` | Public feature name for `/money-on-the-table` |

## Brand drift check exceptions

`scripts/check-brand-drift.sh` flags the retired term **The Table**. These strings are **allowed** — they refer to the **Money on the Table** calculator, not Roundtables:

| Allowed string | File(s) | Reason |
|----------------|---------|--------|
| `Money On The Table Quiz` | `money-on-the-table-links.ts`, `site-settings-fallback.ts`, `footer-explore-links.ts` | Public feature name for `/money-on-the-table` |

## Agent doc sources of truth

When docs conflict, prefer in order:

1. `brand-identity/foundation/product-truth.md`
2. `brand-identity/voice/terminology.md`
3. Root `CLAUDE.md` / `AGENTS.md`
4. This file for historical context only
