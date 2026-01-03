# Stripe + Connect Testing Checklist

## Prerequisites

### 1. Environment Variables

Add to `.env.local`:

```bash
# Stripe API Keys (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secrets (get after creating webhooks in Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# SaaS Subscription Price IDs (create products/prices in Stripe Dashboard)
STRIPE_PRICE_SOLO_MONTHLY=price_...
STRIPE_PRICE_SOLO_ANNUAL=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 2. Run Database Migrations

```bash
# Apply all billing migrations (6 files)
supabase db push

# Or if using Supabase CLI locally:
supabase migration up
```

Migrations to apply:
- `20251231010000_billing_profiles_extension.sql`
- `20251231020000_billing_webhook_events.sql`
- `20251231030000_billing_saas_subscriptions.sql`
- `20251231040000_billing_ai_credits.sql`
- `20251231050000_billing_bridge_invoices.sql`
- `20251231060000_billing_bridge_subscriptions.sql`

### 3. Create Stripe Products & Prices

In [Stripe Dashboard](https://dashboard.stripe.com/test/products):

**Solo Tier:**
- Product: "Salt Core Solo"
- Price (monthly): $79/month → Copy price ID to `STRIPE_PRICE_SOLO_MONTHLY`
- Price (annual): $790/year → Copy price ID to `STRIPE_PRICE_SOLO_ANNUAL`

**Professional Tier:**
- Product: "Salt Core Professional"
- Price (monthly): $179/month → Copy price ID to `STRIPE_PRICE_PRO_MONTHLY`
- Price (annual): $1,790/year → Copy price ID to `STRIPE_PRICE_PRO_ANNUAL`
- **Set trial period:** 14 days

**Studio Tier:**
- Product: "Salt Core Studio"
- Price (monthly): $349/month → Copy price ID to `STRIPE_PRICE_STUDIO_MONTHLY`
- Price (annual): $3,490/year → Copy price ID to `STRIPE_PRICE_STUDIO_ANNUAL`

### 4. Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Login
stripe login
```

### 5. Forward Webhooks Locally

**Terminal 1 - SaaS webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
# Copy webhook secret → STRIPE_WEBHOOK_SECRET
```

**Terminal 2 - Connect webhooks:**
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe-connect --events account.updated,checkout.session.completed,payment_intent.succeeded,payment_intent.payment_failed,invoice.paid,invoice.payment_failed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted
# Copy webhook secret → STRIPE_CONNECT_WEBHOOK_SECRET
```

---

## Test Cases

### Phase 1: SaaS Subscription Flow

#### Test 1.1: Professional Tier with Trial
- [ ] User signs up (or logs in)
- [ ] Call `createSaasCheckoutSessionAction({ tier: "professional", interval: "month" })`
- [ ] Complete checkout with test card `4242 4242 4242 4242`
- [ ] **Verify:**
  - [ ] `checkout.session.completed` webhook received
  - [ ] Profile updated: `saas_subscription_status=trialing`, `saas_tier=professional`, `trial_ends_at` set
  - [ ] `saas_subscriptions` record created
  - [ ] `ai_credit_balances` updated: `monthly_allocation=1200`
  - [ ] `has_access=true`

#### Test 1.2: Solo Tier (No Trial)
- [ ] Call `createSaasCheckoutSessionAction({ tier: "solo", interval: "month" })`
- [ ] Complete checkout
- [ ] **Verify:**
  - [ ] Profile updated: `saas_subscription_status=active`, `saas_tier=solo`
  - [ ] No trial dates set
  - [ ] `ai_credit_balances`: `monthly_allocation=400`

#### Test 1.3: Trial Conversion
- [ ] Wait 14 days (or use Stripe CLI to simulate time travel)
- [ ] **Verify:**
  - [ ] `invoice.payment_succeeded` webhook fires
  - [ ] `customer.subscription.updated` changes status to `active`
  - [ ] Profile updated: `saas_subscription_status=active`

