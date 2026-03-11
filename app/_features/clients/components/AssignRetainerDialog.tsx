"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Check, Clock, Copy, ExternalLink, Loader2, Star, Zap } from "lucide-react"
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  RadioGroup,
  RadioGroupItem,
  Label,
  Skeleton,
} from "@repo/ui"
import { cn } from "@repo/utils"
import { toast } from "sonner"
import { getServices } from "@/app/_features/services/actions"
import type { StudioService } from "@/app/_features/services/types"
import { createBridgeRetainerCheckoutAction } from "@/app/actions/billing/connect-actions"

// =============================================================================
// Types
// =============================================================================

interface AssignRetainerDialogProps {
  clientId: string
  clientName: string
  children: React.ReactNode
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getBillingIntervalLabel(interval: string): string {
  switch (interval) {
    case "monthly":
      return "/mo"
    case "quarterly":
      return "/qtr"
    case "annually":
      return "/yr"
    default:
      return "/mo"
  }
}

// =============================================================================
// Retainer Package Card
// =============================================================================

interface RetainerPackageCardProps {
  service: StudioService
  isSelected: boolean
  onSelect: () => void
}

function RetainerPackageCard({ service, isSelected, onSelect }: RetainerPackageCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-lg border p-4 cursor-pointer transition-all hover:border-primary/50",
        isSelected && "border-primary ring-1 ring-primary bg-primary/5",
        service.is_recommended && "border-amber-500/50"
      )}
      onClick={onSelect}
    >
      {service.is_recommended && (
        <Badge className="absolute -top-2 right-3 bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">
          <Star className="size-3 mr-1" />
          Recommended
        </Badge>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <RadioGroupItem
              value={service.id}
              id={service.id}
              checked={isSelected}
              className="shrink-0"
            />
            <Label
              htmlFor={service.id}
              className="font-medium cursor-pointer"
            >
              {service.name}
            </Label>
          </div>
          {service.description && (
            <p className="text-sm text-muted-foreground ml-6 line-clamp-2">
              {service.description}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="font-semibold">
            {formatCurrency(service.price_min || 0, service.currency)}
            <span className="text-sm font-normal text-muted-foreground">
              {getBillingIntervalLabel(service.billing_interval)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Features */}
      <div className="flex flex-wrap gap-2 mt-3 ml-6">
        {(service.hours_included ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs font-normal">
            <Clock className="size-3 mr-1" />
            {service.hours_included}h/mo
          </Badge>
        )}
        {service.response_time && (
          <Badge variant="secondary" className="text-xs font-normal">
            <Zap className="size-3 mr-1" />
            {service.response_time}
          </Badge>
        )}
        {(service.rollover_hours ?? 0) > 0 && (
          <Badge variant="secondary" className="text-xs font-normal">
            {service.rollover_hours}h rollover
          </Badge>
        )}
      </div>

      {/* Included Services */}
      {service.services_included && service.services_included.length > 0 && (
        <div className="mt-3 ml-6 space-y-1">
          {service.services_included.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3 text-primary" />
              <span>{item}</span>
            </div>
          ))}
          {service.services_included.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{service.services_included.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="flex gap-2 mt-3 ml-6">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Checkout Link Result
// =============================================================================

interface CheckoutLinkResultProps {
  url: string
  onCopy: () => void
  onClose: () => void
}

function CheckoutLinkResult({ url, onCopy, onClose }: CheckoutLinkResultProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    onCopy()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Check className="size-4 text-primary" />
          <span className="font-medium">Checkout link created!</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Share this link with your client to let them subscribe to this retainer.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-background rounded px-2 py-1.5 truncate border">
            {url}
          </code>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function AssignRetainerDialog({
  clientId,
  clientName,
  children,
}: AssignRetainerDialogProps) {
  const [open, setOpen] = useState(false)
  const [retainerPackages, setRetainerPackages] = useState<StudioService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)

  // Fetch retainer packages on open
  useEffect(() => {
    if (!open) return

    async function fetchRetainers() {
      setIsLoading(true)
      try {
        const result = await getServices()
        if (result.success) {
          // Filter for active retainer services only
          const retainers = result.data.filter(
            (s) => s.pricing_type === "retainer" && s.is_active && !s.archived_at && !s.deleted_at
          )
          setRetainerPackages(retainers)

          // Auto-select recommended package if available
          const recommended = retainers.find((r) => r.is_recommended)
          if (recommended) {
            setSelectedPackageId(recommended.id)
          } else if (retainers.length > 0) {
            setSelectedPackageId(retainers[0].id)
          }
        } else {
          toast.error(result.error || "Failed to load retainer packages")
        }
      } catch (error) {
        console.error("Error fetching retainer packages:", error)
        toast.error("Failed to load retainer packages")
      } finally {
        setIsLoading(false)
      }
    }

    fetchRetainers()
  }, [open])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedPackageId(null)
      setCheckoutUrl(null)
    }
  }, [open])

  const selectedPackage = retainerPackages.find((p) => p.id === selectedPackageId)

  const handleCreateCheckout = async () => {
    if (!selectedPackage) return

    setIsCreating(true)
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : ""

      const result = await createBridgeRetainerCheckoutAction({
        retainerData: {
          clientId,
          amountCents: Math.round((selectedPackage.price_min || 0) * 100),
          currency: selectedPackage.currency.toLowerCase(),
          interval: selectedPackage.billing_interval === "annually" ? "year" : "month",
          intervalCount: selectedPackage.billing_interval === "quarterly" ? 3 : 1,
          description: selectedPackage.name,
        },
        successUrl: `${baseUrl}/bridge/billing?success=true`,
        cancelUrl: `${baseUrl}/bridge/billing?canceled=true`,
      })

      if (result.success && result.data) {
        setCheckoutUrl(result.data.url)
        toast.success("Checkout link created")
      } else {
        toast.error(result.error || "Failed to create checkout link")
      }
    } catch (error) {
      console.error("Error creating checkout:", error)
      toast.error("Failed to create checkout link")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Up Retainer</DialogTitle>
          <DialogDescription>
            Choose a retainer package for {clientName}. They'll receive a link to subscribe.
          </DialogDescription>
        </DialogHeader>

        {checkoutUrl ? (
          <CheckoutLinkResult
            url={checkoutUrl}
            onCopy={() => toast.success("Link copied to clipboard")}
            onClose={() => setOpen(false)}
          />
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <LoadingSkeleton />
            ) : retainerPackages.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No retainer packages available.
                </p>
                <p className="text-xs text-muted-foreground">
                  Create retainer packages in Billing &gt; Services first.
                </p>
              </div>
            ) : (
              <RadioGroup
                value={selectedPackageId || undefined}
                onValueChange={setSelectedPackageId}
                className="space-y-3"
              >
                {retainerPackages.map((pkg) => (
                  <RetainerPackageCard
                    key={pkg.id}
                    service={pkg}
                    isSelected={pkg.id === selectedPackageId}
                    onSelect={() => setSelectedPackageId(pkg.id)}
                  />
                ))}
              </RadioGroup>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateCheckout}
                disabled={!selectedPackageId || isCreating || retainerPackages.length === 0}
              >
                {isCreating && <Loader2 className="size-4 animate-spin mr-2" />}
                Generate Link
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
