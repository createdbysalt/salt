# Salt

Salt is an AI assistant for small service businesses. It connects to the apps where work already happens (email, calendar, CRM, accounting, payments), reads what is going on, prepares the next step, and waits for approval before anything is sent or spent.

This is the source of a pre-launch product built by one person. The repository began in December 2025 as a client-portal product for a small studio; in May 2026 it was pivoted, in place, into Salt, keeping the billing and auth and replacing the rest. Commits before late May 2026 belong to that earlier product. It is published as a portfolio: the code is real and runs, but there are no paying customers and the repository is not maintained as an open-source project. See **License** below.

## Start here

If you have fifteen minutes, these are the parts worth reading, in order.

| What | Where | Why it is interesting |
| --- | --- | --- |
| Usage metering and billing | `app/_lib/usage/` and its `CLAUDE.md`, `app/_lib/stripe/`, `app/api/webhook/stripe/route.ts` | Versioned immutable price catalog, append-only ledger enforced by a Postgres trigger, overage capped at the cost of upgrading, a cost-to-revenue circuit breaker, and idempotent Stripe webhooks that derive the plan from the paid price ID. |
| The incident that changed the CI | `app/_lib/usage/CLAUDE.md` ("Grants are load-bearing"), `.github/workflows/billing-rls.yml`, `scripts/verify-billing-ledger-writable.mjs` | The ledger tables silently refused every write for a day because the ledger fails soft by design and unit tests mock the database. The fix was the grants; the lesson was a daily job that checks live permissions. |
| AI layer | `app/_lib/ai/models.ts`, `app/_lib/ai/gpt.ts`, `app/_features/plays/playbooks/` | Per-workload model routing across OpenAI, Anthropic, and Google by cost, capability, and latency; a single metered LLM exit point whose required spend context makes missing cost attribution a compile error; a versioned playbook engine with per-playbook eval suites (`playbooks/v2/**/evals/`) and a validation gate in CI. |
| Connector platform | `app/_lib/composio/`, `app/_features/connectors/` | Database-driven catalog over Composio OAuth (83 connectable apps in the catalog at the time of publishing), connection health checks, LLM-classified tool risk with a required human confirmation before any mutating action, HMAC-verified inbound webhooks with replay dedupe, and an hourly synthetic canary. |
| Self-serve growth path | `app/_features/connectors/actions/`, `middleware.ts`, `app/_features/marketing/waitlist-funnel.ts`, `scripts/waitlist-conversion-report.ts` | Connector OAuth from the Sources surface, a middleware-assigned A/B test carried as a PostHog super-property, and a four-stage server-side funnel persisted to Postgres with a conversion-report CLI. (`app/_features/onboarding/` is an unrouted five-step prototype; the live setup path is `app/_features/setup/`.) |
| Operator view | `app/(ops)/` | Founder-only dashboard over connector health, a review queue, plays, users, and memory. |
| Decisions and architecture | `docs/decisions/`, `docs/architecture/` | ADRs and the architecture notes the code was built against. |

## Stack

Next.js 15 (App Router, Server Actions, route handlers, middleware), React 19, TypeScript 5.9, Tailwind 4, Supabase Postgres with row-level security, Stripe, Vercel AI SDK, Composio, PostHog, Resend, Sanity. Vitest for unit tests (4,200+ cases), Playwright for end-to-end specs, GitHub Actions for CI (typecheck, unit tests, playbook validation, CodeQL, a daily live-grant check). Deployed on Vercel with staged `staging` and `main` releases and twelve scheduled jobs.

## Running it

```bash
corepack enable            # or: npm i -g pnpm
pnpm install
cp .env.example .env.local # fill in Supabase, Stripe, and at least one model provider
pnpm dlx supabase db push  # applies supabase/migrations to your Supabase project
pnpm dev                   # http://localhost:3000
```

Checks that run without any external service:

```bash
pnpm typecheck
pnpm test
pnpm playbooks:validate
pnpm lint
```

End-to-end specs in `e2e/` need a running app with seeded test users (`pnpm seed:test-users`) and are run before releases, not in CI.

## How it was built

One engineer, working in Claude Code and Cursor. The repository's `CLAUDE.md`, nested `CLAUDE.md` files, `AGENTS.md`, and `.claude/` directory are the operating instructions those tools ran under; they are kept here because they are part of how the work was done. The architecture, data model, billing design, and review were mine; the tools did most of the typing.

The repository began from a commercial Next.js boilerplate. Its authentication, billing, and routing were replaced in the first weeks; the remaining boilerplate-derived files were removed or rewritten before this copy was published, and this copy carries no history from that template. The current visual system was ported in waves from a prototype built in Lovable and a separate design-token bundle (see `DESIGN.md`).

## What is omitted from this copy

Environment files, Playwright storage state, the `brand-identity/` folder (positioning, pricing, legal drafts, and research), an `archive/` folder of retired surfaces, one-off scripts that ran against live data, and planning documents that name customers, partners, or finances. The git history was rewritten to remove the same material, the commercial boilerplate it started from, and a few personal identifiers, so early commits may not build on their own. Some internal docs still reference `brand-identity/` paths; those references are intentional dead links.

## Status

Pre-launch. A waitlist and marketing site are live at usesalt.io; the application sits behind a login. The product category moved quickly in September 2026, and this codebase is now published as a record of the work rather than as a product in active development.

## License

Copyright 2026 Simcoe House Inc. All rights reserved.

The source is published for reading and evaluation. You may clone and run it locally to review it. You may not use it in a product, redistribute it, or create derivative works from it without written permission. The pricing catalog, usage ledger, and webhook idempotency modules may be released separately under an open-source license later.

Gabriella Martins, gabriellacsmartins@outlook.com
