"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Receipt,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui";
import { memoryHeroBadgeClass, memoryHeroInnerClass, memoryHeroSectionClass } from "@/app/_features/memory/utils/memory-layout";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import { SourceExternalLink } from "@/app/_features/capture/components/SourceExternalLink";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import { markBillingRecordPaidAction } from "../actions/mark-billing-record-paid";
import type { BillingDetailViewModel } from "../detail-types";
import { markPaidActionLabel } from "../utils/payment-display";
import type { Connection } from "@/app/_lib/demo/people-demo-data";

export type BillingQuickAction = "note" | "connection";

type BillingDetailHeroProps = {
  billing: BillingDetailViewModel;
  connections?: Connection[];
  onLink?: (connection: Connection) => void;
  onQuickAction?: (action: BillingQuickAction) => void;
};

export function BillingDetailHero({
  billing,
  connections = [],
  onLink,
  onQuickAction,
}: BillingDetailHeroProps) {
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
              <span className={memoryHeroBadgeClass}>{billing.directionLabel}</span>
              <span className={memoryHeroBadgeClass}>{billing.statusLabel}</span>
            </div>

            <div className="flex flex-wrap gap-2 self-start">
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
              <button
                type="button"
                onClick={() =>
                  openAskSalt({
                    context: {
                      type: "billing",
                      id: billing.id,
                      amount: billing.amount,
                      direction: billing.direction,
                      status: billing.status,
                      partyName: billing.partyLabel,
                      href: `/billing/${billing.id}`,
                    },
                  })
                }
                title="Ask Salt about this billing record"
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-white pl-4 pr-5 text-sm font-semibold text-neutral-900 transition hover-lift"
              >
                <Sparkles className="size-4 shrink-0 text-flame" strokeWidth={2.25} />
                Ask Salt
              </button>
              <RadixAfterHydration
                fallback={
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur"
                  >
                    Quick action
                    <ChevronDown className="size-3.5" strokeWidth={2} />
                  </button>
                }
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
                    >
                      Quick action
                      <ChevronDown className="size-3.5" strokeWidth={2} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl">
                    {isReceivable && showReminder ? (
                      <DropdownMenuItem
                        onClick={() =>
                          toast.success(
                            `${billing.worthAttention?.suggestedPlay ?? "Reminder"} drafted`,
                          )
                        }
                        className="gap-2"
                      >
                        <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
                        Send reminder
                      </DropdownMenuItem>
                    ) : null}
                    {canMarkPaid ? (
                      <DropdownMenuItem
                        disabled={isPending}
                        onClick={handleMarkPaid}
                        className="gap-2"
                      >
                        {isPending ? (
                          <Loader2 className="size-4 animate-spin text-muted-foreground" strokeWidth={1.75} />
                        ) : (
                          <CheckCircle2 className="size-4 text-muted-foreground" strokeWidth={1.75} />
                        )}
                        {markPaidActionLabel(billing.direction)}
                      </DropdownMenuItem>
                    ) : null}
                    {(isReceivable && showReminder) || canMarkPaid ? (
                      <DropdownMenuSeparator />
                    ) : null}
                    <DropdownMenuItem onClick={() => onQuickAction?.("note")} className="gap-2">
                      <StickyNote className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Add note
                    </DropdownMenuItem>
                    {onLink && (
                      <MemoryCreateLinkButton
                        recordKind="billing"
                        recordId={billing.id}
                        recordName={billing.number ?? billing.amount}
                        existingConnections={connections}
                        onLink={onLink}
                        variant="dropdown"
                      />
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </RadixAfterHydration>
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
