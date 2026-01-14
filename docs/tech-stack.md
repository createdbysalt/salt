# Tech Stack

> Analyzed from actual code: `package.json`, config files, and directory structure.

## Core Framework

| Technology | Version | Notes |
|------------|---------|-------|
| Next.js | 15.1.9 | App Router |
| React | 19.2.3 | |
| TypeScript | 5.9.3 | Strict mode disabled |
| Node.js | 20.19.6 | Volta-locked |

## Database & Backend

| Technology | Version | Notes |
|------------|---------|-------|
| Supabase | 2.45.0 | PostgreSQL + Auth + Storage |
| Supabase SSR | 0.8.0 | Server-side auth |
| PostgreSQL | (via Supabase) | 57+ migrations, RLS policies |

**No ORM** - Direct Supabase client queries only.

## Styling & UI

| Technology | Version | Notes |
|------------|---------|-------|
| Tailwind CSS | 4.1.10 | Via `@tailwindcss/postcss` |
| shadcn/ui | 3.6.2 | 30+ components in `components/ui/` |
| Radix UI | Various | 16 primitives (dialog, dropdown, tabs, etc.) |
| Framer Motion | 12.23.26 | Animations |
| Lucide React | 0.562.0 | Icons |
| Geist | 1.5.1 | Font family |
| next-themes | 0.4.6 | Dark mode support |

## Payments

| Technology | Version | Notes |
|------------|---------|-------|
| Stripe | 13.11.0 | SaaS subscriptions |
| Stripe Connect | - | Client billing (invoices) |

## Email

| Technology | Version | Notes |
|------------|---------|-------|
| Resend | 4.0.1 | Primary email service |
| Nodemailer | 7.0.12 | Backup/alternative |

## Forms & Validation

| Technology | Version | Notes |
|------------|---------|-------|
| React Hook Form | 7.69.0 | Form state management |
| Zod | 3.24.1 | Schema validation |

## Utilities

| Technology | Version | Purpose |
|------------|---------|---------|
| @dnd-kit | 6.3.1 | Drag & drop |
| cmdk | 1.1.1 | Command palette |
| date-fns | 4.1.0 | Date utilities |
| Recharts | 3.6.0 | Charts/graphs |
| Axios | 1.13.2 | HTTP client |
| Crisp SDK | 1.0.26 | Customer chat widget |

## Testing

| Technology | Version | Notes |
|------------|---------|-------|
| Playwright | 1.40.0 | E2E testing only |

## Dev Tools

| Technology | Version | Notes |
|------------|---------|-------|
| ESLint | 9.39.2 | With Next.js config |
| PostCSS | 8.4.49 | Tailwind processing |
| tsx | 4.19.0 | Script runner |

## NOT Using

These appear in types or legacy code but are **not actively used**:

- Mongoose/MongoDB - only `@types/mongoose` exists
- Drizzle - no config found
- Prisma - no schema found
- DaisyUI - not used (shadcn/ui preferred, see `check:no-daisyui` script)
- Headless UI - removed, using Radix UI instead
- Jest - only types, Playwright used instead

## Architecture

```
app/
├── (client_bridge)/     # Client portal (multi-tenant)
├── (user_dashboard)/    # Studio owner dashboard
├── api/                 # API routes + webhooks
├── actions/             # Server actions
├── bridge/              # Bridge pages
└── signin/              # Auth pages

libs/
├── supabase/            # DB clients (server, client, admin)
├── tenancy/             # Multi-tenant context resolution
├── permissions/         # RLS helpers & role checks
├── stripe*.ts           # Payment logic (SaaS + Connect)
└── *-emails.ts          # Email templates (SaaS + Bridge)

supabase/
└── migrations/          # 57+ PostgreSQL migrations with RLS
```

## Constraints

1. **No ORM** - Use Supabase client directly
2. **Tailwind 4** - CSS-first config (no `tailwind.config.js`)
3. **App Router only** - No Pages Router
4. **Server Actions** - Preferred over API routes for mutations
5. **RLS enforced** - All tables have Row-Level Security policies
