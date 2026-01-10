# Stripe + Connect Implementation

Complete dual-flow payment system for Salt Core with SaaS subscriptions and client billing through The Bridge.

## 📚 Documentation

- **[Implementation Complete](./STRIPE_IMPLEMENTATION_COMPLETE.md)** - Full implementation details, architecture decisions, and what was built
- **[Testing Checklist](./STRIPE_TESTING_CHECKLIST.md)** - Comprehensive testing guide with Stripe CLI
- **[Environment Variables](./STRIPE_ENV_VARS.md)** - Required env vars and setup instructions
- **[Original Spec](../Downloads/salt-core-pricing-stripe-spec.md)** - Original requirements (if available)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install stripe zod
npm install --save-dev @types/stripe
```

### 2. Set Up Environment Variables

Copy the required variables from `STRIPE_ENV_VARS.md` to your `.env.local`:

```bash
# Minimum required for development
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Plus all 6 price IDs (solo/pro/studio × monthly/annual)
```

### 3. Run Database Migrations

```bash
# If using Supabase CLI
supabase migration up

# Or push directly
supabase db push
```

This will create 6 new tables:
- `billing_webhook_events` - Webhook idempotency
- `saas_subscriptions` - Subscription history
- `ai_credit_balances` - Credit balances
- `ai_credit_usage` - Usage log
- `ai_credit_purchases` - Credit pack purchases
- `bridge_invoices` - Client invoices
- `bridge_invoice_payments` - Invoice payments
- `bridge_client_subscriptions` - Client retainers
- `bridge_subscription_invoices` - Retainer invoices

Plus extend `profiles` table with billing fields.

### 4. Forward Webhooks (Local Dev)

Terminal 1:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Terminal 2:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe-connect
```

Copy the webhook secrets to `.env.local`.

### 5. Test Subscription Flow

```typescript
import { createSaasCheckoutSessionAction } from "@/app/actions/billing";

const result = await createSaasCheckoutSessionAction({
  tier: "professional",
  interval: "month",
  successUrl: `${window.location.origin}/dashboard?success=true`,
  cancelUrl: `${window.location.origin}/pricing`,
});

if (result.ok) {
  window.location.href = result.data.url;
}
```

Use test card: `4242 4242 4242 4242`

---

## 📦 What's Included

### Database Schema (6 Migrations)
- ✅ Extended `profiles` with SaaS + Connect fields
- ✅ Webhook event logging (idempotency)
- ✅ Subscription lifecycle tracking
- ✅ AI credit system (balances, usage, purchases)
- ✅ Bridge invoices + payments
- ✅ Bridge retainers (subscriptions on connected accounts)

### Stripe Utilities
- ✅ `libs/stripe-client.ts` - Singleton Stripe client
- ✅ `libs/stripe-saas.ts` - SaaS subscriptions + credit packs
- ✅ `libs/stripe-connect.ts` - Connect accounts + client billing
- ✅ `libs/stripe.ts` - Legacy wrapper (backward compatible)

### Server Actions
- ✅ **SaaS:** Subscribe, upgrade, cancel, buy credits, manage billing
- ✅ **Connect:** Onboarding, invoices, retainers, dashboard access
- ✅ **Validation:** Zod schemas for type safety

### Webhook Endpoints
- ✅ `/api/webhook/stripe` - SaaS subscription events
- ✅ `/api/webhook/stripe-connect` - Bridge/client billing events
- ✅ Signature verification + idempotency

---

## 🎯 Usage Examples

### Pricing Page
```tsx
"use client";
import { createSaasCheckoutSessionAction } from "@/app/actions/billing";

export function PricingCard({ tier }: { tier: "solo" | "professional" | "studio" }) {
  const handleSubscribe = async () => {
    const result = await createSaasCheckoutSessionAction({
      tier,
      interval: "month",
      successUrl: `${window.location.origin}/dashboard?checkout=success`,
      cancelUrl: `${window.location.origin}/pricing`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    } else {
      toast.error(result.message);
    }
  };
  
  return <button onClick={handleSubscribe}>Subscribe to {tier}</button>;
}
```

### Billing Portal
```tsx
import { createBillingPortalAction } from "@/app/actions/billing";

export function ManageBillingButton() {
  const handleClick = async () => {
    const result = await createBillingPortalAction({
      returnUrl: `${window.location.origin}/dashboard/settings`,
    });
    
    if (result.ok) {
      window.location.href = result.data.url;
    }
  };
  
  return <button onClick={handleClick}>Manage Billing</button>;
}
```

