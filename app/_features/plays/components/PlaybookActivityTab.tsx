"use client";

import * as React from "react";
import { useMemo, useState, type ReactNode } from "react";
import { Calendar, ListFilter, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MemoryRecordTabSearch,
  MemoryRecordTabShell,
  memoryRecordFilterIconButtonClass,
} from "@/app/_features/memory/components/MemoryRecordTabHeader";
import {
  formatPersonActivityTime,
  groupPersonActivityByDay,
  personActivityDayGroup,
  type PersonActivityDayGroup,
} from "@/app/_features/people/utils/activity";
import type { PlaybookRunListItem } from "../queries";

type OutcomeFilter = "all" | "you" | "quiet";
type DateFilter = "all" | PersonActivityDayGroup;

const OUTCOME_FILTERS: { id: OutcomeFilter; label: string }[] = [
  { id: "all", label: "All runs" },
  { id: "you", label: "Needed you" },
  { id: "quiet", label: "Ran quietly" },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
  { id: "Earlier", label: "Earlier" },
];

interface PlaybookActivityTabProps {
  runs: PlaybookRunListItem[];
}

/**
 * Playbook → Activity — every run in outcome language, same contract and
 * design language as Memory record → Activity. Quiet skips are first-class:
 * "why it didn't run" is always visible, never a mystery.
 */
export function PlaybookActivityTab({ runs }: PlaybookActivityTabProps) {
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return runs
      .map((run) => ({ run, at: run.ranAt ?? run.createdAt, presentation: presentRun(run) }))
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .filter(({ run, presentation }) => {
        if (outcomeFilter === "you" && run.queue !== "needs_you") return false;
        if (outcomeFilter === "quiet" && run.queue !== "auto_handled") return false;
        if (dateFilter !== "all" && personActivityDayGroup(run.ranAt ?? run.createdAt) !== dateFilter) {
          return false;
        }
        if (normalized) {
          const haystack = [run.title, run.skipReason, run.recipientLabel, presentation.outcome]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(normalized)) return false;
        }
        return true;
      });
  }, [dateFilter, outcomeFilter, query, runs]);

  const grouped = groupPersonActivityByDay(filtered);
  const activeFilterCount =
    (outcomeFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <MemoryRecordTabSearch
        value={query}
        onChange={setQuery}
        placeholder="Search runs…"
      />
      <RunFilterPopover
        outcomeFilter={outcomeFilter}
        onOutcomeFilter={setOutcomeFilter}
        dateFilter={dateFilter}
        onDateFilter={setDateFilter}
        activeCount={activeFilterCount}
      />
    </div>
  );

  if (runs.length === 0) {
    return (
      <MemoryRecordTabShell title="Activity" showToolbar={false}>
        <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-10 text-center">
          <p className="font-display text-xl tracking-tight text-foreground">
            No runs yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Once this play fires, every run lands here — including quiet checks
            and why they skipped.
          </p>
        </div>
      </MemoryRecordTabShell>
    );
  }

  return (
    <MemoryRecordTabShell title="Activity" showToolbar toolbar={toolbar}>
      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-xl tracking-tight text-foreground">
            No matching runs
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.trim()
              ? "Try a different search or adjust the filters."
              : "Adjust the filters to see more."}
          </p>
          {query.trim() || activeFilterCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOutcomeFilter("all");
                setDateFilter("all");
              }}
              className="mt-2 text-xs font-medium text-foreground/80 hover:text-foreground"
            >
              Clear search and filters
            </button>
          ) : null}
        </div>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <header className="flex items-center gap-3 px-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {day}
              </p>
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </header>

            <ul className="glass-card divide-y divide-border/40 overflow-hidden rounded-3xl">
              {items.map(({ run, at, presentation }) => (
                <RunRow
                  key={run.id}
                  run={run}
                  at={at}
                  presentation={presentation}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </MemoryRecordTabShell>
  );
}

/* ── Row ──────────────────────────────────────────────────────────────────── */

interface RunPresentation {
  what: string;
  outcome: string;
  tone: "success" | "neutral" | "attention";
}

const TONE_PILL_CLASS: Record<RunPresentation["tone"], string> = {
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  attention: "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  neutral: "bg-muted text-muted-foreground",
};

function RunRow({
  run,
  at,
  presentation,
}: {
  run: PlaybookRunListItem;
  at: string;
  presentation: RunPresentation;
}) {
  const detail = run.skipReason
    ? `Skipped — ${run.skipReason}`
    : run.recipientLabel;

  return (
    <li className="group">
      <div className="flex flex-col gap-2 px-3 py-3.5 transition hover:bg-muted/40 sm:flex-row sm:items-start sm:gap-3 sm:px-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="w-12 shrink-0 pt-0.5 text-[11px] font-medium tabular-nums text-muted-foreground sm:w-14">
            {formatPersonActivityTime(at)}
          </span>
          <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
            <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="break-words text-[13px] font-medium leading-tight text-foreground">
              {presentation.what}
            </p>
            {detail ? (
              <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                {detail}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-1 self-start pl-12 sm:pl-0 sm:pt-0.5">
          <span
            className={cn(
              "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
              TONE_PILL_CLASS[presentation.tone]
            )}
          >
            {presentation.outcome}
          </span>
        </div>
      </div>
    </li>
  );
}

/* ── Filter popover ───────────────────────────────────────────────────────── */

function RunFilterPopover({
  outcomeFilter,
  onOutcomeFilter,
  dateFilter,
  onDateFilter,
  activeCount,
}: {
  outcomeFilter: OutcomeFilter;
  onOutcomeFilter: (value: OutcomeFilter) => void;
  dateFilter: DateFilter;
  onDateFilter: (value: DateFilter) => void;
  activeCount: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter runs"
          className={cn(
            memoryRecordFilterIconButtonClass,
            activeCount > 0 && "border-foreground/40 text-foreground"
          )}
        >
          <ListFilter className="size-4" strokeWidth={2} />
          {activeCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 space-y-4 rounded-2xl border-border/60 p-4"
      >
        <FilterSection icon={Sparkles} label="Outcome">
          {OUTCOME_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              active={outcomeFilter === option.id}
              onClick={() => onOutcomeFilter(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterSection>
        <FilterSection icon={Calendar} label="Date">
          {DATE_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              active={dateFilter === option.id}
              onClick={() => onDateFilter(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </FilterSection>
      </PopoverContent>
    </Popover>
  );
}

function FilterSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Sparkles;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2} />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12px] font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-card text-foreground/80 hover:border-border"
      )}
    >
      {children}
    </button>
  );
}

/* ── Run presentation ─────────────────────────────────────────────────────── */

function presentRun(run: PlaybookRunListItem): RunPresentation {
  if (run.skipReason) {
    return {
      what: run.title,
      outcome: "Skipped",
      tone: "neutral",
    };
  }

  switch (run.state) {
    case "queued":
    case "draft":
      return { what: run.title, outcome: "Waiting for you", tone: "attention" };
    case "approved":
    case "scheduled":
    case "executing":
      return { what: run.title, outcome: "In progress", tone: "attention" };
    case "ran":
      return {
        what: run.title,
        outcome: run.queue === "auto_handled" ? "Handled quietly" : "Done",
        tone: "success",
      };
    case "failed":
      return { what: run.title, outcome: "Failed", tone: "attention" };
    case "blocked":
      return { what: run.title, outcome: "Needs a reconnect", tone: "attention" };
    case "dismissed":
      return { what: run.title, outcome: "You dismissed it", tone: "neutral" };
    default:
      return { what: run.title, outcome: run.state, tone: "neutral" };
  }
}
