# 📝 Production-Safe Logging Guide

**Context:** Salt uses a structured logging system that automatically redacts sensitive data in production environments.

## Overview

The logging system provides structured logging with automatic data redaction to prevent PII (Personally Identifiable Information) and sensitive data leakage to log aggregation services.

**Key Features:**
- Environment-aware log levels
- Automatic sensitive data redaction
- Structured JSON output
- Scoped logging for modules
- Production-safe by default

## Basic Usage

```typescript
import { logger } from '@/app/_lib/logger'

// Debug logging (development only by default)
logger.debug('User authentication started', { userId: '123', email: 'user@example.com' })

// Info logging
logger.info('User logged in successfully', { userId: '123', sessionId: 'sess_abc' })

// Warning logging
logger.warn('Rate limit approaching', { userId: '123', remaining: 5, limit: 100 })

// Error logging
logger.error('Payment processing failed', error, { customerId: 'cus_123', amount: 2500 })
```

## Log Levels & Environment Behavior

### Development Environment
```typescript
// All log levels are output by default
logger.debug('Debug message') // ✅ Shown
logger.info('Info message')   // ✅ Shown
logger.warn('Warning')        // ✅ Shown
logger.error('Error')         // ✅ Shown
```

### Production Environment
```typescript
// Only info, warn, and error are output by default
logger.debug('Debug message') // ❌ Hidden
logger.info('Info message')   // ✅ Shown
logger.warn('Warning')        // ✅ Shown
logger.error('Error')         // ✅ Shown
```

### Custom Log Level
```typescript
// Set via environment variable
// LOG_LEVEL=warn (only warn and error)
// LOG_LEVEL=error (only error)
// LOG_LEVEL=debug (all levels)
```

## Automatic Data Redaction

The logger automatically redacts sensitive information:

### Sensitive Keys (Always Redacted)
```typescript
logger.info('Login attempt', {
  email: 'user@example.com',
  password: 'secret123',     // → '[REDACTED]'
  token: 'jwt_token_here',   // → '[REDACTED]'
  api_key: 'sk_live_123',    // → '[REDACTED]'
  session: 'session_data',   // → '[REDACTED]'
  ssn: '123-45-6789',        // → '[REDACTED]'
  card: '4111-1111-1111',    // → '[REDACTED]'
})
```

### PII Keys (Redacted in Production Only)
```typescript
logger.info('User activity', {
  userId: '123',                    // ✅ Always shown
  email: 'user@example.com',        // → '[REDACTED_PII]' in production
  phone: '+1-555-0123',             // → '[REDACTED_PII]' in production
  address: '123 Main St',           // → '[REDACTED_PII]' in production
  ip_address: '192.168.1.1',        // → '[REDACTED_PII]' in production
})
```

### Token Detection
```typescript
logger.info('API response', {
  jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',  // → '[REDACTED_TOKEN]'
  stripe_key: 'sk_live_51HqTGBH...',              // → '[REDACTED_STRIPE_KEY]'
  publishable_key: 'pk_test_51HqTGB...',          // → '[REDACTED_STRIPE_KEY]'
})
```

## Scoped Logging

Create module-specific loggers with automatic prefixes:

```typescript
import { createScopedLogger } from '@/app/_lib/logger'

// In app/_features/billing/actions/
const logger = createScopedLogger('billing')

logger.info('Subscription created')
// Output: [2024-01-16T10:30:00.000Z] [INFO] [billing] Subscription created

logger.error('Payment failed', error, { customerId: 'cus_123' })
// Output: [2024-01-16T10:30:00.000Z] [ERROR] [billing] Payment failed {"customerId":"cus_123",...}
```

### Common Scope Examples
```typescript
// Feature modules
const authLogger = createScopedLogger('auth')
const billingLogger = createScopedLogger('billing')
const projectLogger = createScopedLogger('projects')

// Infrastructure modules
const dbLogger = createScopedLogger('database')
const emailLogger = createScopedLogger('email')
const stripeLogger = createScopedLogger('stripe')

// Route handlers
const apiLogger = createScopedLogger('api')
const webhookLogger = createScopedLogger('webhook')
```

## Error Logging Best Practices

### Structured Error Context
```typescript
try {
  await processPayment(customerId, amount)
} catch (error) {
  logger.error('Payment processing failed', error, {
    customerId,
    amount,
    paymentMethod: 'card',
    attempt: retryCount,
    correlation_id: requestId
  })
  throw error
}
```

### Error Classification
```typescript
// System errors (infrastructure)
logger.error('Database connection failed', error, {
  service: 'supabase',
  operation: 'select',
  table: 'users'
})

// Business logic errors
logger.error('Invalid subscription state', error, {
  customerId: 'cus_123',
  currentStatus: 'canceled',
  attemptedAction: 'charge'
})

// Integration errors
logger.error('Stripe webhook failed', error, {
  webhookId: 'evt_123',
  eventType: 'payment_intent.succeeded',
  retryCount: 3
})
```

## Performance Monitoring

### Request Tracing
```typescript
// Start of request
logger.info('Request started', {
  method: 'POST',
  path: '/api/billing/create-subscription',
  userId: session.user.id,
  correlation_id: requestId
})

// End of request
logger.info('Request completed', {
  duration_ms: Date.now() - startTime,
  status_code: 200,
  correlation_id: requestId
})
```

### Database Operations
```typescript
const dbLogger = createScopedLogger('database')

dbLogger.debug('Query started', {
  table: 'projects',
  operation: 'select',
  filters: { workspace_id: workspaceId }
})

dbLogger.info('Query completed', {
  table: 'projects',
  operation: 'select',
  duration_ms: queryTime,
  rows_returned: results.length
})
```

