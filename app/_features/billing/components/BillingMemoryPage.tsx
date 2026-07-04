"use client";

import { useState } from "react";
import { MemoryListAddButton } from "@/app/_features/memory/components/MemoryListAddButton";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { SegmentedTabs } from "@/app/_features/shared/components/SegmentedTabs";
import { type BillingDirection, type BillingRecord } from "../data";
import { BillingDirectoryTable } from "./BillingDirectoryTable";
import { BillingStatsStrip } from "./BillingStatsStrip";

const SEGMENTS = [
  { id: "receivable" as const, label: "Invoices" },
  { id: "payable" as const, label: "Payables" },
];

type BillingMemoryPageProps = {
  initialRecords: BillingRecord[];
};

export function BillingMemoryPage({ initialRecords }: BillingMemoryPageProps) {
  const [direction, setDirection] = useState<BillingDirection>("receivable");

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <PlaysSectionHeader
          eyebrow="Memory"
          title="Billing"
          description={
            direction === "receivable"
              ? "Invoices — what's due, what's paid, and which accounts need a billing touch."
              : "Payables — contractor bills, subscriptions, and money going out."
          }
          action={
            <MemoryListAddButton
              kind={{ kind: "billing", direction }}
              label={direction === "receivable" ? "Add invoice" : "Add bill"}
            />
          }
        />

        <SegmentedTabs
          active={direction}
          onChange={setDirection}
          tabs={SEGMENTS}
          layoutId="billing-segment-pill"
          ariaLabel="Billing direction"
        />

        <BillingStatsStrip direction={direction} records={initialRecords} />

        <BillingDirectoryTable direction={direction} records={initialRecords} />
      </div>
    </div>
  );
}
