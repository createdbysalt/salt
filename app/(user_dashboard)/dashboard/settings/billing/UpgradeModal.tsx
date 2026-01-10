"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getUpgradePreviewAction,
  upgradeDowngradePlanAction,
} from "@/app/actions/billing/saas-actions";
import type { ErrorResponse } from "@/app/actions/billing/schemas";

// Tier definitions
const TIERS = {
  solo: {
    name: "Solo Starter",
    credits: 500,
    features: ["3 active projects", "5 GB storage", "Email support"],
    prices: { monthly: 99, annual: 1009 },
  },
  professional: {
    name: "Professional",
    credits: 1500,
    features: [
      "10 active projects",
      "25 GB storage",
      "White-label branding",
      "Priority support",
    ],
    prices: { monthly: 179, annual: 1821 },
  },
  studio: {
    name: "Studio Team",
    credits: 6000,
    features: [
      "Unlimited projects",
      "Unlimited storage",
      "5 team seats",
      "Dedicated support",
    ],
    prices: { monthly: 299, annual: 3047 },
  },
} as const;

type TierKey = keyof typeof TIERS;

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
  currentInterval: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentTier,
  currentInterval,
}: UpgradeModalProps) {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<TierKey | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">(
    currentInterval === "year" ? "year" : "month"
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [previewData, setPreviewData] = useState<{
    proratedAmount: number;
    immediateCharge: number;
    nextBillingDate: string;
    nextBillingAmount: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Get available upgrade tiers
  const tierOrder: TierKey[] = ["solo", "professional", "studio"];
  const currentTierIndex = tierOrder.indexOf(currentTier as TierKey);
  const availableTiers = tierOrder.slice(currentTierIndex + 1);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTier(null);
      setPreviewData(null);
      setErrorMessage(null);
      setSelectedInterval(currentInterval === "year" ? "year" : "month");
    }
  }, [isOpen, currentInterval]);

  // Fetch preview when tier/interval changes
  useEffect(() => {
    if (!selectedTier) {
      setPreviewData(null);
      return;
    }

    async function fetchPreview() {
      setPreviewLoading(true);
      setErrorMessage(null);

      const result = await getUpgradePreviewAction({
        newTier: selectedTier,
        newInterval: selectedInterval,
      });

      if (result.ok) {
        setPreviewData({
          proratedAmount: result.data.proratedAmount,
          immediateCharge: result.data.immediateCharge,
          nextBillingDate: result.data.nextBillingDate,
          nextBillingAmount: result.data.nextBillingAmount,
        });
      } else {
        setErrorMessage((result as ErrorResponse).message);
        setPreviewData(null);
      }

      setPreviewLoading(false);
    }

    fetchPreview();
  }, [selectedTier, selectedInterval]);

  // Handle upgrade
  async function handleUpgrade() {
    if (!selectedTier) return;

    setUpgradeLoading(true);
    setErrorMessage(null);

    const result = await upgradeDowngradePlanAction({
      newTier: selectedTier,
      newInterval: selectedInterval,
    });

    if (result.ok) {
      // Refresh the page to show updated subscription
      router.refresh();
      onClose();
    } else {
      setErrorMessage((result as ErrorResponse).message);
    }

    setUpgradeLoading(false);
  }

  if (!isOpen) return null;

  const intervalSuffix = selectedInterval === "year" ? "annual" : "monthly";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-card border rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">Upgrade Your Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose a higher tier to unlock more features and credits
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Billing Interval Toggle */}
            <div className="flex items-center justify-center gap-3">
              <span
                className={`text-sm ${
                  selectedInterval === "month"
                    ? "font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                Monthly
              </span>
              <button
                onClick={() =>
                  setSelectedInterval(
                    selectedInterval === "month" ? "year" : "month"
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  selectedInterval === "year" ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    selectedInterval === "year" ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
              <span
                className={`text-sm ${
                  selectedInterval === "year"
                    ? "font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                Annual
                <span className="ml-1 text-xs text-green-600">(Save 15%)</span>
              </span>
            </div>

            {/* Available Tiers */}
            {availableTiers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                You're already on the highest tier (Studio Team).
              </div>
            ) : (
              <div className="grid gap-4">
                {availableTiers.map((tierKey) => {
                  const tier = TIERS[tierKey];
                  const price = tier.prices[intervalSuffix === "annual" ? "annual" : "monthly"];
                  const isSelected = selectedTier === tierKey;

                  return (
                    <button
                      key={tierKey}
                      onClick={() => setSelectedTier(tierKey)}
                      className={`text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{tier.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {tier.credits.toLocaleString()} AI credits/month
                          </p>
                          <ul className="mt-2 space-y-1">
                            {tier.features.map((feature) => (
                              <li
                                key={feature}
                                className="text-sm text-muted-foreground flex items-center gap-2"
                              >
                                <svg
                                  className="w-4 h-4 text-green-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">${price}</span>
                          <span className="text-muted-foreground">
                            /{selectedInterval === "year" ? "year" : "mo"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Proration Preview */}
            {selectedTier && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Upgrade Summary</h4>
                {previewLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <svg
                      className="animate-spin h-5 w-5 text-primary"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="ml-2 text-sm text-muted-foreground">
                      Calculating proration...
                    </span>
                  </div>
                ) : previewData ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due today (prorated)</span>
                      <span className="font-semibold">
                        ${previewData.immediateCharge.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Next billing (
                        {new Date(previewData.nextBillingDate).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )}
                        )
                      </span>
                      <span>
                        ${previewData.nextBillingAmount}/
                        {selectedInterval === "year" ? "year" : "mo"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Your credit allocation will increase immediately upon upgrade.
                    </p>
                  </div>
                ) : errorMessage ? (
                  <p className="text-sm text-red-500">{errorMessage}</p>
                ) : null}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && !selectedTier && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpgrade}
              disabled={!selectedTier || previewLoading || upgradeLoading || !!errorMessage}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {upgradeLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Upgrading...
                </span>
              ) : (
                "Upgrade Plan"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
