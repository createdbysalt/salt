"use client";

import { useRef, useState, useTransition } from "react";
import { FileUp, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";
import { SegmentedTabs } from "@/app/_features/shared/components/SegmentedTabs";
import { type BillingDirection, type BillingRecord } from "../data";
import { extractBillingRecordFromDocumentAction } from "../actions/extract-billing-record-from-document";
import type { BillingRecordDraft } from "../actions/billing-record-draft";
import { AddBillingRecordSheet } from "./AddBillingRecordSheet";
import { BillingDirectoryTable } from "./BillingDirectoryTable";

const SEGMENTS = [
  { id: "receivable" as const, label: "Invoices" },
  { id: "payable" as const, label: "Payables" },
];

type BillingMemoryPageProps = {
  initialRecords: BillingRecord[];
};

export function BillingMemoryPage({ initialRecords }: BillingMemoryPageProps) {
  const [direction, setDirection] = useState<BillingDirection>("receivable");
  const [draft, setDraft] = useState<BillingRecordDraft | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isExtracting, startExtracting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function buildBlankDraft(): BillingRecordDraft {
    const now = new Date();
    const due = new Date(now);
    due.setDate(due.getDate() + 14);
    due.setHours(12, 0, 0, 0);

    return {
      direction,
      number: `${direction === "receivable" ? "INV" : "BILL"}-${now.getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000,
      )}`,
      amountCents: 0,
      currency: "USD",
      status: "draft",
      dueAt: due.toISOString(),
      issuedAt: now.toISOString(),
      ...(direction === "receivable"
        ? { org: { id: "pending", name: "Unmatched customer" } }
        : { vendorLabel: "Unmatched vendor", category: "other" as const }),
      lineItems: [{ description: direction === "receivable" ? "New invoice item" : "New payable item", amountCents: 0 }],
      tags: ["manual", "draft"],
      extraction: {
        confidence: 100,
        needsReview: ["party", "amountCents", "dueAt"],
        sourceDocId: "manual",
      },
    };
  }

  function openBlankDraft() {
    setDraft(buildBlankDraft());
    setIsSheetOpen(true);
  }

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
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.set("file", file);
                  startExtracting(async () => {
                    const result = await extractBillingRecordFromDocumentAction(formData);
                    event.target.value = "";
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    setDraft({ ...result.data, direction });
                    setIsSheetOpen(true);
                  });
                }}
              />
              <button
                type="button"
                onClick={openBlankDraft}
                className="surface-aurora relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
              >
                <Plus className="relative z-10 size-4" strokeWidth={2.5} />
                <span className="relative z-10">
                  {direction === "receivable" ? "Add invoice" : "Record bill"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-border disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExtracting ? (
                  <Loader2 className="size-4 animate-spin" strokeWidth={2.25} />
                ) : (
                  <FileUp className="size-4" strokeWidth={2.25} />
                )}
                Add from document
              </button>
            </div>
          }
        />

        <SegmentedTabs
          active={direction}
          onChange={setDirection}
          tabs={SEGMENTS}
          layoutId="billing-segment-pill"
          ariaLabel="Billing direction"
        />

        <BillingDirectoryTable direction={direction} records={initialRecords} />
      </div>
      <AddBillingRecordSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} draft={draft} />
    </div>
  );
}
