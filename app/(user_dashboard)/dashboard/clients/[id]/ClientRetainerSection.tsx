"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/_components/ui/card";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { RefreshCcw, Plus, XCircle, AlertCircle } from "lucide-react";

type Retainer = {
  id: string;
  status: "pending" | "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid";
  amount_cents: number;
  currency: string;
  interval: "day" | "week" | "month" | "year";
  interval_count: number;
  description: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  stripe_checkout_session_id?: string | null;
};

type ClientRetainerSectionProps = {
  clientId: string;
  retainer: Retainer | null;
  onSetupRetainer: () => void;
  onCancelRetainer: () => void;
};

const STATUS_BADGES: Record<Retainer["status"], { label: string; className: string }> = {
  pending: { label: "Pending Setup", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400" },
  incomplete: { label: "Incomplete", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  incomplete_expired: { label: "Expired", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  trialing: { label: "Trial", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  active: { label: "Active", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  past_due: { label: "Payment Failed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  canceled: { label: "Canceled", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  unpaid: { label: "Unpaid", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatInterval(interval: string, intervalCount: number): string {
  const labels: Record<string, string> = {
    day: intervalCount === 1 ? "day" : "days",
    week: intervalCount === 1 ? "week" : "weeks",
    month: intervalCount === 1 ? "month" : "months",
    year: intervalCount === 1 ? "year" : "years",
  };
  const label = labels[interval] || interval;
  return intervalCount === 1 ? label : `${intervalCount} ${label}`;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ClientRetainerSection({
  clientId: _clientId,
  retainer,
  onSetupRetainer,
  onCancelRetainer,
}: ClientRetainerSectionProps) {
  const hasActiveRetainer = retainer && !["canceled", "incomplete_expired"].includes(retainer.status);
  const isPending = retainer?.status === "pending";
  const isCanceling = retainer?.cancel_at_period_end && retainer.status === "active";
  // Show cancel button for active retainers that aren't already canceling
  const canCancel = hasActiveRetainer && !isCanceling && retainer?.status === "active";
  // Check for payment failure status
  const hasPaymentFailed = retainer?.status === "past_due" || retainer?.status === "unpaid";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Retainer</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Recurring subscription for this client
          </p>
        </div>
        {!hasActiveRetainer && (
          <Button onClick={onSetupRetainer} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Set Up Retainer
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!retainer ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No retainer set up</p>
            <p className="text-sm mb-4">
              Set up a recurring subscription to bill this client on a regular schedule.
            </p>
            <Button onClick={onSetupRetainer} variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Set Up Retainer
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Alert */}
            {isPending && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-950/30 dark:border-orange-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      Awaiting Client Setup
                    </p>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                      Share the payment link with your client. The retainer will activate once they complete payment setup.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Failed Alert */}
            {hasPaymentFailed && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/30 dark:border-red-900">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Payment Failed
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                      The latest payment attempt failed. Stripe will automatically retry. Contact your client to update their payment method.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_BADGES[retainer.status].className}>
                  {STATUS_BADGES[retainer.status].label}
                </Badge>
                {isCanceling && (
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    Cancels on {formatDate(retainer.current_period_end)}
                  </span>
                )}
              </div>
            </div>

            {/* Amount Row */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-medium">
                {formatCurrency(retainer.amount_cents, retainer.currency)}/{formatInterval(retainer.interval, retainer.interval_count)}
              </span>
            </div>

            {/* Description Row */}
            {retainer.description && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Description</span>
                <span className="text-sm text-right max-w-[200px] truncate">
                  {retainer.description}
                </span>
              </div>
            )}

            {/* Next Billing Date */}
            {hasActiveRetainer && !isCanceling && !isPending && retainer.current_period_end && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Next billing</span>
                <span className="text-sm">
                  {formatDate(retainer.current_period_end)}
                </span>
              </div>
            )}

            {/* Canceled At */}
            {retainer.status === "canceled" && retainer.canceled_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Canceled on</span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(retainer.canceled_at)}
                </span>
              </div>
            )}

            {/* Cancel Button */}
            {canCancel && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelRetainer}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/50"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Cancel Retainer
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
