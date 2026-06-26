"use client";

import { AccountRow } from "@/app/_features/memory/components/AccountFieldEditors";
import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { BillingDetailViewModel } from "../detail-types";
import { BillingLineItemsSection } from "./BillingLineItemsSection";

type BillingOverviewTabProps = {
  billing: BillingDetailViewModel;
};

export function BillingOverviewTab({ billing }: BillingOverviewTabProps) {
  const isPayable = billing.direction === "payable";

  return (
    <div className="space-y-6">
      <MemoryOverviewSection title="Summary" salt>
        <p className="text-sm leading-relaxed text-foreground/80">{billing.summary}</p>
      </MemoryOverviewSection>

      {billing.paymentSidebar.showWorthAttention && billing.worthAttention ? (
        <MemoryOverviewSection title="Worth attention" salt>
          <p className="text-sm leading-relaxed text-foreground/80">{billing.worthAttention.reason}</p>
        </MemoryOverviewSection>
      ) : null}

      <MemoryOverviewSection title="Money">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <AccountRow label="Status">{billing.statusLabel}</AccountRow>
          <AccountRow label="Total">{billing.amount}</AccountRow>
          <AccountRow label="Paid">{billing.amountPaid}</AccountRow>
          <AccountRow label="Outstanding">
            <span className={billing.balanceCents > 0 ? "font-medium text-foreground" : "text-muted-foreground"}>
              {billing.balance}
            </span>
          </AccountRow>
          <AccountRow label="Due">{billing.dueLabel}</AccountRow>
          <AccountRow label="Issued">{billing.issuedRelativeLabel}</AccountRow>
          {billing.paidLabel ? <AccountRow label="Paid date">{billing.paidLabel}</AccountRow> : null}
          {!isPayable && billing.retainerTier ? (
            <AccountRow label="Retainer tier">{billing.retainerTier}</AccountRow>
          ) : null}
          {!isPayable && billing.mrr ? <AccountRow label="MRR">{billing.mrr}</AccountRow> : null}
          {isPayable && billing.categoryLabel ? (
            <AccountRow label="Category">{billing.categoryLabel}</AccountRow>
          ) : null}
          {billing.recurrenceLabel ? (
            <AccountRow label="Recurrence">{billing.recurrenceLabel}</AccountRow>
          ) : null}
        </dl>
      </MemoryOverviewSection>

      <BillingLineItemsSection billing={billing} />
    </div>
  );
}