#### Test 1.4: Credit Pack Purchase
- [ ] Call `buyCreditsAction({ packSize: "500" })`
- [ ] Complete checkout ($25)
- [ ] **Verify:**
  - [ ] `checkout.session.completed` with metadata `type=credit_pack`
  - [ ] `ai_credit_purchases` record created
  - [ ] `ai_credit_balances.purchased_credits` increased by 500

#### Test 1.5: Upgrade Plan (Solo → Professional)
- [ ] User subscribed to Solo
- [ ] Call `upgradeDowngradePlanAction({ newTier: "professional" })`
- [ ] **Verify:**
  - [ ] `customer.subscription.updated` webhook
  - [ ] Profile: `saas_tier=professional`
  - [ ] `ai_credit_balances.monthly_allocation=1200`
  - [ ] Proration applied (check Stripe Dashboard invoice)

#### Test 1.6: Cancel Subscription
- [ ] Call `cancelSubscriptionAction()`
- [ ] **Verify:**
  - [ ] Subscription: `cancel_at_period_end=true`
  - [ ] Access remains until period end
  - [ ] At period end: `customer.subscription.deleted` webhook fires
  - [ ] Profile: `has_access=false`, `saas_subscription_status=canceled`

#### Test 1.7: Failed Payment
- [ ] Use test card `4000 0000 0000 0341` (charge_declined)
- [ ] **Verify:**
  - [ ] `invoice.payment_failed` webhook
  - [ ] Profile: `saas_subscription_status=past_due`
  - [ ] Stripe retries automatically (Smart Retries enabled)

#### Test 1.8: Billing Portal
- [ ] Call `createBillingPortalAction()`
- [ ] Open returned URL
- [ ] **Verify:**
  - [ ] Can view invoices
  - [ ] Can update payment method
  - [ ] Can cancel subscription

---

### Phase 2: Stripe Connect Flow

#### Test 2.1: Create Connect Account
- [ ] Call `createConnectAccountAction({ country: "US", businessType: "individual" })`
- [ ] **Verify:**
  - [ ] Express account created in Stripe
  - [ ] Profile: `stripe_connect_account_id` set, `stripe_connect_status=pending`
  - [ ] Onboarding URL returned

#### Test 2.2: Complete Onboarding
- [ ] Open onboarding URL
- [ ] Complete Stripe onboarding form (use test business info)
- [ ] **Verify:**
  - [ ] Redirected to `returnUrl`
  - [ ] `account.updated` webhook received
  - [ ] Profile: `stripe_connect_status=active`, `stripe_connect_charges_enabled=true`

#### Test 2.3: Check Account Status
- [ ] Call `getConnectAccountStatusAction()`
- [ ] **Verify:**
  - [ ] Returns current Connect account status
  - [ ] `chargesEnabled=true`, `payoutsEnabled=true`

---

### Phase 3: Bridge Invoice Payment

#### Test 3.1: Create Invoice
- [ ] Call `createBridgeInvoiceAction({ clientId, amountCents: 1000000, description: "Website" })`
- [ ] **Verify:**
  - [ ] `bridge_invoices` record created
  - [ ] Invoice number auto-generated (e.g., `INV-2025-0001`)
  - [ ] Status: `draft`

#### Test 3.2: Send Invoice Payment Link
- [ ] Call `createBridgeInvoiceCheckoutAction({ invoiceId, successUrl, cancelUrl })`
- [ ] **Verify:**
  - [ ] Checkout URL returned (on connected account)
  - [ ] Invoice status updated to `sent`

#### Test 3.3: Client Pays Invoice
- [ ] Open checkout URL
- [ ] Complete payment with test card
- [ ] **Verify:**
  - [ ] `checkout.session.completed` webhook to Connect endpoint
  - [ ] `bridge_invoices` updated: `status=paid`, `paid_at` set
  - [ ] `bridge_invoice_payments` record created
  - [ ] Money appears in Connect account balance (Stripe Dashboard → Connect → Account)