## Server Actions Logging

```typescript
// app/_features/billing/actions.ts
"use server"

import { createScopedLogger } from '@/app/_lib/logger'

const logger = createScopedLogger('billing-actions')

export async function createSubscription(input: CreateSubscriptionInput) {
  logger.info('Creating subscription', {
    planId: input.planId,
    customerId: input.customerId
  })

  try {
    const subscription = await stripe.subscriptions.create({
      customer: input.customerId,
      items: [{ price: input.planId }]
    })

    logger.info('Subscription created successfully', {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerId: input.customerId
    })

    return { success: true, subscriptionId: subscription.id }
  } catch (error) {
    logger.error('Subscription creation failed', error, {
      customerId: input.customerId,
      planId: input.planId
    })

    throw new Error('Failed to create subscription')
  }
}
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `debug` (dev)<br>`info` (prod) | Minimum log level to output |
| `NODE_ENV` | `development` | Controls PII redaction behavior |

### Log Level Hierarchy
```
debug → info → warn → error
```

If `LOG_LEVEL=warn`, only `warn` and `error` logs are shown.

## Integration with Monitoring Services

### Structured Output Format
```json
{
  "timestamp": "2024-01-16T10:30:00.000Z",
  "level": "ERROR",
  "message": "[billing] Payment processing failed",
  "customerId": "cus_123",
  "amount": 2500,
  "errorMessage": "Card declined",
  "errorName": "CardError",
  "correlation_id": "req_abc123"
}
```

### Log Aggregation
The structured format works with:
- **DataDog:** Automatic field extraction
- **Splunk:** JSON field parsing
- **CloudWatch:** Structured log queries
- **Grafana Loki:** Label-based filtering

## Security Considerations

### What Gets Redacted
```typescript
// ✅ SAFE - Always logged
const safeData = {
  userId: 'user_123',
  planId: 'price_monthly',
  status: 'active',
  timestamp: new Date().toISOString(),
  correlation_id: 'req_abc123'
}

// ⚠️ REDACTED IN PRODUCTION
const piiData = {
  email: 'user@example.com',     // → '[REDACTED_PII]'
  phone: '+1-555-0123',          // → '[REDACTED_PII]'
  ip_address: '192.168.1.1'      // → '[REDACTED_PII]'
}

// ❌ ALWAYS REDACTED
const sensitiveData = {
  password: 'secret',            // → '[REDACTED]'
  token: 'jwt_token',            // → '[REDACTED]'
  api_key: 'sk_live_123',        // → '[REDACTED]'
  session: 'session_data'        // → '[REDACTED]'
}
```

### Compliance
- **GDPR:** PII automatically redacted in production
- **CCPA:** California resident data protected
- **PCI DSS:** Payment data never logged
- **SOX:** Audit trail without exposing sensitive data

## Common Patterns

### Authentication Events
```typescript
const authLogger = createScopedLogger('auth')

// Login success
authLogger.info('User login successful', {
  userId: session.user.id,
  provider: 'email',
  ip_address: getClientIp(request)  // Redacted in production
})

// Login failure
authLogger.warn('Login attempt failed', {
  email: loginAttempt.email,  // Redacted in production
  reason: 'invalid_password',
  ip_address: getClientIp(request)
})
```

### API Rate Limiting
```typescript
const apiLogger = createScopedLogger('rate-limit')

apiLogger.warn('Rate limit exceeded', {
  userId: session.user.id,
  endpoint: '/api/projects',
  current_count: 105,
  limit: 100,
  reset_time: resetTimestamp
})
```

### Billing Events
```typescript
const billingLogger = createScopedLogger('billing')

billingLogger.info('Invoice payment succeeded', {
  customerId: 'cus_123',
  invoiceId: 'in_abc',
  amount: 2900,
  currency: 'usd'
})
```

## Migration from Console.log

### Before (Unsafe)
```typescript
// ❌ Exposes sensitive data
console.log('User login:', {
  email: user.email,
  password: formData.password,
  token: jwt
})

// ❌ No structure
console.log('Payment failed for customer cus_123')

// ❌ Lost in production
console.log('Debug: Processing subscription...')
```

### After (Safe)
```typescript
// ✅ Automatically redacted
logger.info('User login attempt', {
  email: user.email,        // → '[REDACTED_PII]' in production
  userId: user.id,          // ✅ Always safe
  provider: 'email'         // ✅ Always safe
})

// ✅ Structured and searchable
logger.error('Payment processing failed', error, {
  customerId: 'cus_123',
  amount: 2500,
  paymentMethod: 'card'
})

// ✅ Controlled by LOG_LEVEL
logger.debug('Processing subscription', {
  subscriptionId: 'sub_123',
  status: 'processing'
})
```

## Troubleshooting

### Missing Logs in Production
```typescript
// Check LOG_LEVEL setting
logger.info('Current log level', {
  level: process.env.LOG_LEVEL || 'default',
  env: process.env.NODE_ENV
})
```

### Logs Too Verbose
```bash
# Set more restrictive log level
export LOG_LEVEL=warn

# Or only errors
export LOG_LEVEL=error
```

### Testing Log Output
```typescript
// Test file: logger.test.ts
import { logger } from '@/app/_lib/logger'

test('redacts sensitive data', () => {
  const consoleSpy = vi.spyOn(console, 'log')

  logger.info('Test message', {
    password: 'secret123',
    userId: 'safe_id'
  })

  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('[REDACTED]')
  )
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining('safe_id')
  )
})
```