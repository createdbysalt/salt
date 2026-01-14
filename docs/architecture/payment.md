# 💳 Payment Architecture (Stripe)

## 1. Core Flows

* **Checkout:** Frontend calls `POST /api/billing/checkout` -> Backend creates Stripe Session -> Returns URL -> Frontend Redirects.
* **Fulfillment:** Stripe sends Webhook -> Backend validates signature -> `BillingService` updates Database.
* **Portal:** Frontend calls `POST /api/billing/portal` -> Backend returns Stripe Customer Portal URL.

## 2. 🚨 Security Rules (AI Instructions)

1. **Secret Key:** NEVER use `process.env.STRIPE_SECRET_KEY` in the Frontend.
2. **Webhooks:** ALWAYS verify the Stripe Signature (`stripe-signature` header) before processing any event.
3. **Idempotency:** Webhooks can fire twice. Ensure `handleWebhook()` checks if the `subscription_id` has already been processed.

## 3. Environment Variables

* **Backend:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
* **Frontend:** `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Only if using Elements, otherwise not needed)

## 4. Testing Protocol

* **Local:** Use `stripe listen --forward-to localhost:4000/api/webhooks/stripe`.
* **Trigger:** Use `stripe trigger checkout.session.completed` to simulate payments.

## 4. How to Implement this Fast

Use the Director Mode (Terminal) to scaffold this. Run these prompts in order:

**Prompt 1 (Shared Types):**
"Add a `billing.ts` file to `packages/shared-types`. Export an enum `SubscriptionPlan` with placeholders for 'Hobby' and 'Pro' price IDs. Export a `SubscriptionStatus` type matching Stripe's status fields."

**Prompt 2 (Backend Service):**
"Create `apps/backend/src/services/billing/webhook.ts`. It should export a function `handleStripeEvent(event)`. Use a switch statement to handle `checkout.session.completed` and `invoice.payment_succeeded`. For now, just log the output. Context: `@docs/architecture/payment.md`."

**Prompt 3 (The Route):**
"Create the Stripe Webhook route at `apps/backend/src/routes/webhooks/stripe.ts`. It must: 1. Read the raw body. 2. Verify the signature using `stripe.webhooks.constructEvent`. 3. Call `handleStripeEvent` from the service layer. Return 200 OK."

## Summary Checklist for Velocity

| Component | Location | Responsibility |
|-----------|----------|----------------|
| Price IDs | `packages/shared-types` | Single source of truth for Plan IDs. |
| SDK Init | `apps/backend/src/lib` | Initialize `new Stripe()` once. |
| Webhooks | `apps/backend/src/routes` | Verify signature, then pass to Service. |
| Business Logic | `apps/backend/src/services` | Update DB, send emails (Fulfillment). |
| Docs | `docs/architecture/payment.md` | Tells AI how the flows connect. |