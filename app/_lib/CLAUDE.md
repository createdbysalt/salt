# Infrastructure Library Guide

**Context:** You are working with shared infrastructure modules.
**Architecture:** Technical utilities that features depend on, organized by capability.

## Purpose

The `_lib/` directory contains **infrastructure code** - technical utilities that are:
- Shared across multiple features
- Not business-logic specific
- External service integrations
- Cross-cutting concerns (rate limiting, security, etc.)

## Directory Structure

```
_lib/
├── supabase/           # Database client (server, client, admin, middleware)
├── stripe/             # Stripe utilities (Salt SaaS billing)
├── email/              # Email sending (Resend)
├── ai/                 # AI/GPT utilities
├── usage/              # Play metering, tiers, entitlements (see usage/CLAUDE.md)
├── rate-limit/         # Rate limiting
├── security/           # Tokens, safe URLs, encryption
├── tenancy/            # Multi-tenant context and guards
├── spaces/             # Spaces branding, queries, URLs
├── seo/                # Lighthouse, CrUX, LLM info
├── composio/           # Connector integrations
├── hooks/              # Shared React hooks
└── theme/              # Theme resolution and accent presets
```

## Available Modules

| Module | Purpose |
|--------|---------|
| `supabase` | Database client (server, client, admin, middleware) |
| `stripe` | Stripe client utilities (Salt SaaS billing only) |
| `email` | Email sending via Resend |
| `ai` | OpenAI/GPT integration — **a vendor spend primitive**, meter it (`docs/architecture/billing-metering.md`) |
| `usage` | Play metering, usage ledger, tier catalog, entitlements |
| `rate-limit` | API rate limiting |
| `security` | Tokens, safe URLs, encryption |
| `tenancy` | Multi-tenant context and guards |
| `spaces` | Spaces branding, queries, URLs |
| `seo` | Lighthouse, CrUX, structured data, LLM info |
| `composio` | Connector lifecycle and integrations |
| `hooks` | Shared React hooks (realtime, unread counts) |
| `theme` | Theme resolution and accent presets |

## Usage Pattern

```typescript
// Import from _lib modules
import { createServerClient } from '@/app/_lib/supabase/server'
import { sendEmail } from '@/app/_lib/email'
import { createRateLimiter } from '@/app/_lib/rate-limit'
import { generateToken, verifyToken } from '@/app/_lib/security'
import { getStripeClient } from '@/app/_lib/stripe'
```

## When to Add to _lib

Add code here if it:
1. Is used by 2+ features
2. Is infrastructure/technical (not business logic)
3. Wraps an external service
4. Is a cross-cutting concern

**Don't add:** Feature-specific utilities (those go in `_features/[feature]/utils.ts`)

## Module Pattern

Each module follows this structure:

```typescript
// app/_lib/[module]/index.ts

/**
 * [Module Name] - Brief description
 *
 * Usage:
 *   import { function1, function2 } from '@/app/_lib/[module]'
 */

export async function function1(input: Input): Promise<Output> {
  // Implementation with logging, error handling, etc.
}
```
