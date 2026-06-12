"use client"

import * as React from "react"
import {
  ArrowUpRight,
  CreditCard,
  Loader2,
  Sparkles,
  Download,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import {
  Button,
  Progress,
} from "@repo/ui"
import { cn } from "@repo/utils"
import { SettingsPage } from "../SettingsPage"

// Tier configuration
const TIER_CONFIG = {
  none: { name: "No Plan", monthlyPrice: 0, credits: 0 },
  starter: { name: "Starter", monthlyPrice: 99, credits: 500 },
  pro: { name: "Pro", monthlyPrice: 179, credits: 1500 },
  max: { name: "Max", monthlyPrice: 299, credits: 6000 },
  enterprise: { name: "Enterprise", monthlyPrice: 0, credits: 0 },
} as const

interface BillingSectionProps {
  title?: string
  subscription?: {
    tier: "none" | "starter" | "pro" | "max" | "enterprise"
    status: string
    interval: "month" | "year"
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  }
  aiCredits?: {
    monthlyAllocation: number
    purchasedCredits: number
    usedThisMonth: number
    totalAvailable: number
  }
  paymentMethod?: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  invoices?: {
    id: string
    date: string
    amount: number
    status: "paid" | "pending" | "failed"
    invoiceUrl?: string
  }[]
}

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "success" | "warning" | "danger"
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[0.68rem] font-medium leading-none",
        tone === "neutral" && "border-border/70 bg-muted/45 text-muted-foreground",
        tone === "success" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "warning" && "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "danger" && "border-destructive/25 bg-destructive/10 text-destructive"
      )}
    >
      {children}
    </span>
  )
}

// Current Plan Card Component
function CurrentPlanCard({
  subscription,
}: {
  subscription: BillingSectionProps["subscription"]
}) {
  const tier = subscription?.tier || "none"
  const tierInfo = TIER_CONFIG[tier]
  const isActive = subscription?.status === "active" || subscription?.status === "trialing"

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{tierInfo.name}</span>
              {subscription?.status === "trialing" && (
                <StatusPill tone="success">Trial</StatusPill>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <StatusPill tone="danger">Canceling</StatusPill>
              )}
            </div>
            {isActive && (
              <div className="mt-1 text-sm text-muted-foreground">
                ${tierInfo.monthlyPrice}/{subscription?.interval === "year" ? "yr" : "mo"}
                {subscription?.currentPeriodEnd && (
                  <> · Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                )}
              </div>
            )}
            {tier === "none" && (
              <div className="mt-1 text-sm text-muted-foreground">
                Subscribe to unlock all features
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {tier !== "none" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.info("Manage subscription coming soon")
                }}
              >
                Manage
              </Button>
            )}
            {(tier === "none" || tier === "starter") && (
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = "/pricing"
                }}
              >
                {tier === "none" ? "Subscribe" : "Upgrade"}
                <ArrowUpRight className="ml-1 size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// AI Credits Section Component
