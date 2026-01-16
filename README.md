# Salt Core

**The studio operating system for designers and developers.**

<!-- Updated 2026-01-14: Testing Claude Code review integration -->

Salt Core is a complete SaaS platform that transforms capable individuals into high-leverage studio owners. Built on ShipFast's foundation with Next.js 15, Supabase, and Stripe—now with multi-tenant architecture, client portals (The Bridge), and AI-powered intelligence.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Stripe account (for billing)

### Setup
```bash
# 1. Clone and install
pnpm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your Supabase and Stripe keys

# 3. Run database migrations
npx supabase db push

# 4. Start dev server
pnpm dev
```

Visit `http://localhost:3000`

For detailed setup instructions, see [`docs/quick-start.md`](docs/quick-start.md).

---

## 🏗️ Architecture Overview

| Layer | Purpose | Key Files |
|-------|---------|-----------|
| **Tenancy** | Multi-tenant workspace isolation | `app/_lib/tenancy/context.ts` |
| **Permissions** | Role-based access & RLS helpers | `app/_lib/permissions/` |
| **Database** | Multi-tenant schema with RLS | `supabase/migrations/` |
| **Routes** | Tenant resolution & auth | `middleware.ts` |
| **Payments** | Stripe SaaS + Connect billing | `app/_lib/stripe/` |

## 🎯 For Developers
- **Tech Stack**: Next.js 15.1.9 + React 19 + TypeScript + Supabase + Stripe
- **Architecture**: Multi-tenant SaaS with studio-based tenancy
- **Velocity**: Optimized for AI-assisted development (see CLAUDE.md files)
- **Philosophy**: High-velocity, type-safe, atomic commits

## 📁 Codebase Navigation
- **`app/(public)/`** - Marketing site (landing, pricing, docs)
- **`app/(user_dashboard)/`** - Studio owner dashboard
- **`app/(client_portal)/`** - Client-facing portal (The Bridge)
- **`app/_features/`** - Feature modules (billing, auth, projects, meetings)
- **`app/_lib/`** - Infrastructure (Supabase, Stripe, tenancy, permissions)
- **`app/_components/`** - Reusable UI components
- **`packages/`** - Shared monorepo packages (`@repo/ui`, `@repo/utils`, etc.)

## ⚡️ Development Workflow
```bash
# Start development (MUST run on localhost:3000 for tests)
pnpm dev

# Run tests
pnpm test:all      # Unit + E2E tests
pnpm lint --fix    # Fix linting issues

# AI-Assisted Development
# See CLAUDE.md files for AI agent instructions
# Use velocity shortcuts: qplan → qcode → qcheck → qfix
```

---

## 📋 Product Roadmap

### ✅ Phase 0: Foundations (Complete)
- Multi-tenant architecture
- Tenant/permissions libraries
- Database schema + RLS
- Route groups

### 🚧 Phase 1: Core Marketing Site
- Landing page
- Pricing
- Docs

### 📅 Phase 2: User Dashboard MVP
- Client CRUD
- Project CRUD
- Billing integration

### 📅 Phase 3: Client Bridge MVP
- Client portal
- Project views
- Request workflow

### 📅 Phase 4: Custom Domains
- White-label portals
- DNS verification
- SSL provisioning

### 📅 Phase 5: Intelligence Layer
- AI audits
- Competitor analysis
- Strategy reports

---


## 📚 Documentation

- **For AI Agents**: `CLAUDE.md` files throughout codebase - Context-specific instructions
- **Architecture**: [`docs/architecture/`](docs/architecture/) - Multi-tenant design, auth flow, database schema
- **Development**: [`docs/guides/`](docs/guides/) - Testing, API patterns, UI standards
- **Reference**: [`docs/reference/`](docs/reference/) - Commands, environment variables

### Quick Links
- **Setup**: [`docs/quick-start.md`](docs/quick-start.md) - 5-minute setup guide
- **Testing**: [`docs/guides/testing-strategy.md`](docs/guides/testing-strategy.md) - Vitest + Playwright
- **Multi-tenancy**: [`docs/architecture/database-schema.md`](docs/architecture/database-schema.md) - RLS patterns

---

## 🤝 Contributing

Salt Core is a solo-built product by Gabriella Martins, but feedback and bug reports are welcome!

1. Open an issue (use templates in `.github/ISSUE_TEMPLATE/`)
2. For security issues, email directly (do not open public issue)

---

## 📄 License

Proprietary - Salt Core by SALT Studio

---

## 🙏 Credits

Built on [ShipFast](https://shipfa.st) by Marc Lou  
Created by [Gabriella Martins](https://createdbysalt.com) / [SALT Studio](https://createdbysalt.com)

---

**Let's build studios, not freelancers.** 🚀
