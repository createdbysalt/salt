# 🏗️ Infrastructure Modules Guide

**Context:** `app/_lib/` contains shared infrastructure modules that provide technical utilities across the application.

## Overview

The `_lib` directory houses infrastructure modules that are:
- **Technical, not business-specific** - These are utilities, not feature logic
- **Shared across features** - Used by multiple feature modules
- **External service integrations** - Database clients, APIs, third-party services
- **Cross-cutting concerns** - Security, logging, permissions, rate limiting

## Module Directory

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| [`ai/`](#ai-module) | AI/GPT utilities and integrations | `openaiClient`, `generateCompletion` |
| [`bridge/`](#bridge-module) | Client portal utilities | `overview-config`, bridge-specific helpers |
| [`email/`](#email-module) | Email sending via Resend | `sendEmail`, email templates |
| [`hooks/`](#hooks-module) | Shared React hooks | `useRealtimeMessages`, `useUnreadCount` |
| [`logger/`](#logger-module) | Production-safe logging | `logger`, `createScopedLogger` |
| [`permissions/`](#permissions-module) | Authorization and RLS helpers | `hasStudioAccess`, `checkPermission` |
| [`rate-limit/`](#rate-limit-module) | API rate limiting | `createRateLimiter`, `checkLimit` |
| [`security/`](#security-module) | Tokens, safe URLs, encryption | `generateToken`, `safeRedirect` |
| [`seo/`](#seo-module) | SEO integrations | `lighthouse`, `crux` integrations |
| [`stripe/`](#stripe-module) | Stripe client utilities | `stripeClient`, `stripeConnect` |
| [`supabase/`](#supabase-module) | Database clients | `createServerClient`, `createClient` |
| [`tenancy/`](#tenancy-module) | Multi-tenant logic | `getTenantContext`, `guards` |
| [`theme/`](#theme-module) | Theme resolution | `resolveTheme`, `accentPresets` |
| [`utils/`](#utils-module) | General utilities | `cn`, API helpers |

---

## AI Module

**Location:** `app/_lib/ai/`
**Purpose:** OpenAI/GPT integration and AI utilities

### Usage
```typescript
import { openaiClient, generateCompletion } from '@/app/_lib/ai'

// Generate AI completion
const response = await generateCompletion({
  prompt: 'Summarize this project status',
  context: projectData,
  maxTokens: 150
})
```

### Key Features
- OpenAI client configuration
- Prompt template management
- Token usage tracking
- Error handling and retries

---

## Bridge Module

**Location:** `app/_lib/bridge/`
**Purpose:** Client portal (Bridge) specific utilities

### Usage
```typescript
import { overviewConfig } from '@/app/_lib/bridge/overview-config'

// Configure client portal widgets
const config = await overviewConfig.getConfiguration(clientId)
```

### Key Features
- Client portal configuration
- Bridge-specific data transformations
- Portal widget management

---

## Email Module

**Location:** `app/_lib/email/`
**Purpose:** Email sending via Resend with templates

### Usage
```typescript
import { sendEmail } from '@/app/_lib/email'

// Send transactional email
await sendEmail({
  to: 'user@example.com',
  template: 'welcome',
  data: {
    userName: 'John Doe',
    activationLink: 'https://app.com/activate'
  }
})
```

### Key Features
- Resend integration
- Email template system
- Bridge-specific emails (invitations, notifications)
- SaaS platform emails (billing, onboarding)

---

## Hooks Module

**Location:** `app/_lib/hooks/`
**Purpose:** Shared React hooks for cross-feature state

### Usage
```typescript
import {
  useRealtimeMessages,
  useUnreadCount,
  useSeoAlertCount
} from '@/app/_lib/hooks'

function DashboardHeader() {
  const unreadCount = useUnreadCount(userId)
  const seoAlerts = useSeoAlertCount(workspaceId)

  return (
    <div>
      Messages ({unreadCount})
      SEO Alerts ({seoAlerts})
    </div>
  )
}
```

### Available Hooks
- `useRealtimeMessages` - Real-time message updates via Supabase
- `useUnreadCount` - Unread message counter
- `useSeoAlertCount` - SEO alert notifications
- `useRealtimeConversations` - Real-time conversation updates

---

## Logger Module

**Location:** `app/_lib/logger/`
**Purpose:** Production-safe logging with automatic data redaction

### Usage
```typescript
import { logger, createScopedLogger } from '@/app/_lib/logger'

// Basic logging
logger.info('User login successful', { userId: '123' })

// Scoped logging
const billingLogger = createScopedLogger('billing')
billingLogger.error('Payment failed', error, { customerId: 'cus_123' })
```

### Key Features
- Automatic PII/sensitive data redaction
- Environment-aware log levels
- Structured JSON output
- Scoped logging for modules

**Full Documentation:** See [Logging Guide](./logging.md)

---

## Permissions Module

**Location:** `app/_lib/tenancy/` (workspace membership guards)
**Purpose:** Authorization logic and Row Level Security (RLS) helpers

### Usage
```typescript
import { hasStudioAccess, checkPermission } from '@/app/_lib/permissions'

// Check studio access
const canAccess = await hasStudioAccess(userId, workspaceId)

// Check specific permission
const canEdit = await checkPermission({
  userId,
  resource: 'projects',
  action: 'update',
  resourceId: projectId
})
```

### Key Features
- RLS policy helpers
- Permission checking utilities
- Role-based access control
- Workspace-scoped permissions

---

## Rate Limit Module

**Location:** `app/_lib/rate-limit/`
**Purpose:** API rate limiting with configurable strategies

### Usage
```typescript
import { createRateLimiter, checkLimit } from '@/app/_lib/rate-limit'

// Create rate limiter
const limiter = createRateLimiter({
  windowMs: 60000,  // 1 minute
  maxRequests: 100  // 100 requests per minute
})

// Check rate limit
const result = await checkLimit({
  key: `api:${userId}`,
  limiter
})

if (!result.allowed) {
  throw new Error(`Rate limit exceeded. Try again in ${result.resetTime}ms`)
}
```

### Key Features
- Configurable rate limiting strategies
- IP-based and user-based limits
- Redis-backed persistence
- Rate limit presets for common scenarios

---

## Security Module

**Location:** `app/_lib/security/`
**Purpose:** Security utilities, tokens, and safe URL handling

### Usage
```typescript
import {
  generateToken,
  verifyToken,
  safeRedirect,
  encryptData
} from '@/app/_lib/security'

// Generate signed token
const token = await generateToken({ userId: '123', expiresIn: '1h' })

// Verify token
const payload = await verifyToken(token)

// Safe redirect (prevents open redirect vulnerabilities)
const redirectUrl = safeRedirect('/hq', allowedDomains)

// Encrypt sensitive data
const encrypted = await encryptData(sensitiveData)
```

### Key Features
- JWT token generation and verification
- Safe redirect utilities (prevents open redirect attacks)
- Data encryption for sensitive information
- URL validation and sanitization
- Calendar data encryption

---

## SEO Module

**Location:** `app/_lib/seo/`
**Purpose:** SEO integrations with Google Lighthouse and Chrome UX Report

### Usage
```typescript
import { lighthouse, crux } from '@/app/_lib/seo'

// Run Lighthouse audit
const auditResult = await lighthouse.runAudit({
  url: 'https://example.com',
  categories: ['performance', 'seo', 'accessibility']
})

// Get Chrome UX Report data
const cruxData = await crux.getMetrics({
  origin: 'https://example.com'
})
```

### Key Features
- Google Lighthouse integration
- Chrome UX Report (CrUX) data
- Core Web Vitals monitoring
- SEO audit automation

---

## Stripe Module

**Location:** `app/_lib/stripe/`
**Purpose:** Stripe payment integration utilities

### Usage
```typescript
import { stripeClient, stripeConnect, stripeSaas } from '@/app/_lib/stripe'

// SaaS billing
const subscription = await stripeSaas.createSubscription({
  customerId: 'cus_123',
  priceId: 'price_monthly'
})

// Connect (marketplace) billing
const account = await stripeConnect.createAccount({
  email: 'studio@example.com',
  type: 'express'
})
```

### Key Features
- Stripe client configuration
- SaaS subscription management
- Stripe Connect for marketplace billing
- Test environment guards
- Webhook handling utilities

---

## Supabase Module

**Location:** `app/_lib/supabase/`
**Purpose:** Database client management for different contexts

### Usage
```typescript
import {
  createServerClient,
  createClient,
  createAdminClient
} from '@/app/_lib/supabase'

// Server-side (with cookies)
const supabase = await createServerClient()
const { data } = await supabase.from('projects').select('*')

// Client-side
const supabase = createClient()
await supabase.auth.signInWithPassword({ email, password })

// Admin operations (service role)
const admin = createAdminClient()
await admin.from('users').update({ role: 'admin' }).eq('id', userId)
```

### Key Features
- Server-side client with cookie handling
- Browser client for auth and real-time
- Admin client with service role permissions
- Middleware integration for auth

---

## Tenancy Module

**Location:** `app/_lib/tenancy/`
**Purpose:** Multi-tenant logic and workspace isolation

### Usage
```typescript
import { getTenantContext, createTenantGuard } from '@/app/_lib/tenancy'

// Get current tenant context
const tenant = await getTenantContext()
const workspaceId = tenant.workspaceId

// Create tenant guard for routes
const guardedAction = createTenantGuard(async (context) => {
  // This function only runs if user has workspace access
  return await processWorkspaceData(context.workspaceId)
})
```

### Key Features
- Tenant context resolution
- Workspace isolation
- Route guards for multi-tenancy
- Workspace membership validation

---

## Theme Module

**Location:** `app/_lib/theme/`
**Purpose:** Theme resolution and accent color management

### Usage
```typescript
import { resolveTheme, accentPresets } from '@/app/_lib/theme'

// Resolve theme for user
const theme = await resolveTheme({
  userId,
  defaultTheme: 'light',
  accentColor: 'blue'
})

// Get available accent presets
const presets = accentPresets.getAllPresets()
```

### Key Features
- Dynamic theme resolution
- Accent color presets
- User preference management
- Dark/light mode switching

---

## Utils Module

**Location:** `app/_lib/utils/`
**Purpose:** General utilities and API helpers

### Usage
```typescript
import { cn, apiResponse, updateClientUserStatus } from '@/app/_lib/utils'

// Class name utility (Tailwind)
const className = cn('base-class', conditionalClass && 'active')

// Standard API response format
return apiResponse.success(data)
return apiResponse.error('Invalid input', 400)

// Update client status
await updateClientUserStatus(userId, 'active')
```

### Key Features
- Class name utility (`cn`)
- API response standardization
- Client status management
- Dashboard utilities

---

## Import Conventions

### Preferred Import Patterns
```typescript
// Infrastructure imports (specific)
import { logger } from '@/app/_lib/logger'
import { createServerClient } from '@/app/_lib/supabase/server'
import { sendEmail } from '@/app/_lib/email'

// Multiple utilities from same module
import {
  generateToken,
  verifyToken,
  safeRedirect
} from '@/app/_lib/security'

// Avoid importing entire modules unless needed
import * as stripe from '@/app/_lib/stripe' // ❌ Too broad
import { stripeClient } from '@/app/_lib/stripe' // ✅ Specific
```

---

## Adding New Modules

When adding a new infrastructure module:

1. **Create directory:** `app/_lib/[module-name]/`
2. **Create index.ts:** Export public API
3. **Follow naming:** Use kebab-case for directories
4. **Document exports:** Add to this guide
5. **Update folder structure:** Add to reference docs

### Module Template
```typescript
// app/_lib/[module]/index.ts

/**
 * [Module Name] - Brief description
 *
 * Usage:
 *   import { function1, function2 } from '@/app/_lib/[module]'
 */

// Main implementation
export { mainFunction } from './module-name'

// Types
export type { ModuleConfig, ModuleResult } from './types'

// Utilities
export { helper1, helper2 } from './utils'
```

---

## vs. Feature Modules

**Infrastructure modules (`_lib`)** vs **Feature modules (`_features`)**:

| Infrastructure | Features |
|---------------|----------|
| Technical utilities | Business logic |
| Cross-cutting concerns | Domain-specific |
| External integrations | User workflows |
| Database clients | Data queries |
| Security, logging | UI components |

**Rule:** If it's used by 2+ features and is technical rather than business logic, it belongs in `_lib`.