#### Test 3.4: Invoice Payment Failure
- [ ] Use declining card `4000 0000 0000 0002`
- [ ] **Verify:**
  - [ ] `payment_intent.payment_failed` webhook
  - [ ] `bridge_invoices.status=failed`
  - [ ] `bridge_invoice_payments` records failure reason

---

### Phase 4: Bridge Retainer (Subscription)

#### Test 4.1: Create Retainer Checkout
- [ ] Call `createBridgeRetainerCheckoutAction({ amountCents: 150000, interval: "month" })`
- [ ] Complete checkout
- [ ] **Verify:**
  - [ ] `checkout.session.completed` (mode=subscription) to Connect endpoint
  - [ ] `bridge_client_subscriptions` record created
  - [ ] Status: `active`

#### Test 4.2: Recurring Billing
- [ ] Wait for billing cycle (or simulate with Stripe CLI)
- [ ] **Verify:**
  - [ ] `invoice.paid` webhook to Connect endpoint
  - [ ] `bridge_subscription_invoices` record created
  - [ ] Client charged automatically

#### Test 4.3: Cancel Retainer
- [ ] Call `cancelBridgeRetainerAction({ subscriptionId, immediately: false })`
- [ ] **Verify:**
  - [ ] `customer.subscription.updated`: `cancel_at_period_end=true`
  - [ ] Subscription continues until period end
  - [ ] `customer.subscription.deleted` fires at period end
  - [ ] `bridge_client_subscriptions.status=canceled`

#### Test 4.4: Failed Retainer Payment
- [ ] Update payment method to declining card
- [ ] Wait for billing cycle
- [ ] **Verify:**
  - [ ] `invoice.payment_failed` webhook
  - [ ] `bridge_client_subscriptions.status=past_due`
  - [ ] Stripe Smart Retries attempts payment again

---

### Phase 5: AI Credits System

#### Test 5.1: Check Credit Balance
- [ ] Query `ai_credit_balances` table
- [ ] **Verify:**
  - [ ] New user has default 400 credits (Solo allocation)
  - [ ] `total_available` computed column works
  - [ ] `used_this_month=0`, `purchased_credits=0`

#### Test 5.2: Deduct Credits
- [ ] Call `deduct_ai_credits(user_id, 50, 'competitor_analysis')`
- [ ] **Verify:**
  - [ ] `ai_credit_balances.used_this_month` incremented
  - [ ] `ai_credit_usage` log entry created
  - [ ] `total_available` reflects deduction

#### Test 5.3: Purchase Credits
- [ ] Buy 500 credit pack
- [ ] **Verify:**
  - [ ] `ai_credit_balances.purchased_credits=500`
  - [ ] `total_available` includes purchased credits
  - [ ] `ai_credit_purchases` record exists

#### Test 5.4: Credits Deduction Priority
- [ ] User has 100 purchased credits + 200 monthly credits
- [ ] Deduct 150 credits
- [ ] **Verify:**
  - [ ] Purchased credits used first (100 deducted)
  - [ ] Monthly credits used for remainder (50 deducted)
  - [ ] `purchased_credits=0`, `used_this_month=50`

#### Test 5.5: Monthly Credit Reset
- [ ] Call `reset_monthly_ai_credits()` function (simulates cron)
- [ ] **Verify:**
  - [ ] `used_this_month` reset to 0
  - [ ] `purchased_credits` unchanged (never expire)
  - [ ] `last_reset_at` updated

---

## Webhook Testing with Stripe CLI

### Trigger Specific Events

```bash
# Successful payment
stripe trigger payment_intent.succeeded

# Failed payment
stripe trigger payment_intent.payment_failed

# Subscription created
stripe trigger customer.subscription.created

# Subscription trial will end (3 days before)
stripe trigger customer.subscription.trial_will_end

# Invoice payment succeeded
stripe trigger invoice.payment_succeeded

# Invoice payment failed
stripe trigger invoice.payment_failed
```

