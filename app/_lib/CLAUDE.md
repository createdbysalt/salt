# Infrastructure Library Guide

**Context:** You are working with shared infrastructure utilities.
**Architecture:** Technical utilities that support features but contain no business logic.

## Directory Structure

```
_lib/
├── db/               # Database utilities (beyond Supabase client)
├── email/            # Email sending, templates
├── storage/          # File storage (S3, Supabase Storage)
└── validations/      # Shared Zod schemas
```

## Purpose

The `_lib/` directory contains **technical infrastructure** that:
- Has no business logic
- Could be used by any feature
- Wraps external services
- Provides utilities for common operations

## What Goes Here vs Features

| Goes in `_lib/` | Goes in `_features/` |
|-----------------|---------------------|
| Email sending utility | Welcome email template |
| S3 upload function | Project file upload action |
| Base Zod schemas | Project validation schema |
| Database connection | User query functions |

## Email Pattern

```typescript
// _lib/email/index.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  return resend.emails.send({
    from: 'Salt <noreply@salt.app>',
    to,
    subject,
    html,
  })
}
```

## Storage Pattern

```typescript
// _lib/storage/index.ts
import { createServerClient } from '@/libs/supabase/server'

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file)

  if (error) throw error
  return data
}

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
) {
  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}
```

## Validation Pattern

```typescript
// _lib/validations/index.ts
import { z } from 'zod'

// Base schemas that features extend
export const idSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/)

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const timestampsSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})
```

## What Stays in `libs/`

The existing `libs/` directory (outside app/) contains:
- `libs/supabase/` - Supabase client (server/client/admin)
- `libs/tenancy/` - Multi-tenant context
- `libs/permissions/` - Permission checking

These stay there because they're used broadly and have established patterns.

## Rules

1. **No Business Logic**: Only technical utilities
2. **Stateless**: No feature-specific state
3. **Generic**: Should work for any feature
4. **Well-Typed**: Full TypeScript coverage
5. **Testable**: Easy to unit test in isolation
