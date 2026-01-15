"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@repo/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckoutButton } from "./checkout-button";

type BillingInterval = "month" | "year";

interface PricingTier {
  name: string;
  tier: "solo" | "professional" | "studio";
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  credits: string;
  highlighted?: boolean;
  badge?: string;
}

const tiers: PricingTier[] = [
  {
    name: "Solo Starter",
    tier: "solo",
    description: "Perfect for freelancers and small studios just getting started.",
    monthlyPrice: 99,
    annualPrice: 1009,
    credits: "500 AI credits/month",
    features: [
      "Up to 3 active projects",
      "5 GB storage",
      "Client portal (The Bridge)",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Professional",
    tier: "professional",
    description: "For growing studios that need more power and flexibility.",
    monthlyPrice: 179,
    annualPrice: 1821,
    credits: "1,500 AI credits/month",
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Up to 10 active projects",
      "25 GB storage",
      "White-label client portal",
      "Advanced analytics & insights",
      "Priority support",
      "14-day free trial",
    ],
  },
  {
    name: "Studio Team",
    tier: "studio",
    description: "For established studios with teams and high-volume needs.",
    monthlyPrice: 299,
    annualPrice: 3047,
    credits: "6,000 AI credits/month",
    features: [
      "Unlimited active projects",
      "Unlimited storage",
      "White-label client portal",
      "Full analytics suite",
      "5 team seats included",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export function PricingTiers() {
  const [interval, setInterval] = useState<BillingInterval>("month");

  const annualSavings = Math.round((1 - 1009 / (99 * 12)) * 100);

  return (
    <div>
      {/* Billing Toggle */}
      <div className="mb-12 flex items-center justify-center gap-4">
        <span
          className={cn(
            "text-sm font-medium",
            interval === "month" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Monthly
        </span>
        <button
          onClick={() => setInterval(interval === "month" ? "year" : "month")}
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
            interval === "year" ? "bg-primary" : "bg-muted"
          )}
          aria-label="Toggle billing interval"
        >
          <span
            className={cn(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              interval === "year" ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span
          className={cn(
            "text-sm font-medium",
            interval === "year" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Annual
        </span>
        {interval === "year" && (
          <Badge variant="secondary" className="ml-2">
            Save {annualSavings}%
          </Badge>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-8 lg:grid-cols-3">
        {tiers.map((tier) => (
          <Card
            key={tier.tier}
            className={cn(
              "relative flex flex-col",
              tier.highlighted && "border-primary shadow-lg"
            )}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge>{tier.badge}</Badge>
              </div>
            )}
            <CardHeader className="pb-4">
              <CardTitle className="text-xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    ${interval === "month" ? tier.monthlyPrice : tier.annualPrice}
                  </span>
                  <span className="text-muted-foreground">
                    /{interval === "month" ? "mo" : "year"}
                  </span>
                </div>
                {interval === "year" && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    ${Math.round(tier.annualPrice / 12)}/mo billed annually
                  </p>
                )}
              </div>

              {/* Credits */}
              <p className="mb-4 text-sm font-medium text-primary">
                {tier.credits}
              </p>

              {/* Features */}
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <CheckoutButton
                tier={tier.tier}
                interval={interval}
                highlighted={tier.highlighted}
              />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
