"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Calendar,
  PencilLine,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  User,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { openAskSalt } from "@/app/_features/shell/utils/open-ask-salt";
import {
  formatPersonActivityTime,
  groupPersonActivityByDay,
  personActivityDayGroup,
  timelineEntryStatusMeta,
  type PersonActivityDayGroup,
  type ProfileActivityTimelineEntry,
} from "@/app/_features/people/utils/activity";
import { cn } from "@repo/utils";

function ActivityEntryIcon({ kind }: { kind: ProfileActivityTimelineEntry["kind"] }) {
  if (kind === "user") {
    return (
      <span className="size-8 shrink-0 rounded-xl grid place-items-center bg-muted text-foreground">
        <User className="size-3.5" strokeWidth={2.25} />
      </span>
    );
  }

  return (
    <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
      <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
    </span>
  );
}

type StatusFilter = "all" | "waiting" | "auto-applied" | "corrected";
type DateFilter = "all" | PersonActivityDayGroup;

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "auto-applied", label: "Auto-applied" },
  { id: "corrected", label: "Corrected" },
];

const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
  { id: "Earlier", label: "Earlier" },
];

function entryStatusFilter(entry: ProfileActivityTimelineEntry): StatusFilter {
  if (entry.status === "pending") return "waiting";
  if (entry.source === "manual") return "corrected";
  if (entry.status === "applied") return "auto-applied";
  return "all";
}

function defaultUndoPrompt(entry: ProfileActivityTimelineEntry): string {
  const who = entry.entityName ? ` for ${entry.entityName}` : "";
  return `Undo or revert this profile change${who}: "${entry.label}"${entry.detail ? ` — ${entry.detail}` : ""}.`;
}

export type ProfileActivityTimelineProps = {
  entries: ProfileActivityTimelineEntry[];
  helperText?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  getDiscussPrompt: (entry: ProfileActivityTimelineEntry) => string;
  getUndoPrompt?: (entry: ProfileActivityTimelineEntry) => string;
};

export function ProfileActivityTimeline({
  entries,
  helperText,
  emptyTitle = "No activity yet",
  emptyDescription = "Profile fills and corrections will show up here as they happen.",
  getDiscussPrompt,
  getUndoPrompt = defaultUndoPrompt,
}: ProfileActivityTimelineProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const filteredEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .filter((entry) => {
        if (statusFilter !== "all" && entryStatusFilter(entry) !== statusFilter) {
          return false;
        }
        if (dateFilter !== "all" && personActivityDayGroup(entry.at) !== dateFilter) {
          return false;
        }
        return true;
      });
  }, [dateFilter, entries, statusFilter]);

  const grouped = groupPersonActivityByDay(filteredEntries);
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  if (!entries.length) {
    return (
      <div className="glass-card rounded-3xl border border-dashed border-border/60 p-10 text-center">
        <p className="font-display text-xl tracking-tight text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        {helperText ? (
          <p className="text-[11px] text-muted-foreground max-w-xl">{helperText}</p>
        ) : (
          <span />
        )}
        <div className="shrink-0 self-end sm:self-auto">
          <ActivityFilterPopover
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilter={setDateFilter}
            activeCount={activeFilterCount}
          />
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-xl tracking-tight text-foreground">No matching activity</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the filters to see more.</p>
        </div>
      ) : (
        grouped.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <header className="px-2 flex items-center gap-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                {day}
              </p>
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
            </header>

            <ul className="glass-card rounded-3xl divide-y divide-border/40 overflow-hidden">
              {items.map((entry) => {
                const status = timelineEntryStatusMeta(entry);
                const actorLabel = entry.kind === "user" ? "You" : "Salt";
                const actorClassName =
                  entry.kind === "user"
                    ? "bg-muted text-muted-foreground"
                    : "bg-flame/15 text-flame";
                const canUndo = entry.status === "applied";
                const canEdit = entry.status !== "pending";

                return (
                  <li key={entry.id} className="group">
                    <div className="flex flex-col gap-2 px-3 py-3.5 sm:flex-row sm:items-start sm:gap-3 sm:px-4 hover:bg-muted/40 transition">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="w-12 sm:w-14 shrink-0 pt-0.5 text-[11px] text-muted-foreground font-medium tabular-nums">
                          {formatPersonActivityTime(entry.at)}
                        </span>
                        <ActivityEntryIcon kind={entry.kind} />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-[13px] font-medium leading-tight text-foreground">
                            {entry.label}
                          </p>
                          {(entry.entityName || entry.detail) && (
                            <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">
                              {entry.entityHref && entry.entityName ? (
                                <>
                                  <Link
                                    href={entry.entityHref}
                                    className="font-medium text-foreground hover:underline"
                                  >
                                    {entry.entityName}
                                  </Link>
                                  {entry.detail ? <> · {entry.detail}</> : null}
                                </>
                              ) : (
                                entry.detail
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-end gap-1 self-start pl-12 sm:pl-0 sm:pt-0.5">
                        {status ? (
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
                              status.className,
                            )}
                          >
                            {status.label}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              actorClassName,
                            )}
                          >
                            {actorLabel}
                          </span>
                        )}
                        <div className="flex shrink-0 items-center gap-0.5">
                        {canUndo ? (
                          <button
                            type="button"
                            onClick={() => openAskSalt(getUndoPrompt(entry))}
                            className="size-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                            title="Undo with Ask Salt"
                            aria-label="Undo with Ask Salt"
                          >
                            <RotateCcw className="size-3.5" strokeWidth={2.25} />
                          </button>
                        ) : null}
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => openAskSalt(getDiscussPrompt(entry))}
                            className="size-8 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                            title="Edit with Ask Salt"
                            aria-label="Edit with Ask Salt"
                          >
                            <PencilLine className="size-3.5" strokeWidth={2.25} />
                          </button>
                        ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function ActivityFilterPopover({
  statusFilter,
  onStatusFilter,
  dateFilter,
  onDateFilter,
  activeCount,
}: {
  statusFilter: StatusFilter;
  onStatusFilter: (value: StatusFilter) => void;
  dateFilter: DateFilter;
  onDateFilter: (value: DateFilter) => void;
  activeCount: number;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-medium border transition-all shrink-0",
            activeCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground/80 border-border/60 hover:border-border",
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 ? (
            <span className="text-[11px] font-semibold tabular-nums bg-background/20 rounded-md px-1.5 py-0.5">
              {activeCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 rounded-2xl border-border/60 space-y-4">
        <FilterSection icon={Sparkles} label="Status">
          {STATUS_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              active={statusFilter === option.id}
              onClick={() => onStatusFilter(option.id)}
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
      <p className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-2">
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
        "h-8 px-3 rounded-full text-[12px] font-medium border transition-all",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-foreground/80 border-border/60 hover:border-border",
      )}
    >
      {children}
    </button>
  );
}
