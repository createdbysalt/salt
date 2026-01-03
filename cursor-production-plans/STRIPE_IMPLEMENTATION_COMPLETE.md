# Stripe + Connect Implementation Complete ✅

## Summary

Salt Core now has a complete dual-flow payment system:
1. **SaaS Billing**: Studio owners → Salt Core subscriptions + AI credit packs
2. **Bridge Billing**: Studio owners → their clients (0% platform fee via Stripe Connect)

Implementation follows the specification in `salt-core-pricing-stripe-spec.md` with Next.js 15 Server Actions, Supabase for persistence, and security-first webhook handling.

---

## What Was Built

### 1. Database Schema (6 Migrations)

**Location:** `supabase/migrations/2025123*_billing_*.sql`

- ✅ **Profiles Extension**: Added SaaS subscription + Connect fields
- ✅ **Webhook Events**: Idempotency table for both endpoints
- ✅ **SaaS Subscriptions**: Subscription lifecycle history
- ✅ **AI Credits**: Balances, usage log, purchases (with auto-deduction function)
- ✅ **Bridge Invoices**: One-time invoices + payment records
- ✅ **Bridge Subscriptions**: Retainers on connected accounts + invoice tracking

**Key Features:**
- Row-level security (RLS) on all tables
- Service role access for webhooks
- Computed columns (e.g., `total_available` credits)
- Auto-generated invoice numbers
- MRR view for studio analytics

---

### 2. Stripe Utilities (Modular Architecture)

**Location:** `libs/stripe-*.ts`

#### `libs/stripe-client.ts`
- Singleton Stripe client (prevents multiple instances)
- API version: `2024-12-18.acacia`

#### `libs/stripe-saas.ts`
- `createSaasSubscriptionCheckout()` - SaaS tier subscriptions
- `createCreditPackCheckout()` - $25/500, $100/2500, $350/10000 packs
- `createCustomerPortalSession()` - Billing management UI
- `updateSubscriptionPrice()` - Upgrade/downgrade with proration
- `cancelSubscriptionAtPeriodEnd()` - Graceful cancellation
- `getUpcomingInvoice()` - Preview proration

#### `libs/stripe-connect.ts`
- `createConnectAccount()` - Express account creation
- `createAccountLink()` - Onboarding URL generation
- `createBridgeInvoiceCheckout()` - One-time invoice payments
- `createBridgeSubscriptionCheckout()` - Recurring retainers
- `cancelBridgeSubscription()` - Retainer cancellation
- `createDashboardLink()` - Connect Dashboard access

#### `libs/stripe.ts` (Legacy Wrapper)
- Maintains backward compatibility with existing ShipFast code
- Re-exports new modular functions

---

### 3. Server Actions (Type-Safe)

**Location:** `app/actions/billing/`

#### `saas-actions.ts`
- ✅ `createSaasCheckoutSessionAction` - Start subscription flow
- ✅ `createBillingPortalAction` - Manage billing
- ✅ `upgradeDowngradePlanAction` - Change tiers
- ✅ `cancelSubscriptionAction` - Cancel at period end
- ✅ `reactivateSubscriptionAction` - Undo cancellation
- ✅ `buyCreditsAction` - Purchase credit packs
- ✅ `getSubscriptionStatusAction` - Current status

#### `connect-actions.ts`
- ✅ `createConnectAccountAction` - Set up client billing
- ✅ `createConnectOnboardingLinkAction` - Resume onboarding
- ✅ `getConnectAccountStatusAction` - Check activation
- ✅ `createBridgeInvoiceAction` - Create invoice
- ✅ `createBridgeInvoiceCheckoutAction` - Generate payment link
- ✅ `createBridgeRetainerCheckoutAction` - Start retainer
- ✅ `cancelBridgeRetainerAction` - Cancel retainer
- ✅ `createConnectDashboardLinkAction` - Access Stripe Express Dashboard

#### `schemas.ts` (Zod Validation)
- Input validation for all actions
- Type-safe `ActionResponse<T>` pattern
- Stripe error mapping to user-friendly messages
- `success()` and `error()` helper functions

**Pattern:**
```typescript
export type ActionResponse<T> = 
  | { ok: true; data: T }
  | { ok: false; errorCode: string; message: string };
```

---

### 4. Webhook Endpoints (Security First)

**Location:** `app/api/webhook/`

#### `stripe/route.ts` (SaaS Billing)
Handles Salt Core subscription events:
- ✅ Signature verification with `STRIPE_WEBHOOK_SECRET`
- ✅ Idempotency check via `billing_webhook_events`
- ✅ Event log for audit trail
- ✅ Handles:
  - `checkout.session.completed` (subscriptions + credit packs)
  - `customer.subscription.created|updated|deleted`
  - `invoice.payment_succeeded|payment_failed`

