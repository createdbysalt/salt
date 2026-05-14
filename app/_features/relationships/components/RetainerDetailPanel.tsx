"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Button,
  Badge,
  Input,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Progress,
  Textarea,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  X,
  RefreshCw,
  Trash2,
  Pause,
  Play,
  ExternalLink,
  FileText,
  Check,
  Loader2,
  CreditCard,
  AlertTriangle,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import type { ClientRetainer, ClientInvoice } from "@/app/actions/billing/get-client-billing";

// =============================================================================
// Types
// =============================================================================

interface RetainerDetailPanelProps {
  retainer: ClientRetainer;
  currency: string;
  invoices?: ClientInvoice[];
  onClose: () => void;
  onPause?: (retainerId: string) => Promise<void>;
  onResume?: (retainerId: string) => Promise<void>;
  onCancel?: (retainerId: string) => Promise<void>;
  onUpdateDescription?: (retainerId: string, description: string) => Promise<void>;
  onUpdateAmount?: (retainerId: string, amountCents: number) => Promise<void>;
  onOpenCustomerPortal?: (retainerId: string) => Promise<void>;
  stripeAccountId?: string; // For "View in Stripe" link
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatCurrency(cents: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCardBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "American Express",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
    card: "Card",
  };
  return brands[brand.toLowerCase()] || brand;
}

function getStatusBadge(status: ClientRetainer["status"]) {
  switch (status) {
    case "active":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Active
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          Pending
        </Badge>
      );
    case "paused":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Paused
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
          Canceled
        </Badge>
      );
    case "past_due":
      return (
        <Badge variant="outline" className="text-xs font-normal border-red-500/50 bg-red-500/10 text-red-500">
          Past Due
        </Badge>
      );
  }
}