### Enable Client Billing
```tsx
import { 
  createConnectAccountAction,
  getConnectAccountStatusAction 
} from "@/app/actions/billing";

export function ConnectOnboardingButton() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    getConnectAccountStatusAction().then((res) => {
      if (res.ok) setStatus(res.data);
    });
  }, []);
  
  const handleOnboard = async () => {
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
    return <button onClick={handleOnboard}>Enable Client Billing</button>;
  }
  
  return status.chargesEnabled ? "✅ Active" : "⏳ Complete onboarding";
}
```

### Send Invoice to Client
```tsx
import { 
  createBridgeInvoiceAction,
  createBridgeInvoiceCheckoutAction 
} from "@/app/actions/billing";

export function CreateInvoiceForm({ clientId }: { clientId: string }) {
  const handleCreate = async (formData: FormData) => {
    // 1. Create invoice
    const invoiceResult = await createBridgeInvoiceAction({
      clientId,
      amountCents: 1000000, // $10,000
      description: "Website Development",
      currency: "usd",
    });
    
    if (!invoiceResult.ok) {
      toast.error(invoiceResult.message);
      return;
    }
    
    // 2. Generate payment link
    const checkoutResult = await createBridgeInvoiceCheckoutAction({
      invoiceId: invoiceResult.data.invoiceId,
      successUrl: `${window.location.origin}/bridge/invoice/${invoiceResult.data.invoiceId}/success`,
      cancelUrl: `${window.location.origin}/bridge/projects`,
    });
    
    if (checkoutResult.ok) {
      // Send payment link to client via email or display in UI
      console.log("Payment link:", checkoutResult.data.url);
    }
  };
  
  return <form onSubmit={handleCreate}>...</form>;
}
```

### Buy AI Credits
```tsx
import { buyCreditsAction } from "@/app/actions/billing";

export function CreditPacksPage() {
  const handleBuy = async (packSize: "500" | "2500" | "10000") => {
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
      <button onClick={() => handleBuy("500")}>500 Credits - $25</button>
      <button onClick={() => handleBuy("2500")}>2,500 Credits - $100</button>
      <button onClick={() => handleBuy("10000")}>10,000 Credits - $350</button>
    </div>
  );
}
```

---

## 🧪 Testing

See `STRIPE_TESTING_CHECKLIST.md` for comprehensive test cases covering:
- SaaS subscriptions (with trials)
- Plan upgrades/downgrades
- Credit pack purchases
- Connect account onboarding
- Bridge invoice payments
- Client retainers (recurring subscriptions)
- Failed payments & retries
- AI credit deductions

**Quick Test:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Forward webhooks
stripe listen --forward-to localhost:3000/api/webhook/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

---

## 🏗️ Architecture

### Dual Webhook Strategy
- `/api/webhook/stripe` - SaaS subscription events
- `/api/webhook/stripe-connect` - Bridge/client billing events
- Separate signing secrets for security
- Idempotency via `billing_webhook_events` table

### Stripe Connect: Express with Direct Charges
- Studio owners are merchants of record
- 0% platform fee (pure SaaS model)
- Money goes directly to studio's Connect account
- Salt Core never touches client funds

### AI Credits System
- Monthly allocation by tier (400/1200/4000)
- Purchased credits never expire
- Deduction priority: purchased first, then monthly
- Monthly reset via cron function

---

## 📋 Production Checklist

Before deploying:
- [ ] Switch to live Stripe API keys
- [ ] Create live products/prices in Stripe
- [ ] Create webhook endpoints in Stripe Dashboard
- [ ] Run migrations on production Supabase
- [ ] Test subscription flow end-to-end
- [ ] Enable Stripe Tax (optional)
- [ ] Configure Stripe Radar (fraud prevention)
- [ ] Set up monitoring for webhook failures

---

## 🆘 Troubleshooting

### Webhook signature verification fails
- Check `STRIPE_WEBHOOK_SECRET` matches `stripe listen` output (local)
- Or matches Stripe Dashboard webhook secret (production)

### Subscription created but DB not updated
- Check `billing_webhook_events` table for processing errors
- Verify webhook endpoint is accessible (not behind firewall)
- Check Supabase RLS policies (webhooks use service role)

### Connect account stuck in pending
- User must complete Stripe onboarding form
- Check `account.updated` webhook was received
- Stripe may require additional verification docs

### Credits not added after purchase
- Check `checkout.session.completed` webhook has `metadata.type='credit_pack'`
- Verify `add_purchased_credits()` function exists in DB
- Check `ai_credit_purchases` table for record

---

## 📞 Support

- **Stripe Docs:** https://docs.stripe.com
- **Connect Guide:** https://docs.stripe.com/connect
- **Test Cards:** https://docs.stripe.com/testing#cards
- **Webhook Testing:** https://docs.stripe.com/webhooks/test

---

## 📄 License

This implementation is part of Salt Core. All rights reserved.



