# Environment Variables Reference

**Context:** Complete list of environment variables used by Salt.

> **Recommended:** Use 1Password CLI for secret management. See [1Password Setup Guide](../guides/1password-setup.md).
>
> ```bash
> pnpm dev      # Uses .env.local (traditional)
> pnpm dev:op   # Uses 1Password (recommended)
> ```

## Required Variables

These must be set for the application to start:

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | `eyJhbGc...` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | `eyJhbGc...` | Supabase Dashboard → Settings → API |

## Deployment & URLs

Hosted environments: [deployment-environments.md](../guides/deployment-environments.md).

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_DEPLOYMENT_ENV` | `production`, `staging`, or `development` | `staging` on Vercel staging branch |
| `NEXT_PUBLIC_PRODUCT_AUTH_ENABLED` | Override product sign-in gate. `true` = allow `/signin` and app routes; `false` = waitlist-only. Unset = auto (staging + local allow; production + previews block) | `true` on staging branch |
| `NEXT_PUBLIC_SITE_URL` | Marketing origin | `https://usesalt.io` |
| `NEXT_PUBLIC_APP_URL` | App origin (OAuth callbacks) | `https://app.usesalt.io` |

## Stripe Variables

### SaaS Billing (Required)

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_test_...` | Stripe Dashboard → API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` | After running `stripe listen` |
| `STRIPE_PRICE_ID` | Monthly subscription price ID | `price_...` | Stripe Dashboard → Products |

### Stripe Connect (Optional)

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connect webhook secret | `whsec_...` | After running `stripe listen` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public key for Connect | `pk_test_...` | Stripe Dashboard → API keys |

## Email Variables

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `RESEND_API_KEY` | Resend API key | `re_...` | Resend Dashboard → API Keys |
| `EMAIL_FROM` | From email address | `team@usesalt.io` | Your verified domain |
| `EMAIL_REPLY_TO` | Reply-to address | `support@usesalt.io` | Any valid email |

## Application Configuration

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Application URL | `https://app.usesalt.io` | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Salt` | `Salt` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email | `support@usesalt.io` | Required |

## Feature Flags (Optional)

| Variable | Description | Options | Default |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Enable analytics | `true`, `false` | `false` |
| `NEXT_PUBLIC_ENABLE_CRISP` | Enable Crisp chat | `true`, `false` | `false` |
| `CRISP_WEBSITE_ID` | Crisp website ID | `xxx-xxx-xxx` | - |

## OAuth Providers (Optional)

### Google OAuth

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID | Google Cloud Console → APIs → Credentials |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret | Google Cloud Console → APIs → Credentials |

### GitHub OAuth

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `GITHUB_CLIENT_ID` | OAuth app ID | GitHub → Settings → OAuth Apps |
| `GITHUB_CLIENT_SECRET` | OAuth app secret | GitHub → Settings → OAuth Apps |

## Development Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `NODE_ENV` | Environment | `development`, `production` | Set automatically |
| `NEXT_PUBLIC_ENABLE_DEBUG` | Debug mode | `true`, `false` | Development only |
| `ANALYZE` | Bundle analyzer | `true`, `false` | Build-time only |

## Security Variables

| Variable | Description | Example | Notes |
|----------|-------------|---------|-------|
| `NEXTAUTH_SECRET` | Session encryption | Random 32+ chars | Generate with `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Data encryption key | Random 32 chars | For sensitive data |
| `RATE_LIMIT_SECRET` | Rate limiter secret | Random string | Optional |

## External Services (Optional)

### OpenAI (fallback)

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (fallback when OpenRouter unavailable) | `sk-...` |
| `OPENAI_MODEL` | Default model slug for legacy call sites | `gpt-4o-mini` |
| `OPENAI_ORG_ID` | Organization ID | `org-...` |

### OpenRouter (primary LLM routing)

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | `sk-or-...` |
| `OPENROUTER_BASE_URL` | API base URL | `https://openrouter.ai/api/v1` |
| `AI_MODEL_INSIGHTS` | HQ insights workload override | `openai/gpt-4o-mini` |
| `AI_MODEL_EXTRACTION` | Intake extraction override | `openai/gpt-4o` |
| `AI_MODEL_SUMMARIZATION` | File summarization override | `openai/gpt-4o` |
| `AI_MODEL_MEETING` | Meeting summary override | `openai/gpt-4o` |
| `AI_MODEL_OPPORTUNITY` | First-scan opportunity draft | `anthropic/claude-sonnet-4` |
| `AI_MODEL_PLAY_DRAFT` | Starter play draft generation | `anthropic/claude-sonnet-4` |

Routing registry: `app/_lib/ai/models.ts`. Research doc: `brand-identity/research/2026-06-09-openrouter-model-routing.md`.

