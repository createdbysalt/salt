# Environment Variables Reference

**Context:** Complete list of environment variables used by Salt Core.

## Required Variables

These must be set for the application to start:

| Variable | Description | Example | Where to Find |
|----------|-------------|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | `eyJhbGc...` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) | `eyJhbGc...` | Supabase Dashboard → Settings → API |

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
| `EMAIL_FROM` | From email address | `team@saltcore.dev` | Your verified domain |
| `EMAIL_REPLY_TO` | Reply-to address | `support@saltcore.dev` | Any valid email |

## Application Configuration

| Variable | Description | Example | Default |
|----------|-------------|---------|---------|
| `NEXT_PUBLIC_SITE_URL` | Application URL | `https://app.saltcore.dev` | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `Salt Core` | `Salt Core` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Support email | `support@saltcore.dev` | Required |

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

### OpenAI

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `OPENAI_ORG_ID` | Organization ID | `org-...` |

### AWS S3

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret | `xxx...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket | `saltcore-uploads` |

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
NEXT_PUBLIC_APP_NAME=Salt Core Dev
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
EMAIL_FROM=team@saltcore.dev
EMAIL_REPLY_TO=support@saltcore.dev

# App
NEXT_PUBLIC_SITE_URL=https://app.saltcore.dev
NEXT_PUBLIC_APP_NAME=Salt Core
NEXT_PUBLIC_SUPPORT_EMAIL=support@saltcore.dev

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_CRISP=true
CRISP_WEBSITE_ID=xxx-xxx-xxx
```

## Variable Validation

Salt Core validates environment variables on startup:

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