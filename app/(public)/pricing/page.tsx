import { Metadata } from "next";
import Link from "next/link";
import { PricingTiers } from "@/app/_features/billing/components/pricing-tiers";
import { Button } from "@/app/_components/ui/button";

export const metadata: Metadata = {
  title: "Pricing | Salt Core",
  description:
    "Choose the perfect Salt Core plan for your studio. From Solo to Team, we have pricing that scales with your business.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-bold">
            Salt Core
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Choose the plan that fits your studio. All plans include our core
            features with AI credits that refresh monthly.
          </p>
        </div>

        {/* Pricing Tiers */}
        <PricingTiers />

        {/* FAQ or Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Have questions?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact our sales team
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
