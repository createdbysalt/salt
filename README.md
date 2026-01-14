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

## 📂 Key Files

| Purpose | File |
|---------|------|
| Tenant resolution | `libs/tenancy/context.ts` |
| Permission checks | `libs/permissions/checks.ts` |
| RLS helpers | `libs/permissions/rls.ts` |
| Database schema | `supabase/migrations/` |
| Middleware | `middleware.ts` |
| Config | `config.ts` |



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

- **Architecture**: [`docs/architecture/`](docs/architecture/) - System design, security, auth flow, multi-tenancy
- **Implementation**: [`docs/guides/`](docs/guides/) - Coding patterns, testing, workflow, error handling
- **Reference**: [`docs/reference/`](docs/reference/) - Commands, env vars, folder structure
- **Quick Start**: [`docs/quick-start.md`](docs/quick-start.md) - 5-minute setup guide

For specific topics:
- **Setup**: [`docs/quick-start.md`](docs/quick-start.md)
- **Commands**: [`docs/reference/cli-commands.md`](docs/reference/cli-commands.md)
- **Stripe**: [`docs/guides/stripe-integration.md`](docs/guides/stripe-integration.md)
- **Testing**: [`docs/guides/testing-strategy.md`](docs/guides/testing-strategy.md)

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
