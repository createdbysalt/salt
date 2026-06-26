"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ArrowUpRight, CalendarClock, CheckCircle2, Loader2, Receipt, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { memoryHeroInnerClass, memoryHeroSectionClass } from "@/app/_features/memory/utils/memory-layout";
import { SourceExternalLink } from "@/app/_features/capture/components/SourceExternalLink";
import { markBillingRecordPaidAction } from "../actions/mark-billing-record-paid";
import type { BillingDetailViewModel } from "../detail-types";
import { markPaidActionLabel } from "../utils/payment-display";

type BillingDetailHeroProps = {
  billing: BillingDetailViewModel;
};

export function BillingDetailHero({ billing }: BillingDetailHeroProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const partyLine = [billing.partyLabel, billing.partySubtitle].filter(Boolean).join(" · ");
  const metaLine = [billing.number, partyLine].filter(Boolean).join(" · ");
  const isReceivable = billing.direction === "receivable";
  const canMarkPaid = !billing.paymentSidebar.isSettled;
  const showReminder =
    isReceivable &&
    billing.status !== "draft" &&
    (billing.worthAttention ||
      billing.status === "due" ||
      billing.status === "overdue" ||
      billing.status === "partial");

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markBillingRecordPaidAction(billing.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        isReceivable ? "Marked as payment received" : "Marked as paid",
      );
      router.refresh();
    });
  }

  return (
    <section className={memoryHeroSectionClass}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.22),transparent_34%)]" />
      <div className={memoryHeroInnerClass}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                {billing.directionLabel}
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white/85">
                {billing.statusLabel}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 self-start">
              {isReceivable && showReminder ? (
                <button
                  type="button"
                  onClick={() => toast.success(`${billing.worthAttention?.suggestedPlay ?? "Reminder"} drafted`)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-foreground transition hover:bg-white/90"
                >
                  <Sparkles className="size-3.5" strokeWidth={2.5} />
                  Send reminder
                </button>
              ) : null}
              {canMarkPaid ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleMarkPaid}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-foreground transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
                  ) : (
                    <CheckCircle2 className="size-3.5" strokeWidth={2.25} />
                  )}
                  {markPaidActionLabel(billing.direction)}
                </button>
              ) : null}
              {!isReceivable && canMarkPaid && billing.status !== "draft" ? (
                <button
                  type="button"
                  onClick={() => toast.success("Payment scheduled")}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15"
                >
                  <CalendarClock className="size-3.5" strokeWidth={2.25} />
                  Schedule payment
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-4 sm:gap-5">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/10 sm:size-16">
                <Receipt className="size-7 text-white sm:size-8" strokeWidth={1.75} />
              </span>
              <p className="font-display text-5xl tracking-tight text-white sm:text-6xl lg:text-7xl">{billing.amount}</p>
            </div>
            <p className="mt-4 text-base text-white/85 sm:text-lg">{metaLine}</p>
            {billing.work ? <p className="mt-1 text-sm text-white/65">{billing.work.title}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 text-sm text-white/75">
            {billing.sourceExternalId ? (
              <span>
                {billing.providerDisplay.label} ID{" "}
                <span className="font-mono text-white/90">{billing.sourceExternalId}</span>
              </span>
            ) : null}
            {billing.appUrl ? (
              <Link
                href={billing.appUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-white transition hover:text-white/85"
              >
                {billing.appActionLabel}
                <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
              </Link>
            ) : null}
            {billing.captureSourceUrl ? (
              <SourceExternalLink
                href={billing.captureSourceUrl}
                label="Open in Gmail"
                className="text-white/90 hover:text-white text-sm no-underline hover:underline"
              />
            ) : null}
            {billing.documentUrl ? (
              <SourceExternalLink
                href={billing.documentUrl}
                label="View document"
                className="text-white/90 hover:text-white text-sm no-underline hover:underline"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
