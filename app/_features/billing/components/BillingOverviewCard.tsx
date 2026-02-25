"use client";

import React from "react";
import { CreditCard, TrendingUp, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@repo/utils";

type BillingOverviewCardProps = {
  totalOwing: number;
  retainerBalance: number | null;
  nextDueDate: string | null;
  hasAutoPay: boolean;
  currency?: string;
  className?: string;
};

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function BillingOverviewCard({
  totalOwing,
  retainerBalance,
  nextDueDate,
  hasAutoPay,
  currency = "USD",
  className,
}: BillingOverviewCardProps) {
  const metrics = [
    {
      label: "Total Owing",
      value: formatCurrency(totalOwing, currency),
      icon: CreditCard,
      highlight: totalOwing > 0,
    },
    {
      label: "Retainer Balance",
      value: retainerBalance !== null ? formatCurrency(retainerBalance, currency) : "—",
      icon: TrendingUp,
    },
    {
      label: "Next Due",
      value: formatDate(nextDueDate),
      icon: Calendar,
    },
    {
      label: "Auto-Pay",
      value: hasAutoPay ? "Enabled" : "Not set up",
      icon: CheckCircle,
      status: hasAutoPay ? ("success" as const) : ("muted" as const),
    },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border",
        className
      )}
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div key={metric.label} className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{metric.label}</span>
            </div>
            <div
              className={cn(
                "text-sm font-semibold",
                metric.highlight && "text-warning",
                metric.status === "success" && "text-success",
                metric.status === "muted" && "text-muted-foreground"
              )}
            >
              {metric.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
