"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  ChevronDown,
  RefreshCw,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { cn } from "@repo/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui";
import { MemoryCreateLinkButton } from "@/app/_features/memory/components/MemoryCreateLinkButton";
import {
  memoryHeroInnerClass,
  memoryHeroSectionClass,
  memoryHeroSummaryClass,
  memoryHeroTitleClass,
} from "@/app/_features/memory/utils/memory-layout";
import { formatMoneyFromCents } from "@/app/_features/memory/utils/record-summary";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import { RadixAfterHydration } from "@/app/_features/memory/components/RadixAfterHydration";
import type { Connection } from "@/app/_lib/demo/people-demo-data";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

const STATUS_TONE: Record<WorkDetailViewModel["status"], string> = {
  Active: "bg-white/15 text-white/90 backdrop-blur border-white/20",
  Renewing: "bg-white/15 text-white/90 backdrop-blur border-white/20",
  Stalled: "bg-destructive/20 text-white border-white/20",
  Wrapping: "bg-white/10 text-white/80 backdrop-blur border-white/20",
};

function formatDueDate(deadline: string | null, renewalDate: string | null, isRetainer: boolean): string {
  const dateStr = isRetainer ? renewalDate : deadline;
  if (!dateStr) return "—";

  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 14) return `in ${diffDays}d`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getValueDisplay(work: WorkDetailViewModel): { value: string; suffix?: string } {
  if (work.paymentType === "retainer" && work.retainerMrrCents) {
    return { value: formatMoneyFromCents(work.retainerMrrCents), suffix: "/mo" };
  }
  if (work.finalPriceCents) {
    return { value: formatMoneyFromCents(work.finalPriceCents) };
  }
  if (work.contractValueCents) {
    return { value: formatMoneyFromCents(work.contractValueCents) };
  }
  if (work.paymentType === "hourly" && work.hourlyRateCents) {
    return { value: formatMoneyFromCents(work.hourlyRateCents), suffix: "/hr" };
  }
  return { value: "—" };
}

export type WorkQuickAction = "blocker" | "stage" | "note" | "connection";

type WorkHeroProps = {
  work: WorkDetailViewModel;
  connections: Connection[];
  onLink: (connection: Connection) => void;
  onQuickAction?: (action: WorkQuickAction) => void;
};

export function WorkHero({
  work,
  connections,
  onLink,
  onQuickAction,
}: WorkHeroProps) {
  const isRetainer = work.paymentType === "retainer";
  const valueDisplay = getValueDisplay(work);
  const dueLabel = isRetainer ? "Renews" : "Due";
  const dueValue = formatDueDate(work.deadline, work.renewalDate, isRetainer);

  const stats = [
    {
      label: "Value",
      value: valueDisplay.value,
      suffix: valueDisplay.suffix,
    },
    {
      label: dueLabel,
      value: dueValue,
      tone: work.overdue ? "text-red-300" : undefined,
    },
    {
      label: "Health",
      value: work.health?.band ?? "—",
    },
    {
      label: "Stage",
      value: work.stage ?? "—",
    },
  ];

  return (
    <section className={memoryHeroSectionClass}>
      <div className={memoryHeroInnerClass}>
        <div className="grid lg:grid-cols-[1fr_auto] gap-6 sm:gap-8 items-start">
          <div className="max-w-2xl min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
              <span
                className={cn(
                  "chip border",
                  STATUS_TONE[work.status],
                )}
              >
                <span className="size-1.5 rounded-full bg-white animate-pulse-glow" />
                {work.status}
              </span>
              {work.workType && (
                <span className="chip border border-white/20 bg-white/15 text-white/90 backdrop-blur">
                  {work.workType}
                </span>
              )}
            </div>

            <div className="flex items-start gap-4 sm:items-center sm:gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-white/25 bg-white/15 text-white backdrop-blur sm:size-16">
                <Briefcase className="size-6 sm:size-7" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <h1 className={memoryHeroTitleClass}>{work.title}</h1>
                {work.org ? (
                  <p className="mt-1.5 text-sm text-white/80 sm:mt-2 sm:text-base">
                    For{" "}
                    <Link
                      href={`/orgs/${work.org.id}`}
                      className="font-medium text-white underline-offset-4 hover:underline"
                    >
                      {work.org.name}
                    </Link>
                  </p>
                ) : null}
              </div>
            </div>

            <p className={memoryHeroSummaryClass}>{work.summary}</p>

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-7">
              <button
                type="button"
                onClick={() =>
                  openAskSalt({
                    context: {
                      type: "work",
                      id: work.id,
                      title: work.title,
                      orgName: work.org?.name,
                      stage: work.stage,
                      healthBand: work.health?.band,
                      href: `/work/${work.id}`,
                    },
                  })
                }
                title="Ask Salt about this work"
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
                  <DropdownMenuContent align="start" className="w-48 rounded-xl">
                    <DropdownMenuItem onClick={() => onQuickAction?.("note")} className="gap-2">
                      <StickyNote className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Add note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onQuickAction?.("blocker")} className="gap-2">
                      <AlertTriangle className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Add blocker
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onQuickAction?.("stage")} className="gap-2">
                      <RefreshCw className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      Change stage
                    </DropdownMenuItem>
                    <MemoryCreateLinkButton
                      recordKind="work"
                      recordId={work.id}
                      recordName={work.title}
                      existingConnections={connections}
                      onLink={onLink}
                      variant="dropdown"
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </RadixAfterHydration>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:w-[200px]">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/12 backdrop-blur border border-white/20 p-3.5"
                style={{
                  animation: `rise 0.6s cubic-bezier(0.22, 1, 0.36, 1) both`,
                  animationDelay: `${i * 80 + 100}ms`,
                }}
              >
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">{s.label}</p>
                <p className={cn("mt-1 font-display text-2xl leading-none tabular-nums truncate", s.tone)}>
                  {s.value}
                  {s.suffix && <span className="text-base text-white/70">{s.suffix}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-10 -top-10 size-72 rounded-full bg-white/20 blur-3xl animate-float" />
      <div
        className="pointer-events-none absolute -bottom-16 left-1/3 size-64 rounded-full bg-flame/40 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />
    </section>
  );
}