function getInvoiceStatusBadge(status: ClientInvoice["status"]) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          Draft
        </Badge>
      );
    case "sent":
    case "viewed":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Pending
        </Badge>
      );
    case "paid":
      return (
        <Badge variant="outline" className="text-xs font-normal">
          Paid
        </Badge>
      );
    case "overdue":
      return (
        <Badge variant="outline" className="text-xs font-normal border-red-500/50 bg-red-500/10 text-red-500">
          Overdue
        </Badge>
      );
    case "canceled":
      return (
        <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
          Canceled
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="text-xs font-normal border-red-500/50 bg-red-500/10 text-red-500">
          Failed
        </Badge>
      );
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function RetainerDetailPanel({
  retainer,
  currency,
  invoices = [],
  onClose,
  onPause,
  onResume,
  onCancel,
  onUpdateDescription,
  onUpdateAmount,
  onOpenCustomerPortal,
  stripeAccountId,
  className,
}: RetainerDetailPanelProps) {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(retainer.description || "");
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState(String(retainer.amountCents / 100));
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Sync state with retainer prop
  useEffect(() => {
    setDescription(retainer.description || "");
    setAmountInput(String(retainer.amountCents / 100));
    setIsEditingDescription(false);
    setIsEditingAmount(false);
  }, [retainer.id, retainer.description, retainer.amountCents]);

  // Calculate billing period progress
  const periodStart = retainer.currentPeriodStart ? new Date(retainer.currentPeriodStart) : null;
  const periodEnd = retainer.currentPeriodEnd ? new Date(retainer.currentPeriodEnd) : null;
  const now = new Date();

  let progressPercent = 0;
  let daysRemaining = 0;
  let totalDays = 0;
  let elapsedDays = 0;

  if (periodStart && periodEnd) {
    totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    elapsedDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    progressPercent = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const handleSaveDescription = async () => {
    if (!onUpdateDescription) return;
    setIsSavingDescription(true);
    try {
      await onUpdateDescription(retainer.id, description);
      setIsEditingDescription(false);
    } finally {
      setIsSavingDescription(false);
    }
  };

  const handleSaveAmount = async () => {
    if (!onUpdateAmount) return;
    const newAmountCents = Math.round(parseFloat(amountInput) * 100);
    if (isNaN(newAmountCents) || newAmountCents <= 0) return;
    setIsSavingAmount(true);
    try {
      await onUpdateAmount(retainer.id, newAmountCents);
      setIsEditingAmount(false);
    } finally {
      setIsSavingAmount(false);
    }
  };

  const handlePause = async () => {
    if (!onPause) return;
    setIsPausing(true);
    try {
      await onPause(retainer.id);
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    if (!onResume) return;
    setIsResuming(true);
    try {
      await onResume(retainer.id);
    } finally {
      setIsResuming(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    setIsCanceling(true);
    try {
      await onCancel(retainer.id);
      onClose();
    } finally {
      setIsCanceling(false);
    }
  };

  const handleOpenPortal = async () => {
    if (!onOpenCustomerPortal) return;
    setIsOpeningPortal(true);
    try {
      await onOpenCustomerPortal(retainer.id);
    } finally {
      setIsOpeningPortal(false);
    }
  };

  const handleCopySubscriptionId = () => {
    if (retainer.stripeSubscriptionId) {
      navigator.clipboard.writeText(retainer.stripeSubscriptionId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Calculate trial days remaining
  const trialEnd = retainer.trialEnd ? new Date(retainer.trialEnd) : null;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Build Stripe Dashboard URL
  const stripeDashboardUrl = retainer.stripeSubscriptionId
    ? stripeAccountId
      ? `https://dashboard.stripe.com/${stripeAccountId}/subscriptions/${retainer.stripeSubscriptionId}`
      : `https://dashboard.stripe.com/subscriptions/${retainer.stripeSubscriptionId}`
    : null;

  return (
    <div className={cn("flex flex-col h-full bg-card/50", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-medium">Retainer Details</h3>
        <div className="flex items-center gap-1">
          {/* Actions Dropdown */}
          {(onPause || onResume || onCancel) && retainer.status !== "canceled" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {retainer.status === "active" && onPause && (
                  <DropdownMenuItem onClick={handlePause} disabled={isPausing}>
                    {isPausing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Pause className="size-4 mr-2" />}
                    Pause Retainer
                  </DropdownMenuItem>
                )}
                {retainer.status === "paused" && onResume && (
                  <DropdownMenuItem onClick={handleResume} disabled={isResuming}>
                    {isResuming ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Play className="size-4 mr-2" />}
                    Resume Retainer
                  </DropdownMenuItem>
                )}
                {onCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="size-4 mr-2" />
                          Cancel Retainer
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel retainer?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will cancel the retainer for "{retainer.description || "Monthly Retainer"}".
                            No further invoices will be generated. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep Retainer</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancel}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isCanceling}
                          >
                            {isCanceling ? <Loader2 className="size-4 animate-spin" /> : "Cancel Retainer"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-5 pt-4">
          {/* Header Card */}
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <RefreshCw className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">
                  {retainer.description || "Monthly Retainer"}
                </p>
                {getStatusBadge(retainer.status)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Created {format(new Date(retainer.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Trial Banner */}
          {retainer.status === "trialing" && trialEnd && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
              <div className="flex items-start gap-2">
                <div className="size-5 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-blue-500">T</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-500">Trial Period</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trialDaysRemaining > 0
                      ? `${trialDaysRemaining} day${trialDaysRemaining !== 1 ? "s" : ""} remaining until ${format(trialEnd, "MMM d, yyyy")}`
                      : `Trial ends ${format(trialEnd, "MMM d, yyyy")}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cancel at Period End Warning */}
          {retainer.cancelAtPeriodEnd && periodEnd && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-600">Scheduled to Cancel</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This retainer will cancel on {format(periodEnd, "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Billing Period Progress */}
          {periodStart && periodEnd && retainer.status === "active" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Current Period</p>
                <span className="text-xs text-muted-foreground">
                  {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{format(periodStart, "MMM d, yyyy")}</span>
                <span>{format(periodEnd, "MMM d, yyyy")}</span>
              </div>
            </div>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Amount</p>
              {onUpdateAmount && !isEditingAmount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setIsEditingAmount(true)}
                >
                  Edit
                </Button>
              )}
            </div>
            {isEditingAmount ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="h-8 text-sm"
                    min="1"
                    step="0.01"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">
                    /{retainer.interval === "month" ? "mo" : "yr"}
                  </span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsEditingAmount(false);
                      setAmountInput(String(retainer.amountCents / 100));
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSaveAmount}
                    disabled={isSavingAmount}
                  >
                    {isSavingAmount ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold tabular-nums">
                  {formatCurrency(retainer.amountCents, currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /{retainer.interval === "month" ? "month" : "year"}
                </span>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Payment Method</p>
              {onOpenCustomerPortal && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={handleOpenPortal}
                  disabled={isOpeningPortal}
                >
                  {isOpeningPortal ? <Loader2 className="size-3 animate-spin" /> : "Update"}
                </Button>
              )}
            </div>
            {retainer.paymentMethod ? (
              <div className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50">
                <div className="size-8 rounded bg-background flex items-center justify-center">
                  <CreditCard className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {formatCardBrand(retainer.paymentMethod.brand)} •••• {retainer.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {retainer.paymentMethod.expiryMonth.toString().padStart(2, "0")}/{retainer.paymentMethod.expiryYear}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-md bg-muted/50">
                <div className="size-8 rounded bg-background flex items-center justify-center">
                  <CreditCard className="size-4 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No payment method on file</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Description</p>
            {isEditingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description..."
                  className="min-h-[60px] text-sm resize-none"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setIsEditingDescription(false);
                      setDescription(retainer.description || "");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSaveDescription}
                    disabled={isSavingDescription}
                  >
                    {isSavingDescription ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={cn(
                  "text-sm p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  !retainer.description && "text-muted-foreground italic"
                )}
                onClick={() => onUpdateDescription && setIsEditingDescription(true)}
              >
                {retainer.description || "Add description..."}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="space-y-3">
            {/* Billing Interval */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Billing</p>
              <span className="text-sm">
                {retainer.intervalCount > 1 && `Every ${retainer.intervalCount} `}
                {retainer.interval === "month"
                  ? retainer.intervalCount === 1
                    ? "Monthly"
                    : "months"
                  : retainer.intervalCount === 1
                    ? "Yearly"
                    : "years"}
                {" "}
                ({retainer.collectionMethod === "charge_automatically" ? "auto-charge" : "invoice"})
              </span>
            </div>

            {/* Next Renewal */}
            {periodEnd && (retainer.status === "active" || retainer.status === "trialing") && !retainer.cancelAtPeriodEnd && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Next Renewal</p>
                <span className="text-sm">{format(periodEnd, "MMM d, yyyy")}</span>
              </div>
            )}

            {/* Project */}
            {retainer.projectName && (
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">Project</p>
                <span className="text-sm text-primary">{retainer.projectName}</span>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Status</p>
              {getStatusBadge(retainer.status)}
            </div>
          </div>

          {/* Invoices Section */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Invoices ({invoices.length})
            </p>
            {invoices.length > 0 ? (
              <div className="space-y-1.5">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.dueDate
                            ? format(new Date(invoice.dueDate), "MMM d, yyyy")
                            : "No due date"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(invoice.amountCents, currency)}
                      </span>
                      {getInvoiceStatusBadge(invoice.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-muted/50 p-4 text-center">
                <FileText className="size-5 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  No invoices yet for this retainer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Stripe Reference */}
      {retainer.stripeSubscriptionId && (
        <div className="shrink-0 px-4 py-3 border-t border-border/60 flex items-center justify-between">
          <button
            onClick={handleCopySubscriptionId}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copiedId ? (
              <>
                <Check className="size-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-3" />
                {retainer.stripeSubscriptionId.slice(0, 14)}...
              </>
            )}
          </button>
          {stripeDashboardUrl && (
            <a
              href={stripeDashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View in Stripe
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
