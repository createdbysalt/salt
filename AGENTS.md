# Agent instructions (Cursor + Claude Code)

This repo uses **two AI harnesses** on the same codebase. Standards are shared; invocation differs.

| | Primary | Backup |
|---|---------|--------|
| **Tool** | Cursor | Claude Code (`claude` in terminal) |
| **Rules** | `.cursorrules`, `.cursor/rules/` | `CLAUDE.md` (auto-loaded) |
| **Workflows** | `.cursor/skills/` + `q*` triggers | `.claude/commands/` slash commands |
| **Subagents** | Skills + MCP | `.claude/agents/` |

## Read first

1. **`CLAUDE.md`** (root) — tech stack, `pnpm` commands, doc index, nested `CLAUDE.md` map  
2. **`docs/guides/dual-agent-setup.md`** — sync policy, trigger ↔ slash mapping, new machine checklist  
3. **`docs/guides/greptile-setup.md`** — Greptile GitHub app + API key + Cursor MCP  

## Velocity triggers (Cursor)

Defined in `.cursorrules`: `qgo`, `qplan`, `qcode`, `qtest`, `qfix`, `qrestart:staging`, `qresearch gemini`, `qresearch perplexity`, `qreview`, `qreview-pragmatic`, `qcleanup`, `qstructure`, `qsource`, `qux`, `qdb`, `qscout`, `stripe`.

**Slash commands (Cursor):** type `/` in chat — e.g. `/devup-staging` (see `.cursor/commands/`).

## Secrets (1Password)

Vault: **`salt-software-development`**

```bash
pnpm dev:op              # Next.js with injected secrets (production Supabase)
pnpm dev:staging:op      # Staging Supabase only (.env.staging.1password)
pnpm dev:staging:restart:op  # Kill :3000 + start staging (shortcut for qrestart:staging)
# qgo / /go → scripts/staging-session.sh — new or continue feat/* on staging
pnpm research:op --query "..."    # Gemini research script (`qresearch gemini`)
pnpm env:op-check             # GEMINI, GREPTILE, PERPLEXITY, Brandfetch, Apify keys
# qresearch perplexity → Perplexity MCP (perplexity_ask / perplexity_research)
```

Launch Cursor with MCP secrets:

```bash
op run --env-file=.env.1password -- open -a Cursor .
```

## Nested context

When editing files in a directory, read that directory's `CLAUDE.md` if present (e.g. `app/_features/CLAUDE.md`, `supabase/CLAUDE.md`).

## Tool registry

Full inventory: `.claude/tool-registry.md`

## Global open-source references

`opensrc` fetches and caches source code from npm, PyPI, crates.io, and GitHub. Use it when you need to inspect package or repo internals beyond public docs and type definitions.

```bash
pnpm opensrc path zod          # Get path to Zod source
pnpm opensrc path react        # Get path to React source
pnpm opensrc path vercel/ai    # Get path to GitHub repo
pnpm opensrc list              # Show cached packages and repos
```

When asked to add or inspect external open-source repos for future reference, use the global cache at `/Users/gabriellamartins/.opensrc`.

- Source index: `/Users/gabriellamartins/.opensrc/sources.json`
- Repo checkout convention: `/Users/gabriellamartins/.opensrc/repos/github.com/<owner>/<repo>/<branch>`
- Prefer `pnpm opensrc path <package-or-github-repo>` so the helper owns fetching and indexing.

## Cursor Cloud specific instructions

### Node.js version

This project requires **Node.js 20.x** (pinned to `20.19.6` via Volta in `package.json`). The Cloud VM default is Node 22 which causes ESLint/ajv crashes. The update script handles switching via nvm.

### Starting the dev server

```bash
source ~/.nvm/nvm.sh && nvm use 20.19.6
pnpm dev
```

The server starts on **port 3000** (required — E2E, auth redirects, and DB configs are hardcoded to it). If port 3000 is busy: `lsof -ti:3000 | xargs kill -9`.

### Environment variables

Without 1Password CLI, use `.env.local` (copy from `.env.example`). The dev server starts with placeholder values but Supabase/Stripe features will fail at runtime without real keys. Required secrets for full functionality:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`

### Lint

`pnpm lint` (runs `eslint .` directly) has a **known pre-existing failure** due to ajv/eslintrc compatibility with ESLint 9.39+. TypeScript type-checking works: `pnpm typecheck`.

### Tests

- Unit: `pnpm test` (Vitest — runs fast, no external deps needed)
- E2E: `pnpm test:e2e` (Playwright — requires the dev server on port 3000 and real Supabase credentials)

### Key routes for smoke-testing

| Route | Auth | Notes |
|-------|------|-------|
| `/` | None | Marketing homepage |
| `/pricing` | None | Pricing page |
| `/dev-login` | None | Dev login sandbox (use "Studio User" quick-fill) |
| `/hq` | Session | Authenticated entry point (HQ Today view). Redirects to sign-in without auth. |
| `/people` | Session | Primary nav target for contacts/relationships (replaced legacy `/clients`) |
| `/work` | Session | Projects and work surface |
| `/spaces` | Session | Roadmap surface (not in MVP) — redirects to `/work` until it ships |
| `/memory` | Session | Memory Map graph (`/connections` redirects here); tabs: Map / Activity / Rules |
| `/sources` | Session | Intake surface: Connectors + Activity (capture stream) |
| `/plays` | Session | Approval outbox (Queue / Playbooks / Activity) |
| `/billing` | Session | Billing surface (`app/(product)/billing/page.tsx`) |
| `/ops` | Founder only | Ops dashboard (canary, capture pipeline, spend) — 404 for non-admins. See `docs/architecture/ops-ops.md` |

> **Legacy / non-primary routes:**
> - `/studio` and `/dashboard/*` are legacy URLs handled by `middleware.ts` — they redirect to the current root-level routes (`/hq`, `/people`, etc.).
> - `/clients` and `/relationships` redirect to `/people`. `/people` is the canonical surface.
> - `/capture` redirects to `/sources?tab=activity`. `/notes` redirects to `/me`. `/connections` redirects to `/memory`. `/roundtables` and `/tables` redirect to `/work`. `/spaces` redirects to `/work` until the roadmap Spaces surface ships (Spaces is not in the MVP).
> - Pre-reorg Plays URLs: `/plays?tab=customize` → `/plays?tab=playbooks` (or `/sources` for connectors), `/plays?tab=activity&view=captures` → `/sources?tab=activity`, `/plays?filter=learning` → `/memory?tab=activity` (`?tab=filter` is a legacy alias).
> - On the `app.usesalt.io` (and `app.lvh.me`) subdomain, `/` redirects to `/hq`.
