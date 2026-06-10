"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { SegmentedTabs } from "@/app/_features/shared/components/SegmentedTabs";
import { type BillingDirection } from "../data";
import { BillingDirectoryTable } from "./BillingDirectoryTable";

const SEGMENTS = [
  { id: "receivable" as const, label: "Invoices" },
  { id: "payable" as const, label: "Payables" },
];

export function BillingMemoryPage() {
  const [direction, setDirection] = useState<BillingDirection>("receivable");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Billing"
          description={
            direction === "receivable"
              ? "Invoices — what's due, what's paid, and which accounts need a billing touch."
              : "Payables — contractor bills, subscriptions, and money going out."
          }
          action={
            <button
              type="button"
              onClick={() =>
                toast(
                  direction === "receivable" ? "Add invoice (coming soon)" : "Record bill (coming soon)"
                )
              }
              className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              <Plus className="relative z-10 size-4" strokeWidth={2.5} />
              <span className="relative z-10">
                {direction === "receivable" ? "Add invoice" : "Record bill"}
              </span>
            </button>
          }
        />

        <SegmentedTabs
          active={direction}
          onChange={setDirection}
          tabs={SEGMENTS}
          layoutId="billing-segment-pill"
          ariaLabel="Billing direction"
        />

        <BillingDirectoryTable direction={direction} />
      </div>
    </div>
  );
}
