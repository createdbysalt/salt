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
├── email/              # Email sending (Resend)
│   └── index.ts        # sendEmail, email templates
├── ai/                 # AI/GPT utilities
│   └── index.ts        # OpenAI client, prompt helpers
├── rate-limit/         # Rate limiting
│   └── index.ts        # createRateLimiter, checkLimit
├── security/           # Security utilities
│   └── index.ts        # tokens, safe URLs, encryption
└── stripe/             # Stripe utilities
    └── index.ts        # Stripe client helpers
```

## Available Modules

| Module | Purpose | Source |
|--------|---------|--------|
| `email` | Email sending via Resend | `@/libs/resend`, `@/libs/saas-emails`, `@/libs/bridge-emails` |
| `ai` | OpenAI/GPT integration | `@/libs/gpt` |
| `rate-limit` | API rate limiting | `@/libs/rate-limit` |
| `security` | Tokens, safe URLs | `@/libs/tokens`, `@/libs/safe-url`, `@/libs/safe-redirect` |
| `stripe` | Stripe client utilities | `@/libs/stripe-client`, `@/libs/stripe-connect`, `@/libs/stripe-saas` |

## Usage Pattern

```typescript
// Import from _lib modules
import { sendEmail } from '@/app/_lib/email'
import { createRateLimiter } from '@/app/_lib/rate-limit'
import { generateToken, verifyToken } from '@/app/_lib/security'
import { getStripeClient } from '@/app/_lib/stripe'
```

## _lib vs libs

| Location | Purpose | Example |
|----------|---------|---------|
| `libs/` | Low-level implementations, external packages | Supabase client, raw Stripe SDK |
| `app/_lib/` | App-level utilities, re-exports with better DX | `sendEmail()`, `createRateLimiter()` |

**Rule:** Features import from `@/app/_lib/*`, not directly from `@/libs/*` for infrastructure utilities.

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

// Re-export from libs
export { function1, function2 } from '@/libs/source-file'

// Or wrap with better interface
export async function betterFunction(input: Input): Promise<Output> {
  // Add logging, error handling, etc.
  return originalFunction(input)
}
```
