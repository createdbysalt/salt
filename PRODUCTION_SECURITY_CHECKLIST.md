# Production Security Checklist

This checklist covers critical security configurations for Salt Core before going live.

---

## ✅ Authentication & Authorization

### Supabase Auth Configuration

- [ ] **Enable email confirmation** (Supabase Dashboard → Authentication → Settings)
  - Prevents unverified email signups
  - Recommended: Required for studio owners, optional for client users (they're invite-only)

- [ ] **Configure rate limiting** (Supabase Dashboard → Authentication → Rate Limits)
  - Sign-in attempts: 5 per hour per IP
  - Password reset: 3 per hour per email
  - Magic link: 3 per hour per email
  - OAuth: 10 per hour per IP

- [ ] **Enable automatic account linking** (Supabase Dashboard → Authentication → Providers)
  - Allows users to sign in with Google OR GitHub using the same email
  - Prevents duplicate accounts
  - **Critical:** Ensure this is enabled for both Google and GitHub providers

- [ ] **Configure redirect URL allowlist** (Supabase Dashboard → Authentication → URL Configuration)
  - Production: `https://app.saltcore.io/**`
  - Production: `https://bridge.saltcore.io/**`
  - Development: `http://localhost:3000/**`
  - **Never allow** wildcards like `https://**` (open redirect vulnerability)

- [ ] **Disable signups for Bridge users** (implemented via `shouldCreateUser: false`)
  - Bridge users can ONLY be invited by studio owners
  - Verify this is enforced in `/app/signin/page.tsx` for Bridge surface

### OAuth Providers

- [ ] **Google OAuth configured** (Supabase Dashboard → Authentication → Providers → Google)
  - Client ID and Secret set
  - Redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

- [ ] **GitHub OAuth configured** (Supabase Dashboard → Authentication → Providers → GitHub)
  - Client ID and Secret set
  - Redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
  - See `GITHUB_OAUTH_SETUP.md` for full instructions

### Session Management

- [ ] **Session duration configured** (Supabase Dashboard → Authentication → Settings)
  - Recommended: 7 days for studio owners
  - Recommended: 30 days for client users (better UX for infrequent access)

- [ ] **Cookie settings verified** (already configured in `/libs/supabase/middleware.ts`)
  - `HttpOnly`: true (prevents XSS)
  - `Secure`: true in production (HTTPS only)
  - `SameSite`: Lax (prevents CSRF)

---

## ✅ Row Level Security (RLS)

### Verify RLS is Enabled

Run this query in Supabase SQL Editor to check all tables:

```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**All tables should have `rowsecurity = true`.**

### Critical RLS Policies to Verify

- [ ] **`profiles`**: Users can only view/update their own profile
- [ ] **`studios`**: Studio members can only view their own studio
- [ ] **`studio_members`**: Studio members can only view other members in their studio
- [ ] **`clients`**: Studio members can only view/manage their studio's clients
- [ ] **`client_users`**: 
  - Client users can only view themselves
  - Studio members can view/manage their studio's client users
- [ ] **`projects`**: 
  - Studio members can view/manage their studio's projects
  - Client users can ONLY view projects for clients they belong to
- [ ] **`studio_domains`**: Studio owners/admins can manage their studio's domains

### Test RLS Policies

Create a test user and verify they CANNOT:
- View other studios' data
- View other clients' data
- Modify data they don't own
- Bypass invite-only restrictions

---

## ✅ Invite-Only Enforcement

### Bridge Access Control

- [ ] **Invite-only enforced** (implemented in `/libs/tenancy/context.ts`)
  - Users without `client_users` membership are redirected to `/no-access`
  - No self-signup allowed on Bridge surface

- [ ] **`shouldCreateUser: false` for Bridge OTP** (TO BE IMPLEMENTED)
  - When client users request a magic link on Bridge, prevent account creation
  - Only allow sign-in for existing invited users
  - **Action required:** Update `/app/signin/page.tsx` to detect Bridge surface and set `shouldCreateUser: false`

- [ ] **Status field enforced** (already implemented)
  - `client_users.status` must be 'active' to access Bridge
  - Pending invites cannot access until they accept

### Email Verification

- [ ] **Studio owners**: Email verification recommended (but not required for OAuth)
- [ ] **Client users**: Email verification happens via invite magic link

---

## ✅ Custom Domains (BYOD)

### DNS Verification

- [ ] **Verification flow implemented** (migration `20251229010000_add_studio_domains.sql`)
  - TXT record verification: `_saltcore-verify.<domain>` → `<verification_token>`
  - CNAME verification: `<domain>` → `verify.saltcore.io`

- [ ] **Only verified domains are active**
  - Tenancy resolver checks `status = 'verified'`
  - Unverified domains are ignored

### SSL/TLS

- [ ] **SSL certificates managed** (platform/CDN responsibility)
  - Use Cloudflare, Vercel, or similar for automatic SSL
  - Verify `ssl_status = 'active'` before allowing traffic

### Redirect Validation

- [ ] **No open redirects**
  - All redirects validate against studio_domains table
  - Never redirect to arbitrary user-provided URLs

---

## ✅ API Security

### Environment Variables

- [ ] **Service role key NEVER exposed to client**
  - `SUPABASE_SERVICE_ROLE_KEY` only used in server-side code
  - Never in client components or browser bundles

- [ ] **Resend API key secured**
  - `RESEND_API_KEY` only used in server actions
  - Never exposed to client

- [ ] **Stripe keys secured**
  - `STRIPE_SECRET_KEY` only used in server-side code
  - `STRIPE_WEBHOOK_SECRET` validated for all webhook requests

### Webhook Security

- [ ] **Stripe webhook signature verification** (already implemented in `/app/api/webhook/stripe/route.ts`)
  - All webhook requests verify signature
  - Invalid signatures are rejected

- [ ] **Supabase webhook signature verification** (if using Supabase webhooks)
  - Verify `X-Supabase-Signature` header
  - Reject unsigned requests

### Rate Limiting

- [ ] **Supabase Auth rate limits enabled** (see above)
- [ ] **API route rate limiting** (optional, consider for high-traffic endpoints)
  - Use Vercel Edge Config or Upstash Redis
  - Limit: 100 requests per minute per IP for public endpoints

---

## ✅ Data Privacy & GDPR

### User Data Export

- [ ] **Implement data export endpoint** (TO BE IMPLEMENTED)
  - User can request export of their profile, memberships, and audit logs
  - Format: JSON or CSV
  - Endpoint: `/api/user/export`

### Data Retention

- [ ] **Define retention policy**
  - Deleted users: soft delete (mark as deleted, retain for 30 days)
  - Deleted studios: soft delete (mark as deleted, retain for 90 days)
  - Audit logs: retain for 1 year

### Right to be Forgotten

- [ ] **Implement hard delete endpoint** (TO BE IMPLEMENTED)
  - User can request permanent deletion after 30-day grace period
  - Endpoint: `/api/user/delete-permanently`
  - Requires email confirmation

---

## ✅ Error Handling & Logging

### Error Messages

- [ ] **No credential enumeration**
  - "Invalid email or password" (never "Email not found")
  - "If that email exists, we sent a magic link" (never "Email not registered")

- [ ] **Generic error messages for users**
  - "Something went wrong" (not "Database connection failed")
  - Log detailed errors server-side only

### Logging

- [ ] **Log all authentication events**
  - Sign-in attempts (success/failure)
  - Password resets
  - Account linking
  - Invite sends

- [ ] **Log all authorization failures**
  - RLS policy violations
  - Unauthorized API access
  - Invalid webhook signatures

- [ ] **Never log sensitive data**
  - No passwords (even hashed)
  - No API keys
  - No session tokens

---

## ✅ Content Security

### Content Security Policy (CSP)

- [ ] **Configure CSP headers** (in `next.config.js` or middleware)
  ```
  Content-Security-Policy: 
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
    style-src 'self' 'unsafe-inline'; 
    img-src 'self' data: https:; 
    font-src 'self' data:;
  ```

### XSS Protection

- [ ] **All user input sanitized**
  - Use React's built-in XSS protection (JSX escaping)
  - Never use `dangerouslySetInnerHTML` without sanitization
  - Validate all form inputs with Zod

### CSRF Protection

- [ ] **SameSite cookies** (already configured)
  - `SameSite=Lax` for session cookies
  - Prevents CSRF attacks

---

## ✅ Monitoring & Alerts

### Supabase Monitoring

- [ ] **Enable Supabase alerts** (Supabase Dashboard → Settings → Alerts)
  - High auth failure rate
  - Database CPU > 80%
  - Storage > 80%

### Application Monitoring

- [ ] **Error tracking** (Sentry, LogRocket, or similar)
  - Track all unhandled exceptions
  - Alert on critical errors

- [ ] **Performance monitoring** (Vercel Analytics or similar)
  - Track page load times
  - Alert on slow API routes

---

## ✅ Pre-Launch Testing

### Security Testing

- [ ] **Test RLS policies with multiple users**
  - Create 2+ studios, verify isolation
  - Create 2+ clients, verify isolation
  - Verify client users can't access other clients' data

- [ ] **Test invite-only enforcement**
  - Try to access Bridge without invitation → redirected to `/no-access`
  - Try to self-signup on Bridge → blocked

- [ ] **Test OAuth account linking**
  - Sign in with Google → sign in with GitHub (same email) → same account

- [ ] **Test custom domain verification**
  - Add domain → verify DNS → access Bridge on custom domain

### Penetration Testing (Optional but Recommended)

- [ ] **Run OWASP ZAP or similar**
  - Scan for common vulnerabilities
  - Fix any high/critical issues

- [ ] **Test for SQL injection**
  - All queries use parameterized queries (Supabase client handles this)

- [ ] **Test for XSS**
  - Try to inject scripts in all form fields
  - Verify React escaping works

---

## ✅ Post-Launch Monitoring

### First 7 Days

- [ ] **Monitor auth failure rate**
  - Spike = potential brute force attack
  - Action: Tighten rate limits

- [ ] **Monitor invite acceptance rate**
  - Low rate = email deliverability issue
  - Action: Check Resend logs

- [ ] **Monitor custom domain verification**
  - High failure rate = DNS instructions unclear
  - Action: Improve UI/documentation

### Ongoing

- [ ] **Weekly RLS policy review**
  - Ensure no policies were accidentally disabled

- [ ] **Monthly security updates**
  - Update dependencies (`npm audit`)
  - Review Supabase changelog for security patches

---

## 🔒 Emergency Procedures

### Suspected Breach

1. **Immediately revoke all sessions** (Supabase Dashboard → Authentication → Users → Revoke All Sessions)
2. **Rotate all API keys** (Supabase, Resend, Stripe)
3. **Review audit logs** for suspicious activity
4. **Notify affected users** (if data was accessed)

### Rate Limit Exceeded

1. **Check Supabase logs** for source IP
2. **Block IP** (Cloudflare, Vercel Firewall)
3. **Increase rate limits** if legitimate traffic

---

## Summary Checklist

Before going live, ensure:

- ✅ All RLS policies are enabled and tested
- ✅ OAuth providers are configured with automatic account linking
- ✅ Rate limiting is enabled on Supabase Auth
- ✅ Redirect URL allowlist is locked down
- ✅ Invite-only enforcement is working on Bridge
- ✅ Custom domain verification is implemented
- ✅ Error messages don't leak sensitive info
- ✅ Monitoring and alerts are configured

**When in doubt, test with a fresh user account in incognito mode.**