### Monitor Webhook Logs

```bash
# View all webhook events
stripe events list

# View specific event
stripe events retrieve evt_...

# Resend webhook event
stripe events resend evt_...
```

---

## Test Credit Cards

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Success (any CVC, future exp) |
| `4000 0000 0000 3220` | 3D Secure authentication required |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Declined (charge_declined) |
| `4000 0000 0000 0002` | Declined (generic decline) |
| `4000 0000 0000 9987` | Declined (lost card) |

Full list: https://docs.stripe.com/testing#cards

---

## Database Verification Queries

```sql
-- Check user subscription status
SELECT 
  email,
  saas_tier,
  saas_subscription_status,
  stripe_connect_status,
  has_access
FROM profiles
WHERE email = 'your-test-email@example.com';

-- Check AI credit balance
SELECT * FROM ai_credit_balances
WHERE user_id = 'user-uuid-here';

-- Check webhook processing
SELECT 
  event_type,
  processed_at,
  processing_error
FROM billing_webhook_events
ORDER BY created_at DESC
LIMIT 20;

-- Check active subscriptions
SELECT * FROM saas_subscriptions
WHERE status IN ('active', 'trialing')
ORDER BY created_at DESC;

-- Check Bridge invoices
SELECT 
  invoice_number,
  amount_cents,
  status,
  paid_at
FROM bridge_invoices
ORDER BY created_at DESC
LIMIT 10;

-- Check MRR by studio
SELECT * FROM studio_mrr;
```

---

## Common Issues & Solutions

### Issue: Webhook signature verification fails

**Solution:**
- Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from `stripe listen`
- Don't commit webhook secrets to git (use `.env.local`)
- For production, get secret from Stripe Dashboard → Developers → Webhooks

### Issue: Duplicate webhook processing

**Solution:**
- Check `billing_webhook_events` for `stripe_event_id`
- Idempotency is built-in (checks before processing)
- If stuck, manually mark event as processed in DB

### Issue: Connect account can't accept charges

**Solution:**
- Check `account.updated` webhook was received
- Verify `stripe_connect_charges_enabled=true` in profiles
- Complete onboarding fully (Stripe may require additional info)

### Issue: Credit pack purchase not adding credits

**Solution:**
- Check `checkout.session.completed` webhook for `metadata.type='credit_pack'`
- Verify `add_purchased_credits` function exists and runs
- Check `ai_credit_purchases` table for record

### Issue: Invoice payment succeeds but status not updated

**Solution:**
- Check `stripe-connect` webhook is running (separate endpoint)
- Verify `invoice_id` in session metadata
- Check `billing_webhook_events` for processing errors

---

## Production Deployment Checklist

Before going live:

- [ ] Switch to live Stripe API keys (remove `test_`)
- [ ] Create live webhook endpoints in Stripe Dashboard
  - [ ] https://yourdomain.com/api/webhook/stripe (SaaS)
  - [ ] https://yourdomain.com/api/webhook/stripe-connect (Connect)
- [ ] Update `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` with live secrets
- [ ] Create live products/prices and update price IDs in env
- [ ] Test trial conversion (requires 14 real days or contact Stripe support)
- [ ] Enable Stripe Tax for automatic tax calculation (optional)
- [ ] Set up Stripe Radar rules for fraud prevention
- [ ] Configure email notifications for failed payments
- [ ] Set up monitoring/alerts for webhook failures
- [ ] Review Stripe Connect payout schedule settings

---

## Support Resources

- [Stripe Testing Docs](https://docs.stripe.com/testing)
- [Stripe CLI Docs](https://docs.stripe.com/stripe-cli)
- [Stripe Connect Docs](https://docs.stripe.com/connect)
- [Webhook Best Practices](https://docs.stripe.com/webhooks/best-practices)



