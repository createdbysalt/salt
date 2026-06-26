"use client";

import { MemoryOverviewSection } from "@/app/_features/memory/components/MemoryOverviewSection";
import type { BillingDetailViewModel } from "../detail-types";

type BillingLineItemsSectionProps = {
  billing: BillingDetailViewModel;
};

export function BillingLineItemsSection({ billing }: BillingLineItemsSectionProps) {
  const items = billing.lineItems;

  return (
    <MemoryOverviewSection title="Line items">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No line items recorded yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.description}-${item.amount}-${index}`}
              className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-muted/15 px-4 py-3"
            >
              <span className="min-w-0 text-sm leading-relaxed text-foreground/90">
                {item.description}
              </span>
              <span className="shrink-0 pt-0.5 text-sm font-medium tabular-nums text-foreground">
                {item.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </MemoryOverviewSection>
  );
}