### Composio (integrations)

| Variable | Description | Example |
|----------|-------------|---------|
| `COMPOSIO_API_KEY` | Composio platform API key (use **full-access** write key in 1Password) | From composio.dev |
| `ANTHROPIC_API_KEY` | Optional — required for `app/_lib/composio/agent.ts` (`streamComposioAgent`) | From anthropic.com |

SDK: `@composio/core` + `@composio/vercel` (Tool Router + Vercel AI SDK). Agent helper: `app/_lib/composio/agent.ts`.

Entity ID for connections: `studio_id` (see `app/_lib/composio/connections.ts`). Gmail and Google Calendar connect via Composio OAuth; Stripe Connect stays native.

### AWS S3

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | `xxx...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket | `saltcore-uploads` |

### Sanity CMS (Marketing Site)

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project ID | `k3w7fhoy` | Sanity Dashboard → Project Settings |
| `NEXT_PUBLIC_SANITY_DATASET` | Dataset name | `production` | Sanity Dashboard → Datasets |
| `SANITY_API_READ_TOKEN` | Read-only API token | `skl0...` | Sanity Dashboard → API → Tokens |
| `SANITY_API_WRITE_TOKEN` | Write API token (server-only) | `skfo...` | Sanity Dashboard → API → Tokens |

**Note:** Sanity powers Salt's marketing site content (landing pages, blog posts, case studies, testimonials). The `NEXT_PUBLIC_` variables are safe to expose client-side for reading published content.

### AI Agents (Claude Code)

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `GEMINI_API_KEY` | Gemini API key for `qresearch` / gemini-research | `AIza...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `GREPTILE_API_KEY` | Greptile API for PR review MCP (Cursor) | `grp_...` | [app.greptile.com/settings/organization/api](https://app.greptile.com/settings/organization/api) |
| `FIRECRAWL_API_KEY` | Firecrawl API key for web scraping | `fc-...` | [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys) |
| `APIFY_API_TOKEN` | Apify REST API (social scraper scripts) | `apify_api_...` | Apify Console → Integrations |
| `APIFY_TOKEN` | Same token — **stdio MCP only** (`@apify/actors-mcp-server`) | `apify_api_...` | Same as above |

**1Password:** `GEMINI_API_KEY`, `GREPTILE_API_KEY`, `APIFY_API_TOKEN`, and `APIFY_TOKEN` are in `.env.1password`. Run `pnpm env:op-check` to verify keys and Apify API auth. Launch Cursor via `op run --env-file=.env.1password -- open -a Cursor .` so MCP sees secrets. See [1Password Setup Guide](../guides/1password-setup.md).

**Note:** These variables support AI agent workflows in `.cursor/skills/`, `.claude/agents/`, and MCP servers in `.mcp.json`:
- `GEMINI_API_KEY` — `gemini-research` skill, `.claude/scripts/gemini-research.sh`
- `GREPTILE_API_KEY` — Greptile MCP (`grep-loop-review-workflow` / `qreview`)
- `FIRECRAWL_API_KEY` — Firecrawl MCP for LLM-ready web scraping, full site crawls, PDF parsing
- `APIFY_API_TOKEN` / `APIFY_TOKEN` — Apify MCP and social scraper scripts (MCP requires `APIFY_TOKEN` env name)
- Stripe variables (above) — Used by `payment-keeper` agent

## Environment File Examples

### `.env.local` (Development)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=team@localhost.com
EMAIL_REPLY_TO=support@localhost.com

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Salt Dev
NEXT_PUBLIC_SUPPORT_EMAIL=dev@localhost.com
```

### `.env.production` (Production)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# Email
RESEND_API_KEY=re_...
EMAIL_FROM=team@usesalt.io
EMAIL_REPLY_TO=support@usesalt.io

# App
NEXT_PUBLIC_SITE_URL=https://app.usesalt.io
NEXT_PUBLIC_APP_NAME=Salt
NEXT_PUBLIC_SUPPORT_EMAIL=support@usesalt.io

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CRISP=true
CRISP_WEBSITE_ID=xxx-xxx-xxx
```

## Variable Validation

Salt validates environment variables on startup:

```typescript
// libs/env.ts
const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "RESEND_API_KEY",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
```

## Security Notes

### Public vs Private

- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- All other variables are server-only
- Never put secrets in `NEXT_PUBLIC_` variables

### Sensitive Variables

Never commit these to version control:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- Any OAuth secrets
- Database URLs with passwords

### Local Development

Use `.env.local` for local development:
- Automatically loaded by Next.js
- Git ignored by default
- Overrides `.env` values

### Production Deployment

For Vercel deployment:
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select appropriate environments (Production, Preview, Development)
4. Redeploy for changes to take effect