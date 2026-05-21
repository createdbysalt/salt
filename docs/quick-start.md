# 🚀 Quick Start Guide

**Goal:** Get Salt running locally in under 5 minutes.

## Prerequisites

| Requirement | Version | Installation |
|-------------|---------|--------------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 10+ | `npm install -g pnpm` |
| 1Password CLI | Latest | `brew install 1password-cli` |
| Supabase Account | - | [supabase.com](https://supabase.com) |
| Stripe Account | - | [stripe.com](https://stripe.com) |

## Setup Steps

### 1. Clone and Install

```bash
git clone https://github.com/Simcoe-House/salt.git
cd salt
pnpm install
```

### 2. Environment Configuration

**Option A: 1Password (Recommended)**

Secrets are managed via 1Password. See [1Password Setup Guide](./guides/1password-setup.md) to configure your vault items.

```bash
op signin  # Sign in to 1Password CLI
```

**Option B: Traditional .env.local**

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

**Required secrets:**

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Supabase Dashboard → Settings → API |
| `STRIPE_SECRET_KEY` | Stripe secret key | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | After running `stripe listen` |

### 3. Database Setup

```bash
# Run all migrations
npx supabase db push
```

This applies all 57+ migrations including:
- Multi-tenant schema
- Row Level Security policies
- Initial seed data

### 4. Start Development Server

```bash
pnpm dev:op    # Uses 1Password (recommended)
# or
pnpm dev       # Uses .env.local (backup if 1Password unavailable)
```

Visit `http://localhost:3000`

## First Steps

### Create Your Studio Account

1. Click **"Get Started"** on the landing page
2. Sign up with Google or Email
3. Complete onboarding flow

### Access Different Experiences

| Experience | URL | Description |
|------------|-----|-------------|
| Marketing Site | `localhost:3000` | Public landing pages |
| User Dashboard | `localhost:3000/dashboard` | Studio owner portal |
| Client Bridge | `localhost:3000/bridge/[clientSlug]` | Client-facing portal |

## Stripe Webhook Testing (Optional)

For payment testing locally:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Authenticate
stripe login

# Forward webhooks to local server
pnpm stripe:webhooks
```

Copy the webhook signing secret (starts with `whsec_`) to your `.env.local`.

## Verify Installation

Run the build to catch any configuration issues:

```bash
pnpm build
```

Common issues:
- Missing environment variables
- Database connection errors
- Incorrect Node.js version

## Next Steps

- Read [Architecture Overview](./architecture/system-overview.md)
- Understand [Multi-Tenancy](./architecture/multi-tenancy.md)
- Review [Development Workflow](./guides/development-workflow.md)