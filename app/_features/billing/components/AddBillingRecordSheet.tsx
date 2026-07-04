"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@repo/ui";
import { createBillingRecordAction } from "../actions/create-billing-record";
import type { BillingRecordDraft } from "../actions/billing-record-draft";
import { formatBillingMoney } from "../data";
import {
  BillingDraftFormFields,
  draftToFormValues,
  formValuesToDraft,
  type BillingDraftFormValues,
} from "./BillingDraftFormFields";
import { BillingAlreadyPaidToggle } from "./BillingAlreadyPaidToggle";
import { applyAlreadyPaidToDraft } from "../utils/intake";

type AddBillingRecordSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: BillingRecordDraft | null;
};

export function AddBillingRecordSheet({ open, onOpenChange, draft }: AddBillingRecordSheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [values, setValues] = useState<BillingDraftFormValues>({
    number: "",
    partyName: "",
    amount: "",
    dueDate: "",
    description: "",
  });

  useEffect(() => {
    if (!draft) return;
    setValues(draftToFormValues(draft));
    setAlreadyPaid(draft.status === "paid");
  }, [draft]);

  if (!draft) return null;

  const amountCents = Math.round(Number(values.amount || 0) * 100);
  const directionLabel = draft.direction === "receivable" ? "Invoice" : "Payable";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <div className="surface-aurora relative shrink-0 px-6 pb-5 pt-8 text-white">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              <WalletCards className="size-3.5" strokeWidth={2.25} />
              {directionLabel} draft
            </div>
            <SheetHeader className="space-y-2 text-left">
              <SheetTitle className="font-display text-3xl tracking-tight text-white">
                {values.number || "New record"}
              </SheetTitle>
              <SheetDescription className="text-sm text-white/80">
                Confirm the fields Salt extracted, then add it to Billing Memory.
              </SheetDescription>
            </SheetHeader>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/65">Preview total</p>
              <p className="mt-1 font-display text-3xl tracking-tight">
                {formatBillingMoney(amountCents, draft.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {draft.extraction ? (
            <div className="mb-4 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              Extraction confidence {draft.extraction.confidence}%
              {draft.extraction.needsReview.length
                ? ` · Review ${draft.extraction.needsReview.join(", ")}`
                : " · No fields flagged"}
            </div>
          ) : null}

          <BillingDraftFormFields draft={draft} values={values} onChange={setValues} />

          <div className="mt-4">
            <BillingAlreadyPaidToggle
              direction={draft.direction}
              checked={alreadyPaid}
              onChange={setAlreadyPaid}
              disabled={isPending}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background px-6 py-4">
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                let nextDraft = formValuesToDraft(draft, values);
                if (alreadyPaid) {
                  nextDraft = applyAlreadyPaidToDraft(nextDraft);
                }
                const result = await createBillingRecordAction(nextDraft);
                if (!result.ok) {
                  toast.error(result.message);
                  return;
                }

                toast.success(
                  result.data.alreadyExists
                    ? "This invoice is already in Billing Memory"
                    : "Billing record added",
                );
                onOpenChange(false);
                router.push(result.data.href);
                router.refresh();
              });
            }}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.25} /> : null}
            Add to Billing Memory
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
