"use server";

/**
 * Redirect-style Server Actions for Stripe Billing
 * 
 * NOTE: This file is temporarily disabled during Phase 1 migration.
 * The required Stripe helper functions need to be implemented in:
 * - libs/stripe-saas.ts (createSaasCheckoutSession, createSaasBillingPortalSession, createCreditPackCheckoutSession)
 * - libs/stripe-connect.ts (createConnectCheckoutSessionForInvoice, createConnectSubscriptionForClient)
 * 
 * These redirect actions are not critical for core dashboard functionality.
 * They will be re-enabled in Phase 2 once the Stripe integration is fully aligned.
 */

import { redirect } from "next/navigation";

// Stub functions to maintain compatibility
export async function redirectToBridgeInvoiceCheckoutAction(formData: FormData) {
  console.warn("redirectToBridgeInvoiceCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToBridgeRetainerCheckoutAction(formData: FormData) {
  console.warn("redirectToBridgeRetainerCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToSaasCheckoutAction(formData: FormData) {
  console.warn("redirectToSaasCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToSaasBillingPortalAction() {
  console.warn("redirectToSaasBillingPortalAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}

export async function redirectToCreditPackCheckoutAction(formData: FormData) {
  console.warn("redirectToCreditPackCheckoutAction is temporarily disabled - Phase 1 migration");
  redirect("/dashboard");
}
