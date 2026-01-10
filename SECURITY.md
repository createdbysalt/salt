# Security Documentation

This document outlines the security measures implemented in Salt Core's billing and payment infrastructure.

## Overview

Salt Core handles sensitive payment data through Stripe. We've implemented multiple layers of security to protect user data and prevent abuse.

## Security Measures

### 1. Token-Based Invoice Access

**Implementation**: `libs/tokens.ts`, `libs/bridge-invoice-tokens.ts`

- **Token Generation**: 32-byte cryptographically secure random tokens (256-bit entropy)
- **Storage**: Only SHA-256 hashes stored in database, never raw tokens
- **TTL**: 30-day expiration enforced server-side
- **Rotation**: Issuing new link revokes all previous tokens for that invoice
- **Spent Tracking**: Tokens marked as "spent for checkout" prevent double-charging while allowing read-only access

**Rate Limiting**:
- Token lookup: 60 requests/minute per IP
- Payment action: 60 requests/minute per IP

### 2. Rate Limiting

**Implementation**: `libs/rate-limit.ts`

Protects against abuse and DoS attacks with in-memory rate limiting.

**Presets**:
- **STRICT** (10 req/min): Password resets, token generation
- **MODERATE** (60 req/min): API endpoints, invoice lookups, payment actions
- **LENIENT** (300 req/min): General page loads, authenticated actions
- **WEBHOOK** (1000 req/min): Stripe webhook batches

**Key Functions**:
```typescript
checkRateLimit(key, config) // Check if request is allowed
getClientIp(request)         // Extract client IP from headers
createRateLimitKey(prefix, ...identifiers) // Generate rate limit keys
```

**Usage Example**:
```typescript
import { checkRateLimit, RateLimitPresets, getClientIp } from "@/libs/rate-limit";

const clientIp = getClientIp(request);
const rateLimit = checkRateLimit(`invoice-lookup:${clientIp}`, RateLimitPresets.MODERATE);

if (!rateLimit.allowed) {
  return new Response("Too many requests", { status: 429 });
}
```

### 3. Security Headers

**Implementation**: `middleware.ts`

Applied to all routes (except webhooks and static assets).

**Headers Set**:
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-XSS-Protection: 1; mode=block` - Enable browser XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer info
- `Permissions-Policy` - Disable unnecessary browser features
- `Content-Security-Policy` - Restrict resource loading (allows Stripe)
- `Strict-Transport-Security` - Enforce HTTPS (production only)

**CSP Configuration**:
- Allows Stripe checkout/iframe (`*.stripe.com`)
- Allows Supabase API calls (`*.supabase.co`)
- Restricts inline scripts/styles (with exceptions for Next.js)
- Blocks all object embeds

### 4. Stripe Test Mode Guards

**Implementation**: `libs/stripe-test-guards.ts`

Prevents accidental use of live Stripe keys in development/testing.

**Functions**:
```typescript
validateStripeTestMode()           // Validate keys on app startup
assertStripeTestModeForTests()     // Guard for E2E tests
sanitizeStripeError(error)         // Remove sensitive data from errors
logBillingError(context, error)    // Safe error logging
redactSensitiveData(data)          // Redact sensitive fields from logs
```

**Validation Rules**:
- **Development/Test**: Requires test keys (`sk_test_*`, `pk_test_*`)
- **Production**: Allows live keys, warns if test keys detected
- **E2E Tests**: Refuses to run without test keys

**Usage**:
```typescript
// At app startup (e.g., in libs/stripe-client.ts)
import { validateStripeTestMode } from "@/libs/stripe-test-guards";
validateStripeTestMode();

// In E2E test setup
import { assertStripeTestModeForTests } from "@/libs/stripe-test-guards";
test.beforeAll(() => {
  assertStripeTestModeForTests();
});
```

### 5. Webhook Security

**Implementation**: `app/api/webhook/stripe/route.ts`, `app/api/webhook/stripe-connect/route.ts`

- **Signature Verification**: All webhooks verify Stripe signature before processing
- **Idempotency**: Events stored in `billing_webhook_events` table to prevent duplicate processing
- **Retry Logic**: Failed events logged with retry count
- **Separate Endpoints**: SaaS vs Connect webhooks use different signing secrets

**Security Checklist**:
- ✅ Signature verification with `stripe.webhooks.constructEvent()`
- ✅ Idempotency via `stripe_event_id` unique constraint
- ✅ Error logging without sensitive data exposure
- ✅ Rate limiting (1000 req/min)
- ✅ Separate signing secrets per endpoint

### 6. Database Security

**Implementation**: Supabase migrations in `supabase/migrations/`

- **Row Level Security (RLS)**: All tables have RLS policies
- **Service Role Operations**: Sensitive operations use service role
- **No PII in Logs**: User data redacted from application logs
- **Encrypted at Rest**: Supabase encrypts all data at rest
- **Audit Trail**: `billing_webhook_events` logs all payment events

**RLS Policies**:
- Users can only access their own billing data
- Studio owners can access their studio's client billing
- Tokens accessed via hash lookup (no session required)

### 7. Client-Side Security

**Best Practices**:
- Never expose `STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to client
- Use `NEXT_PUBLIC_*` prefix only for truly public keys
- Server Actions validate all inputs with Zod schemas
- No sensitive data in URL parameters (use POST body)
- Checkout sessions created server-side only

### 8. Error Handling

**Safe Error Responses**:
```typescript
// ❌ BAD: Exposes internal details
return { error: error.message }; // "Database connection failed: invalid credentials"

// ✅ GOOD: Generic, logs full error server-side
logBillingError("checkout", error, { userId });
return { error: "Failed to create checkout session" };
```

**Sanitization**:
- Remove database connection strings
- Redact card/account numbers
- Hide internal file paths
- Mask tokens and secrets

## Testing in Stripe Test Mode

**Required Environment Variables**:
```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET_SAAS=whsec_test_...
STRIPE_WEBHOOK_SECRET_CONNECT=whsec_test_...
```

**Playwright E2E Tests**:
All E2E tests include a guard that refuses to run unless Stripe test keys are detected.

**Stripe CLI for Webhooks**:
```bash
stripe listen --forward-to http://localhost:3000/api/webhook/stripe
stripe listen --forward-to http://localhost:3000/api/webhook/stripe-connect
```

## Compliance

### PCI DSS

Salt Core is **PCI compliant by design**:
- We never touch card data (handled by Stripe)
- No card data stored in our database
- All payment forms redirect to Stripe Checkout
- Stripe is PCI Level 1 certified

### GDPR

- Users can export their data (Stripe Customer Portal)
- Data deletion supported via Stripe API
- Minimal PII collected and stored
- Clear privacy policy and terms of service required

### SCA (Strong Customer Authentication)

- Stripe automatically handles SCA requirements
- 3D Secure authentication when required
- No additional implementation needed

## Security Checklist for New Features

When adding new billing features:

- [ ] Rate limit all public-facing endpoints
- [ ] Validate inputs with Zod schemas
- [ ] Use Server Actions for state changes
- [ ] Verify Stripe webhooks with signature
- [ ] Log errors safely (no PII)
- [ ] Test with Stripe test mode keys
- [ ] Add RLS policies for new tables
- [ ] Document security considerations
- [ ] Update this SECURITY.md file

## Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** open a public GitHub issue
2. Email security@salt.studio with details
3. Include steps to reproduce (if applicable)
4. Allow 48 hours for initial response

## Additional Resources

- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)






