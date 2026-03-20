"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBillingPortalAction } from "@/app/_features/billing/actions";
import UpgradeModal from "./UpgradeModal";

// Pricing data (must match pricing-tiers.tsx)
const TIER_PRICES = {
  solo: { monthly: 99, annual: 1009 },
  professional: { monthly: 179, annual: 1821 },
  studio: { monthly: 299, annual: 3047 },
} as const;

interface BillingStatusCardProps {
  saasStatus: string;
  saasTier: string;
  trialEndsAt: string | null;
  customerId: string | null;
  currentPeriodEnd?: string | null;
  billingInterval?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}

export default function BillingStatusCard({
  saasStatus,
  saasTier,
  trialEndsAt,
  customerId,
  currentPeriodEnd,
  billingInterval,
  cancelAtPeriodEnd,
}: BillingStatusCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  // Determine if in grace period (past_due status)
  const isGracePeriod = saasStatus === "past_due";
  const isActive = saasStatus === "active";
  const isTrialing = saasStatus === "trialing";
  const isCanceled = saasStatus === "canceled";
  const isNone = saasStatus === "none";
  
  // Format tier name for display
  const tierNames: Record<string, string> = {
    solo: "Solo Starter",
    professional: "Professional",
    studio: "Studio Team",
    none: "Free",
  };
  const tierDisplay = tierNames[saasTier] || saasTier.charAt(0).toUpperCase() + saasTier.slice(1);

  // Calculate renewal amount
  const tierKey = saasTier as keyof typeof TIER_PRICES;
  const intervalKey = billingInterval === "year" ? "annual" : "monthly";
  const renewalAmount = saasTier !== "none" && TIER_PRICES[tierKey]
    ? TIER_PRICES[tierKey][intervalKey]
    : null;

  // Format renewal date
  const renewalDate = currentPeriodEnd ? new Date(currentPeriodEnd) : null;
  const renewalDateFormatted = renewalDate
    ? renewalDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // Calculate days until trial ends
  let trialDaysRemaining = null;
  if (isTrialing && trialEndsAt) {
    const now = new Date();
    const trialEnd = new Date(trialEndsAt);
    const diffTime = trialEnd.getTime() - now.getTime();
    trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Can upgrade if on solo or professional tier
  const canUpgrade = saasTier === "solo" || saasTier === "professional";

  // Handle manage subscription click
  async function handleManageSubscription() {
    setIsLoading(true);
    try {
      const result = await createBillingPortalAction({
        returnUrl: `${window.location.origin}/studio/settings/billing`,
      });
      if (result.ok && result.data?.url) {
        router.push(result.data.url);
      } else {
        console.error("Failed to create billing portal session:", result);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error opening billing portal:", err);
      setIsLoading(false);
    }
  }
  
  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Salt Core Subscription</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Current plan and billing status
          </p>
        </div>
        
        {/* Status Badge */}
        <div>
          {isActive && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          )}
          {isTrialing && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              Trial
            </span>
          )}
          {isGracePeriod && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Payment Issue
            </span>
          )}
          {isCanceled && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              Canceled
            </span>
          )}
          {isNone && (
            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
              Free
            </span>
          )}
        </div>
      </div>
      
      {/* Grace Period Warning Banner */}
      {isGracePeriod && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold text-yellow-800">Payment Failed</p>
              <p className="text-sm text-yellow-700 mt-1">
                Your last payment failed. Please update your payment method to continue using Salt Core.
                You have a 7-day grace period to resolve this issue.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Trial Info */}
      {isTrialing && trialDaysRemaining !== null && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">{trialDaysRemaining} days</span> remaining in your trial.
            Your subscription will automatically convert to a paid plan.
          </p>
        </div>
      )}
      
      {/* Plan Details */}
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Current Plan</span>
          <span className="font-semibold">{tierDisplay}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Status</span>
          <span className="capitalize">{saasStatus.replace("_", " ")}</span>
        </div>
        {renewalDateFormatted && !cancelAtPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {isTrialing ? "Trial ends" : "Renews on"}
            </span>
            <span>{renewalDateFormatted}</span>
          </div>
        )}
        {cancelAtPeriodEnd && renewalDateFormatted && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cancels on</span>
            <span className="text-yellow-600">{renewalDateFormatted}</span>
          </div>
        )}
        {renewalAmount && !isNone && !cancelAtPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Renewal amount</span>
            <span>
              ${renewalAmount}/{billingInterval === "year" ? "year" : "month"}
            </span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        {customerId && !isNone && (
          <button
            onClick={handleManageSubscription}
            disabled={isLoading}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading
              ? "Loading..."
              : isGracePeriod
              ? "Update Payment Method"
              : "Manage Subscription"}
          </button>
        )}

        {canUpgrade && !isNone && (
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors"
          >
            Upgrade
          </button>
        )}

        {isNone && (
          <a
            href="/pricing"
            className="flex-1 inline-block text-center px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Subscribe Now
          </a>
        )}
      </div>

      {customerId && !isNone && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Manage your plan, payment methods, and billing history via Stripe
        </p>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentTier={saasTier}
        currentInterval={billingInterval || "month"}
      />
    </div>
  );
}


