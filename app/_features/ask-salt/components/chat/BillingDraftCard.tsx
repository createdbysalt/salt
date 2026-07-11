"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ChevronDown, Loader2, WalletCards } from "lucide-react";
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
  /** When false, stay in chat after save (record deck mode). Defaults to true. */
  navigateOnSave?: boolean;
  /** Called after a successful save — used by the record deck to advance. */
  onComplete?: (href: string) => void;
};

export function BillingDraftCard({
  draft: initialDraft,
  navigateOnSave = true,
  onComplete,
}: BillingDraftCardProps) {
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
  const amountLabel = formatBillingMoney(amountCents, initialDraft.currency);

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

      if (onComplete) {
        toast.success(
          result.data.alreadyExists
            ? "This invoice is already in Billing Memory"
            : "Added to Billing Memory",
        );
        onComplete(result.data.href);
      } else {
        setSavedHref(result.data.href);
        toast.success(
          result.data.alreadyExists
            ? "This invoice is already in Billing Memory"
            : "Added to Billing Memory",
        );
        if (navigateOnSave) {
          router.push(result.data.href);
        }
      }
      router.refresh();
    });
  }

  if (savedHref) {
    return (
      <article
        className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
        data-testid="billing-draft-card"
      >
        <div className="surface-aurora relative px-4 py-3.5 text-white">
          <div className="relative z-10 min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              <WalletCards className="size-3.5" strokeWidth={2.25} />
              Billing
            </div>
            <p className="mt-2 font-display text-xl tracking-tight text-white">{values.number}</p>
            <p className="mt-1 truncate text-sm text-white/75">
              {directionLabel} · {partyName} · {amountLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3">
          <Link
            href={savedHref}
            className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            Open in Billing
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article
      className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]"
      data-testid="billing-draft-card"
    >
      <div className="surface-aurora relative px-4 py-3.5 text-white">
        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
            <WalletCards className="size-3.5" strokeWidth={2.25} />
            Billing
          </div>
          <p className="mt-2 font-display text-xl tracking-tight text-white">{values.number}</p>
          <p className="mt-1 truncate text-sm text-white/75">
            {directionLabel} · {partyName} · {amountLabel}
          </p>
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={saveDraft}
            className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} /> : null}
            Add to Billing Memory
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowEdit((open) => !open)}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-full border border-border/60 px-3.5 text-sm font-medium text-muted-foreground transition hover:border-border hover:text-foreground disabled:opacity-50"
          >
            {showEdit ? "Hide" : "Edit"}
            <ChevronDown
              className={cn("size-3.5 transition", showEdit && "rotate-180")}
              strokeWidth={2.25}
            />
          </button>
        </div>
      </div>
    </article>
  );
}