**Key Functions:**
- `handleSubscriptionCheckout()` - Grant access, update tier, set trial
- `handleCreditPackPurchase()` - Add credits via `add_purchased_credits()`
- `handleSubscriptionUpdate()` - Sync status changes
- `handleSubscriptionDeleted()` - Revoke access
- `handleInvoicePaymentSucceeded()` - Grant access on renewal
- `handleInvoicePaymentFailed()` - Mark past_due (grace period)

#### `stripe-connect/route.ts` (Bridge Billing)
Handles client billing on connected accounts:
- ✅ Signature verification with `STRIPE_CONNECT_WEBHOOK_SECRET`
- ✅ Separate idempotency tracking
- ✅ Handles:
  - `account.updated` (Connect activation status)
  - `checkout.session.completed` (invoices + retainer starts)
  - `payment_intent.succeeded|payment_failed`
  - `invoice.paid|payment_failed` (retainer recurring billing)
  - `customer.subscription.*` (retainer lifecycle)

**Key Functions:**
- `handleAccountUpdated()` - Sync Connect activation state
- `handleInvoicePaymentCheckout()` - Mark invoice paid
- `handleSubscriptionCheckout()` - Create retainer record
- `handleSubscriptionInvoicePaid()` - Log recurring payment
- `handleSubscriptionInvoicePaymentFailed()` - Alert studio owner

---

## Architecture Decisions

### Dual Webhook Strategy ✅
**Why:** Separates concerns, enables separate signing secrets, clearer debugging

```
SaaS Events → /api/webhook/stripe
Connect Events → /api/webhook/stripe-connect
```

### Supabase-Only (No Drizzle) ✅
**Why:** Matches existing codebase patterns, faster to ship, team familiarity

### Stripe Checkout (Not Elements) ✅
**Why:** Simpler Bridge integration, handles 3DS automatically, faster MVP

### Connected Subscriptions for Retainers ✅
**Why:** Stripe manages autopay, retries, invoicing—less code, fewer bugs

### 0% Platform Fee ✅
**Why:** Pure SaaS model, studio keeps all client revenue, cleaner accounting

---

## Environment Variables Required

Add to `.env.local` and production:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook Secrets (separate endpoints)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# SaaS Price IDs
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

---

## Next Steps (To Wire Up UI)

### 1. Update Pricing Page

**File:** `components/Pricing.tsx`

Replace existing `<ButtonCheckout>` with Server Action call:

```tsx
"use client";
import { createSaasCheckoutSessionAction } from "@/app/actions/billing/saas-actions";

export default function PricingCard({ tier, interval }: Props) {
  const handleCheckout = async () => {
    const result = await createSaasCheckoutSessionAction({
      tier,
      interval,
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
      cancelUrl: `${window.location.origin}/pricing`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    } else {
      toast.error(result.message);
    }
  };
  
  return (
    <button onClick={handleCheckout}>
      Subscribe to {tier}
    </button>
  );
}
```

### 2. Add Billing Portal Link

**File:** `app/dashboard/page.tsx` or `app/dashboard/settings/page.tsx`

```tsx
import { createBillingPortalAction } from "@/app/actions/billing/saas-actions";

export default function BillingSettings() {
  const handleManageBilling = async () => {
    const result = await createBillingPortalAction({
      returnUrl: `${window.location.origin}/dashboard/settings`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    }
  };
  
  return <button onClick={handleManageBilling}>Manage Billing</button>;
}
```

### 3. Create Connect Onboarding Flow

**File:** `app/dashboard/settings/billing/page.tsx`

```tsx
import { 
  createConnectAccountAction,
  getConnectAccountStatusAction 
} from "@/app/actions/billing/connect-actions";

export default function ConnectSettings() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    getConnectAccountStatusAction().then((result) => {
      if (result.ok) setStatus(result.data);
    });
  }, []);
  
  const handleEnableClientBilling = async () => {
    const result = await createConnectAccountAction({
      country: "US",
      businessType: "individual",
      returnUrl: `${window.location.origin}/dashboard/settings/billing/complete`,
      refreshUrl: `${window.location.origin}/dashboard/settings/billing/refresh`,
    });
    
    if (result.ok) {
      window.location.href = result.data.onboardingUrl;
    }
  };
  
  if (!status?.accountId) {
    return <button onClick={handleEnableClientBilling}>Enable Client Billing</button>;
  }
  
  if (!status.chargesEnabled) {
    return <div>Complete your onboarding to start accepting payments</div>;
  }
  
  return <div>✅ Client billing active</div>;
}
```

### 4. Create Invoice Payment UI

**File:** `app/(client_bridge)/projects/[projectId]/invoices/[invoiceId]/page.tsx`

