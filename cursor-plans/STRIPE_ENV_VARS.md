# Stripe Environment Variables

## Required Environment Variables

Add these to your `.env.local` file for development and to your deployment platform (Vercel, Netlify, etc.) for production.

### Stripe API Keys

Get from: https://dashboard.stripe.com/test/apikeys

```bash
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Webhook Secrets

**Local Development:** Use `stripe listen` to get webhook secrets (see below)
**Production:** Create webhook endpoints in Stripe Dashboard

```bash
# SaaS Subscription Webhook (/api/webhook/stripe)
STRIPE_WEBHOOK_SECRET=whsec_your_saas_webhook_secret_here

# Connect/Bridge Webhook (/api/webhook/stripe-connect)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_your_connect_webhook_secret_here
```

### SaaS Subscription Price IDs

Create products/prices in Stripe Dashboard → Products

```bash
# Solo Tier - $79/month or $790/year
STRIPE_PRICE_SOLO_MONTHLY=price_solo_monthly_id_here
STRIPE_PRICE_SOLO_ANNUAL=price_solo_annual_id_here

# Professional Tier - $179/month or $1,790/year (14-day trial)
STRIPE_PRICE_PRO_MONTHLY=price_pro_monthly_id_here
STRIPE_PRICE_PRO_ANNUAL=price_pro_annual_id_here

# Studio Tier - $349/month or $3,490/year
STRIPE_PRICE_STUDIO_MONTHLY=price_studio_monthly_id_here
STRIPE_PRICE_STUDIO_ANNUAL=price_studio_annual_id_here
```

---

## Local Development Setup

### 1. Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 2. Forward Webhooks

Run these commands in **separate terminal windows**:

**Terminal 1 - SaaS Webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Copy the webhook secret starting with `whsec_` and add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

**Terminal 2 - Connect Webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe-connect
```

Copy the webhook secret and add to `.env.local` as `STRIPE_CONNECT_WEBHOOK_SECRET`

### 3. Test Payment

Use test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC

---

## Production Setup

### 1. Switch to Live Keys

In Stripe Dashboard, toggle from "Test mode" to "Live mode" and get your live API keys:
- Replace `sk_test_` with `sk_live_`
- Replace `pk_test_` with `pk_live_`

### 2. Create Live Webhook Endpoints

Go to: https://dashboard.stripe.com/webhooks

**SaaS Webhook:**
- Endpoint URL: `https://yourdomain.com/api/webhook/stripe`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

**Connect Webhook:**
- Endpoint URL: `https://yourdomain.com/api/webhook/stripe-connect`
- Events to send:
  - `account.updated`
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copy the signing secret → `STRIPE_CONNECT_WEBHOOK_SECRET`

### 3. Create Live Products & Prices

In Stripe Dashboard → Products, create:

**Solo Tier:**
- Name: "Salt Core Solo"
- Monthly price: $79
- Annual price: $790 (or $948 with 10% discount)

**Professional Tier:**
- Name: "Salt Core Professional"
- Monthly price: $179 (set trial period: 14 days)
- Annual price: $1,790 (or $2,148 with 10% discount)

**Studio Tier:**
- Name: "Salt Core Studio"
- Monthly price: $349
- Annual price: $3,490 (or $4,188 with 10% discount)

Copy the price IDs (e.g., `price_1Abc...`) to your environment variables.

---

## Complete .env.local Template

```bash
# ============================================================================
# STRIPE CONFIGURATION
# ============================================================================

# API Keys
STRIPE_SECRET_KEY=sk_test_51...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Solo Tier Price IDs
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...

# Professional Tier Price IDs
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...

# Studio Tier Price IDs
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...

# ============================================================================
# SUPABASE (existing)
# ============================================================================

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## Verification

To verify your setup is correct:

1. **Check API Keys:**
   ```bash
   stripe balance
   ```
   Should show your Stripe balance if keys are valid.

2. **Check Webhooks:**
   Run `stripe listen` - if it connects, your CLI is authenticated.

3. **Test Subscription:**
   - Go to your pricing page
   - Click subscribe
   - Use test card `4242 4242 4242 4242`
   - Check webhook logs in terminal: should see `checkout.session.completed`

4. **Check Database:**
   ```sql
   SELECT * FROM billing_webhook_events ORDER BY created_at DESC LIMIT 5;
   ```
   Should see webhook events logged.

---

## Troubleshooting

**"No such price" error:**
- Verify price IDs in environment variables match Stripe Dashboard
- Ensure you're in the correct mode (test vs live)

**Webhook signature verification failed:**
- Check webhook secret matches the endpoint
- Verify you're using the secret from `stripe listen` (local) or Dashboard (production)

**Subscription created but database not updated:**
- Check webhook endpoint is accessible (not behind firewall)
- Look for webhook processing errors in `billing_webhook_events` table
- Check Supabase logs for RLS policy errors

For more help, see `STRIPE_TESTING_CHECKLIST.md`



