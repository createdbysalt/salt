"use client";

import { redirectToCreditPackCheckoutAction } from "@/app/actions/billing/redirect-actions";

interface CreditPacksCardProps {
  monthlyAllocation: number;
  purchasedCredits: number;
  usedThisMonth: number;
}

// Credit pack offerings (these should match your Stripe product/price setup)
const CREDIT_PACKS = [
  { credits: 1000, priceId: "price_credit_pack_1000", price: 10, label: "Starter" },
  { credits: 3000, priceId: "price_credit_pack_3000", price: 25, label: "Pro", popular: true },
  { credits: 10000, priceId: "price_credit_pack_10000", price: 75, label: "Studio" },
];

export default function CreditPacksCard({
  monthlyAllocation,
  purchasedCredits,
  usedThisMonth,
}: CreditPacksCardProps) {
  const totalAvailable = monthlyAllocation + purchasedCredits - usedThisMonth;
  const monthlyRemaining = Math.max(0, monthlyAllocation - usedThisMonth);
  const purchasedRemaining = Math.max(0, purchasedCredits - Math.max(0, usedThisMonth - monthlyAllocation));
  
  // Calculate usage percentage for visual bar
  const usagePercent = monthlyAllocation > 0 
    ? Math.min(100, (usedThisMonth / monthlyAllocation) * 100)
    : 0;
  
  const isRunningLow = totalAvailable < monthlyAllocation * 0.2 && totalAvailable > 0;
  const isOutOfCredits = totalAvailable <= 0;
  
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CREDIT_PACKS.map((pack) => (
            <form
              key={pack.priceId}
              action={redirectToCreditPackCheckoutAction}
              className={`relative border rounded-lg p-4 hover:border-primary transition-colors ${
                pack.popular ? "border-primary" : ""
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-primary text-primary-foreground">
                    Popular
                  </span>
                </div>
              )}
              
              <input type="hidden" name="priceId" value={pack.priceId} />
              <input type="hidden" name="credits" value={pack.credits} />
              <input
                type="hidden"
                name="successUrl"
                value="/dashboard/settings/billing?success=credits"
              />
              <input
                type="hidden"
                name="cancelUrl"
                value="/dashboard/settings/billing"
              />
              
              <div className="text-center mb-3">
                <p className="text-sm text-muted-foreground">{pack.label}</p>
                <p className="text-2xl font-bold mt-1">{pack.credits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">credits</p>
              </div>
              
              <button
                type="submit"
                className="w-full px-3 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ${pack.price}
              </button>
            </form>
          ))}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Purchased credits never expire and can be used across all projects
        </p>
      </div>
    </div>
  );
}