```tsx
import { createBridgeInvoiceCheckoutAction } from "@/app/actions/billing/connect-actions";

export default function InvoicePaymentPage({ params }) {
  const handlePay = async () => {
    const result = await createBridgeInvoiceCheckoutAction({
      invoiceId: params.invoiceId,
      successUrl: `${window.location.origin}/bridge/projects/${params.projectId}/invoice/${params.invoiceId}/success`,
      cancelUrl: `${window.location.origin}/bridge/projects/${params.projectId}`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    }
  };
  
  return <button onClick={handlePay}>Pay Invoice</button>;
}
```

### 5. Add Credit Pack Purchase UI

**File:** `app/dashboard/credits/page.tsx`

```tsx
import { buyCreditsAction } from "@/app/actions/billing/saas-actions";

export default function CreditsPage() {
  const handleBuyPack = async (packSize: "500" | "2500" | "10000") => {
    const result = await buyCreditsAction({
      packSize,
      successUrl: `${window.location.origin}/dashboard/credits?purchase=success`,
      cancelUrl: `${window.location.origin}/dashboard/credits`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    }
  };
  
  return (
    <div>
      <button onClick={() => handleBuyPack("500")}>500 Credits - $25</button>
      <button onClick={() => handleBuyPack("2500")}>2,500 Credits - $100</button>
      <button onClick={() => handleBuyPack("10000")}>10,000 Credits - $350</button>
    </div>
  );
}
```

---

## Testing

See **`STRIPE_TESTING_CHECKLIST.md`** for comprehensive testing guide.

**Quick Start:**

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks:
   - Terminal 1: `stripe listen --forward-to localhost:3000/api/webhook/stripe`
   - Terminal 2: `stripe listen --forward-to localhost:3000/api/webhook/stripe-connect`
4. Copy webhook secrets to `.env.local`
5. Run migrations: `supabase db push`
6. Test subscription: Use test card `4242 4242 4242 4242`

---

## Files Created/Modified

### Created (30 files):
- `supabase/migrations/20251231010000_billing_profiles_extension.sql`
- `supabase/migrations/20251231020000_billing_webhook_events.sql`
- `supabase/migrations/20251231030000_billing_saas_subscriptions.sql`
- `supabase/migrations/20251231040000_billing_ai_credits.sql`
- `supabase/migrations/20251231050000_billing_bridge_invoices.sql`
- `supabase/migrations/20251231060000_billing_bridge_subscriptions.sql`
- `libs/stripe-client.ts`
- `libs/stripe-saas.ts`
- `libs/stripe-connect.ts`
- `app/actions/billing/schemas.ts`
- `app/actions/billing/saas-actions.ts`
- `app/actions/billing/connect-actions.ts`
- `app/api/webhook/stripe-connect/route.ts`
- `STRIPE_TESTING_CHECKLIST.md`
- `STRIPE_IMPLEMENTATION_COMPLETE.md` (this file)

### Modified (2 files):
- `libs/stripe.ts` (refactored to legacy wrapper)
- `app/api/webhook/stripe/route.ts` (enhanced with idempotency + comprehensive event handling)

### Backup (1 file):
- `app/api/webhook/stripe/route.ts.backup` (original ShipFast version)

---

## Production Deployment Checklist

Before going live:

- [ ] Switch to live Stripe API keys (remove `test_`)
- [ ] Create live Stripe products/prices
- [ ] Update price IDs in environment variables
- [ ] Create live webhook endpoints in Stripe Dashboard:
  - `https://yourdomain.com/api/webhook/stripe`
  - `https://yourdomain.com/api/webhook/stripe-connect`
- [ ] Update webhook secrets (live mode)
- [ ] Run migrations on production Supabase
- [ ] Test trial period (14 real days for Professional)
- [ ] Enable Stripe Tax (optional)
- [ ] Configure Stripe Radar fraud rules
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Document support process for payment issues

---

## Support & Resources

- **Spec:** `salt-core-pricing-stripe-spec.md` (original requirements)
- **Testing:** `STRIPE_TESTING_CHECKLIST.md` (comprehensive test guide)
- **Stripe Docs:** https://docs.stripe.com
- **Stripe Connect:** https://docs.stripe.com/connect
- **Test Cards:** https://docs.stripe.com/testing#cards

---

## Success Metrics

When fully deployed, you can track:

1. **SaaS MRR**: Query `saas_subscriptions` table
2. **Studio MRR**: Use `studio_mrr` view (retainers)
3. **Credit Pack Revenue**: Query `ai_credit_purchases`
4. **Conversion Rate**: Trial → paid ratio
5. **Churn Rate**: `customer.subscription.deleted` events
6. **Connect Activation Rate**: % of users with `charges_enabled=true`

---

🎉 **Implementation Complete!** Ready for UI wiring and production testing.



