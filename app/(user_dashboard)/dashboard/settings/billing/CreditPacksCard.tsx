"use client";

import { useState, useTransition } from "react";
import { buyCreditsAction } from "@/app/_features/billing/actions";
import type { ErrorResponse } from "@/app/_features/billing/types";

interface CreditPacksCardProps {
  monthlyAllocation: number;
  purchasedCredits: number;
  usedThisMonth: number;
  userTier: string | null; // User's current SaaS tier (solo, professional, studio, none)
}

// Credit pack offerings matching PRD and stripe-setup-products.ts
// min_tier: minimum tier required to purchase this pack
const CREDIT_PACKS = [
  { credits: 500, price: 25, label: "Starter Pack", minTier: "solo" },
  { credits: 1000, price: 40, label: "Pro Pack", popular: true, minTier: "professional" },
  { credits: 2000, price: 50, label: "Team Pack", minTier: "studio" },
];

// Tier hierarchy for comparison
const TIER_LEVELS: Record<string, number> = {
  none: 0,
  free: 0,
  solo: 1,
  starter: 1, // alias
  professional: 2,
  studio: 3,
  team: 3, // alias
  enterprise: 4,
};

function canPurchasePack(userTier: string | null, minTier: string): boolean {
  const userLevel = TIER_LEVELS[userTier || "none"] || 0;
  const requiredLevel = TIER_LEVELS[minTier] || 0;
  return userLevel >= requiredLevel;
}

export default function CreditPacksCard({
  monthlyAllocation,
  purchasedCredits,
  usedThisMonth,
  userTier,
}: CreditPacksCardProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [purchasingPack, setPurchasingPack] = useState<number | null>(null);

  const totalAvailable = monthlyAllocation + purchasedCredits - usedThisMonth;
  const monthlyRemaining = Math.max(0, monthlyAllocation - usedThisMonth);
  const purchasedRemaining = Math.max(0, purchasedCredits - Math.max(0, usedThisMonth - monthlyAllocation));

  // Calculate usage percentage for visual bar
  const usagePercent = monthlyAllocation > 0
    ? Math.min(100, (usedThisMonth / monthlyAllocation) * 100)
    : 0;

  const isRunningLow = totalAvailable < monthlyAllocation * 0.2 && totalAvailable > 0;
  const isOutOfCredits = totalAvailable <= 0;

  // Filter packs by user's tier
  const availablePacks = CREDIT_PACKS.filter((pack) => canPurchasePack(userTier, pack.minTier));
  const hasSubscription = userTier && userTier !== "none" && userTier !== "free";

  const handleBuyCredits = async (packSize: 500 | 1000 | 2000) => {
    setError(null);
    setPurchasingPack(packSize);

    startTransition(async () => {
      const result = await buyCreditsAction({
        packSize: packSize.toString() as "500" | "1000" | "2000",
        successUrl: `${window.location.origin}/dashboard/settings/billing?success=credits`,
        cancelUrl: `${window.location.origin}/dashboard/settings/billing`,
      });

      if (result.ok) {
        // Redirect to Stripe Checkout
        window.location.href = result.data.url;
      } else {
        setError((result as ErrorResponse).message);
        setPurchasingPack(null);
      }
    });
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-1">AI Credits</h2>
        <p className="text-muted-foreground text-sm">
          Credits are used for AI-powered features like code generation and analysis
        </p>
      </div>

      {/* Warning Banners */}
      {isOutOfCredits && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-semibold">Out of Credits</p>
          <p className="text-sm text-red-700 mt-1">
            You've used all your credits for this month. Purchase a credit pack to continue using AI features.
          </p>
        </div>
      )}

      {isRunningLow && !isOutOfCredits && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-semibold">Running Low</p>
          <p className="text-sm text-yellow-700 mt-1">
            You're running low on credits. Consider purchasing a credit pack to avoid interruption.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 font-semibold">Purchase Error</p>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Credit Balance */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-3xl font-bold">{totalAvailable.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">credits remaining</span>
        </div>

        {/* Usage Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Monthly</p>
            <p className="font-semibold">{monthlyRemaining.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Purchased</p>
            <p className="font-semibold">{purchasedRemaining.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Used</p>
            <p className="font-semibold">{usedThisMonth.toLocaleString()}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          Monthly credits reset on the 1st of each month. Purchased credits never expire.
        </p>
      </div>

      {/* Credit Packs */}
      <div>
        <h3 className="font-semibold mb-3">Purchase Credit Packs</h3>

        {!hasSubscription ? (
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Subscribe to a plan to purchase additional credits.
            </p>
            <a
              href="/pricing"
              className="text-sm font-medium text-primary hover:underline"
            >
              View Plans →
            </a>
          </div>
        ) : availablePacks.length === 0 ? (
          <div className="p-4 bg-muted/30 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No credit packs available for your current tier.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {availablePacks.map((pack) => (
                <div
                  key={pack.credits}
                  className={`relative border rounded-lg p-4 ${
                    pack.popular ? "border-primary" : ""
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                        Best Value
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-3">
                    <p className="text-sm text-muted-foreground">{pack.label}</p>
                    <p className="text-2xl font-bold mt-1">{pack.credits.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">credits</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBuyCredits(pack.credits as 500 | 1000 | 2000)}
                    disabled={isPending}
                    className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPending && purchasingPack === pack.credits ? (
                      "Processing..."
                    ) : (
                      `$${pack.price}`
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Show unavailable packs hint */}
            {availablePacks.length < CREDIT_PACKS.length && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Upgrade your plan to unlock larger credit packs at better rates.
              </p>
            )}
          </>
        )}

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Purchased credits never expire and can be used across all projects
        </p>
      </div>
    </div>
  );
}
