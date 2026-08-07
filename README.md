# Salt

Salt is the proactive AI operating layer for your business.

It reads the state of the business from the places work already happens, finds what needs attention, prepares the next step, and waits for approval. The product shape is **See -> Act -> Approve**.

Current wedge: solo creative and service professionals with high-context, project-shaped client work.

---

## Current Product Surfaces

| Surface | Route | Purpose |
|---------|-------|---------|
| HQ | `/hq` | Daily operating home with Today, Upcoming, Stats, and Insights. |
| Plays | `/plays` | Approval outbox for work Salt prepares. |
| Captures | `/plays?tab=activity&view=captures` | Capture audit stream inside Plays Activity (`/capture` redirects here). |
| Ask Salt | Global modal/panel | Natural-language command surface for generating, routing, and acting. |
| Memory Map | `/memory` | Relationship and context graph across people, orgs, work, teams, resources, and notes (`/connections` redirects here). |
| Spaces | `/spaces` | Role-aware project/workspace command centers. |
| People / Orgs / Teams | `/people`, `/orgs`, `/teams` | Core entity views. |
| Work / Files / Me | `/work`, `/files`, `/me` | Supporting business memory and private studio knowledge. |

Some older routes still exist for compatibility or implementation history. Product truth lives in `brand-identity/foundation/product-truth.md`.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| App | Next.js 15.5.x, React 19, TypeScript 5.9.3 |
| UI | Tailwind CSS 4, shadcn/ui via `@repo/ui`, composed patterns via `@repo/patterns` |
| Data | Supabase PostgreSQL, Auth, Storage, RLS |
| Payments | Stripe |
| Email | Resend + React Email |
| Tests | Vitest and Playwright |
| Package manager | pnpm |

---

## Quick Start

### Prerequisites

- Node.js 20.x
- pnpm
- Supabase account
- Stripe account

### Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dlx supabase db push
pnpm dev
```

Visit `http://localhost:3000`.

Preferred local dev with 1Password secrets:

```bash
pnpm dev:op
```

Port `3000` is required for E2E tests and local app assumptions.

---

## Development Workflow

```bash
pnpm dev          # Start local dev server
pnpm dev:op       # Start local dev server with 1Password secrets
pnpm build        # Production build
pnpm lint --fix   # Lint and auto-fix
pnpm test         # Unit tests
pnpm test:e2e     # Playwright tests
pnpm test:all     # Unit + E2E
```

Use `pnpm` only. Do not use `npm` or `yarn` in this repo.

---

## Codebase Navigation

| Path | Purpose |
|------|---------|
| `app/(product)/` | Main Salt product routes: HQ, Plays, Connections, Spaces, entities. |
| `app/(settings)/` | Full-page settings routes. |
| `app/(public)/` | Public and marketing routes. |
| `app/_features/` | Domain feature modules. |
| `app/_lib/` | Shared infrastructure, integrations, demo data, security, tenancy. |
| `packages/ui/` | shadcn/ui primitives exported as `@repo/ui`. |
| `packages/patterns/` | Composed UI patterns exported as `@repo/patterns`. |
| `supabase/` | Database migrations and seeds. |
| `brand-identity/` | Product truth, positioning, voice, feature inventory, research. |
| `docs/` | Architecture, guides, plans, and implementation references. |

---

## Canonical Docs

| Topic | File |
|-------|------|
| Product truth | `brand-identity/foundation/product-truth.md` |
| Feature inventory | `brand-identity/product/feature-inventory.md` |
| Feature briefs | `brand-identity/product/features/` |
| Brand system rules | `brand-identity/CLAUDE.md` |
| Agent and engineering instructions | `CLAUDE.md` |
| Architecture history | `docs/plans/2026-05-14-architecture-transition-master-plan.md` |
| Testing strategy | `docs/guides/testing-strategy.md` |

---

## License

Proprietary - Salt by Simcoe House Inc.

---

Created by Gabriella Martins / Salt Studio.
