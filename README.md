# Salt Core

**The studio operating system for designers and developers.**

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
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your Supabase and Stripe keys

# 3. Run database migrations
npx supabase db push

# 4. Start dev server
npm run dev
```

Visit `http://localhost:3000`

---

## 🏗️ Architecture

Salt Core uses a **multi-tenant architecture** with three distinct experiences:

### 1. Core Marketing Site (`app/(core_marketing_site)`)
- Public landing pages
- Pricing, docs, blog
- Lead capture

### 2. User Dashboard (`app/(user_dashboard)`)
- For developers/designers who buy Salt Core
- Manage clients, projects, team members
- Configure billing, settings
- Access: `app.saltcore.dev` or `/dashboard`

### 3. Client Bridge (`app/(client_bridge)`)
- Client-facing portal (your customers)
- View projects, deliverables, analytics
- Request changes, manage assets
- Access: `bridge.saltcore.dev/[clientSlug]` or custom domains

---

## 🔐 Security Model

### Tenant Isolation
Salt Core implements **strict multi-tenancy**:
- **Studios** are the primary tenant (your customers)
- **Clients** belong to studios (their customers)
- **Projects** belong to both studio AND client
- **Row Level Security (RLS)** enforces isolation at database level

### The Safety Rails
Two centralized libraries prevent security bugs:

**`libs/tenancy/*`** - Tenant context resolution
- Determines: studio member, client user, or anonymous
- Single source of truth for "who is this user?"
- Used by all routes/API endpoints

**`libs/permissions/*`** - Permission checks
- Role-based access control (owner/admin/member/viewer)
- RLS query helpers
- Scoped database queries

**Always use these libraries.** Never implement auth logic directly.

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

---

## 🗄️ Database Schema

```
studios (Salt Core customers)
├── studio_members (team members)
├── clients (their customers)
│   ├── client_users (portal access)
│   ├── bridge_portals (theming, subdomain)
│   └── projects
└── projects (studio + client)
```

See `PHASE_0_COMPLETE.md` for detailed ERD.

---

## 🔄 Development Workflow

### Branch Strategy
- **main** - production
- Feature branches: `SC-{issue}-{description}`
- Small PRs, frequent merges

### Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add client authentication`
- `fix: stripe webhook validation`
- `refactor: centralize tenant logic`

### PR Checklist
- [ ] TypeScript compiles (`npm run build`)
- [ ] Lint passes (`npm run lint`)
- [ ] Tests pass (when applicable)
- [ ] RLS reviewed (if database changes)
- [ ] No exposed secrets
- [ ] Security checklist complete

See `.github/PULL_REQUEST_TEMPLATE.md` for full checklist.

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

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5.9+
- **Database**: Supabase (PostgreSQL + RLS)
- **Auth**: Supabase Auth (Google OAuth + Email)
- **Payments**: Stripe
- **Styling**: TailwindCSS 4 + shadcn UI (token-driven design system)
- **Email**: Resend
- **Deployment**: Vercel

---

## 🔧 Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run lint             # Run ESLint

# Database
npx supabase db reset    # Reset local database
npx supabase db push     # Push migrations to remote
npx supabase migration new NAME  # Create new migration

# Supabase
npx supabase start       # Start local Supabase
npx supabase status      # Check status
```

---

## 🤝 Contributing

Salt Core is a solo-built product by Gabriella Martins, but feedback and bug reports are welcome!

1. Open an issue (use templates in `.github/ISSUE_TEMPLATE/`)
2. For security issues, email directly (do not open public issue)

---

## 📚 Documentation

- [Phase 0 Summary](PHASE_0_COMPLETE.md) - Architecture overview
- [Workflow Guide](.github/LINEAR_GITHUB_WORKFLOW.md) - Development process
- [Brand Identity](brand/bible/salt_core_identity.md) - Product positioning

---

## 📄 License

Proprietary - Salt Core by SALT Studio

---

## 🙏 Credits

Built on [ShipFast](https://shipfa.st) by Marc Lou  
Created by [Gabriella Martins](https://createdbysalt.com) / [SALT Studio](https://createdbysalt.com)

---

**Let's build studios, not freelancers.** 🚀
