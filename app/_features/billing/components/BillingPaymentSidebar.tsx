"use client";

import { AlertCircle, CircleAlert, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { BillingDetailViewModel, BillingPlaySummary } from "../detail-types";
import { BillingPlaysCard } from "./BillingPlaysCard";

const TONE_CLASS = {
  settled: "text-emerald-600 dark:text-emerald-400",
  urgent: "text-destructive",
  draft: "text-muted-foreground",
  watch: "text-flame",
} as const;

export function BillingPaymentSidebar({
  billing,
  plays,
}: {
  billing: BillingDetailViewModel;
  plays: BillingPlaySummary[];
}) {
  const payment = billing.paymentSidebar;

  return (
    <aside className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted/80">
            <CreditCard className="size-4 text-muted-foreground" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Payment status</p>
            <p className="text-xs text-muted-foreground">{billing.paymentFlowLabel}</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
          <div
            className={cn(
              "flex items-center gap-1.5 text-sm font-semibold",
              TONE_CLASS[payment.tone],
            )}
          >
            {!payment.isSettled && payment.tone !== "draft" ? (
              <AlertCircle className="size-4 shrink-0" strokeWidth={2.25} />
            ) : null}
            {payment.heroLabel}
          </div>
          <p className="mt-2 font-display text-4xl tracking-tight text-foreground">
            {payment.heroAmount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{payment.heroSubtitle}</p>
        </div>

        {payment.showWorthAttention && billing.worthAttention ? (
          <div className="mt-4 rounded-2xl border border-flame/25 bg-flame/8 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-flame">
              <CircleAlert className="size-3.5 shrink-0" strokeWidth={2.5} />
              Worth attention
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">{billing.worthAttention.reason}</p>
            <button
              type="button"
              onClick={() => toast.success(`${billing.worthAttention?.suggestedPlay ?? "Billing play"} drafted`)}
              className="mt-3 inline-flex items-start gap-1.5 text-left text-sm font-medium text-flame transition hover:text-flame/80"
            >
              {billing.worthAttention.suggestedPlay ?? "Draft billing play"}
            </button>
          </div>
        ) : null}

        {billing.statusReasons.length > 0 ? (
          <div className="mt-5 border-t border-border/60 pt-5">
            <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Why this status
            </h2>
            <ul className="mt-3 space-y-3">
              {billing.statusReasons.map((reason) => (
                <li key={reason.label} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      reason.tone === "success"
                        ? "bg-emerald-500"
                        : reason.tone === "neutral"
                          ? "bg-muted-foreground/50"
                          : reason.label.toLowerCase().includes("overdue") ||
                              reason.label.toLowerCase().includes("past due")
                            ? "bg-destructive"
                            : "bg-flame",
                    )}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{reason.label}</p>
                    <p className="text-muted-foreground">{reason.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <BillingPlaysCard partyLabel={billing.partyLabel} plays={plays} />
    </aside>
  );
}
