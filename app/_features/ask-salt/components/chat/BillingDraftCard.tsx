"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import {
  createBillingRecordAction,
  type BillingRecordDraft,
} from "@/app/_features/billing/actions";
import { formatBillingMoney } from "@/app/_features/billing/data";
import {
  BillingDraftFormFields,
  draftToFormValues,
  formValuesToDraft,
  type BillingDraftFormValues,
} from "@/app/_features/billing/components/BillingDraftFormFields";
import { BillingAlreadyPaidToggle } from "@/app/_features/billing/components/BillingAlreadyPaidToggle";
import { applyAlreadyPaidToDraft } from "@/app/_features/billing/utils/intake";

type BillingDraftCardProps = {
  draft: BillingRecordDraft;
};

export function BillingDraftCard({ draft: initialDraft }: BillingDraftCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(initialDraft.status === "paid");
  const [values, setValues] = useState<BillingDraftFormValues>(() => draftToFormValues(initialDraft));

  useEffect(() => {
    setValues(draftToFormValues(initialDraft));
    setSavedHref(null);
    setShowEdit(false);
    setAlreadyPaid(initialDraft.status === "paid");
  }, [initialDraft]);

  const partyName = values.partyName || "Unmatched party";
  const directionLabel = initialDraft.direction === "receivable" ? "Invoice" : "Payable";
  const amountCents = Math.round(Number(values.amount || 0) * 100);

  function saveDraft() {
    startTransition(async () => {
      let nextDraft = formValuesToDraft(initialDraft, values);
      if (alreadyPaid) {
        nextDraft = applyAlreadyPaidToDraft(nextDraft);
      }
      const result = await createBillingRecordAction(nextDraft);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setSavedHref(result.data.href);
      toast.success(
        result.data.alreadyExists
          ? "This invoice is already in Billing Memory"
          : "Added to Billing Memory",
      );
      router.push(result.data.href);
      router.refresh();
    });
  }

  if (savedHref) {
    return (
      <div
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 px-3.5 py-3"
        data-testid="billing-draft-card"
      >
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-4 text-emerald-600" strokeWidth={2.25} />
          <span className="font-medium">Saved to Billing Memory</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="billing-draft-card"
    >
      <div className="surface-aurora relative px-3.5 py-3 text-white">
        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              <WalletCards className="size-3.5" strokeWidth={2.25} />
              {directionLabel} ready
            </div>
            <p className="mt-2 truncate font-display text-xl tracking-tight">{values.number}</p>
            <p className="mt-1 truncate text-sm text-white/80">{partyName}</p>
          </div>
          <p className="shrink-0 font-display text-2xl tracking-tight">
            {formatBillingMoney(amountCents, initialDraft.currency)}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-3.5 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Salt pulled this from your conversation. Add it to Billing Memory in one step, or expand to
          tweak a field first.
        </p>

        {showEdit ? (
          <BillingDraftFormFields
            draft={initialDraft}
            values={values}
            onChange={setValues}
            compact
          />
        ) : null}

        <BillingAlreadyPaidToggle
          direction={initialDraft.direction}
          checked={alreadyPaid}
          onChange={setAlreadyPaid}
          disabled={isPending}
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={saveDraft}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" strokeWidth={2.25} /> : null}
            Add to Billing Memory
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowEdit((open) => !open)}
            className="inline-flex h-8 w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          >
            {showEdit ? "Hide details" : "Edit before adding"}
            <ChevronDown className={cn("size-3.5 transition", showEdit && "rotate-180")} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