function AICreditsSection({
  aiCredits,
}: {
  aiCredits: BillingSectionProps["aiCredits"]
}) {
  const [isBuying, setIsBuying] = React.useState(false)

  const monthlyAllocation = aiCredits?.monthlyAllocation || 0
  const purchasedCredits = aiCredits?.purchasedCredits || 0
  const usedThisMonth = aiCredits?.usedThisMonth || 0
  const totalAvailable = aiCredits?.totalAvailable || 0

  // Calculate usage percentage (of monthly allocation only)
  const usagePercentage = monthlyAllocation > 0
    ? Math.min(100, Math.round((usedThisMonth / monthlyAllocation) * 100))
    : 0

  // Determine progress bar color
  const progressColor = usagePercentage >= 90
    ? "bg-destructive"
    : usagePercentage >= 75
    ? "bg-warning"
    : "bg-primary"

  const handleBuyCredits = async () => {
    setIsBuying(true)
    toast.info("Credit pack purchase coming soon")
    setIsBuying(false)
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-medium">AI Credits</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBuyCredits}
            disabled={isBuying}
          >
            {isBuying ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Buy more"
            )}
          </Button>
        </div>

        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Monthly usage</span>
            <span className="font-medium">
              {usedThisMonth.toLocaleString()} / {monthlyAllocation.toLocaleString()} credits
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${progressColor}`}
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Available</div>
            <div className="font-medium">{totalAvailable.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Purchased</div>
            <div className="font-medium">{purchasedCredits.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Used this month</div>
            <div className="font-medium">{usedThisMonth.toLocaleString()}</div>
          </div>
        </div>

        {/* Low credits warning */}
        {usagePercentage >= 90 && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            <span>
              You've used {usagePercentage}% of your monthly credits. Consider buying more to avoid interruptions.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Payment Method Component
function PaymentMethodSection({
  paymentMethod,
}: {
  paymentMethod: BillingSectionProps["paymentMethod"]
}) {
  const brandIcons: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <CreditCard className="size-5" />
            </div>
            {paymentMethod ? (
              <div>
                <div className="font-medium">
                  {brandIcons[paymentMethod.brand.toLowerCase()] || paymentMethod.brand} ····{paymentMethod.last4}
                </div>
                <div className="text-sm text-muted-foreground">
                  Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                </div>
              </div>
            ) : (
              <div>
                <div className="font-medium">No payment method</div>
                <div className="text-sm text-muted-foreground">
                  Add a card to enable billing
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.info("Update payment method coming soon")
            }}
          >
            {paymentMethod ? "Update" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// Invoices Section Component
function InvoicesSection({
  invoices,
}: {
  invoices: BillingSectionProps["invoices"]
}) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">
        No invoices yet
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="divide-y">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            className="flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium">
                  ${(invoice.amount / 100).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(invoice.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusPill
                tone={
                  invoice.status === "paid"
                    ? "success"
                    : invoice.status === "pending"
                      ? "warning"
                      : "danger"
                }
              >
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </StatusPill>
              {invoice.invoiceUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                >
                  <a href={invoice.invoiceUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Cancellation Section Component
function CancellationSection({
  subscription,
}: {
  subscription: BillingSectionProps["subscription"]
}) {
  const [isCanceling, setIsCanceling] = React.useState(false)

  const tier = subscription?.tier || "none"
  const isActive = subscription?.status === "active" || subscription?.status === "trialing"

  if (tier === "none" || !isActive) {
    return null
  }

  if (subscription?.cancelAtPeriodEnd) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-destructive">Subscription Canceling</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Your subscription will end on{" "}
              {subscription.currentPeriodEnd &&
                new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              . You'll retain access until then.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.info("Resume subscription coming soon")
            }}
          >
            Resume
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">Cancel Subscription</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Cancel your subscription at any time. You'll retain access until the end of your billing period.
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => {
            toast.info("Cancel subscription flow coming soon")
          }}
          disabled={isCanceling}
        >
          {isCanceling ? <Loader2 className="size-4 animate-spin" /> : "Cancel"}
        </Button>
      </div>
    </div>
  )
}

export function BillingSection({
  title = "Billing",
  subscription,
  aiCredits,
  paymentMethod,
  invoices,
}: BillingSectionProps) {
  return (
    <SettingsPage title={title}>
      <div className="space-y-6">
        {/* Section: Current Plan */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Current Plan</h2>
          <CurrentPlanCard subscription={subscription} />
        </div>

        {/* Section: AI Credits */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">AI Credits</h2>
          <AICreditsSection aiCredits={aiCredits} />
        </div>

        {/* Section: Payment Method */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Payment Method</h2>
          <PaymentMethodSection paymentMethod={paymentMethod} />
        </div>

        {/* Section: Invoice History */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Invoice History</h2>
          <InvoicesSection invoices={invoices} />
        </div>

        {/* Section: Cancellation */}
        <CancellationSection subscription={subscription} />
      </div>
    </SettingsPage>
  )
}
