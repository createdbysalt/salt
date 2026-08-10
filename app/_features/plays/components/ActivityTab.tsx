"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  Sparkles,
  Workflow,
  Target,
  Loader2,
  Undo2,
  FileText,
  User,
  UserCheck,
  AlertTriangle,
  X,
  Zap,
  History,
  ArrowRight,
} from "lucide-react";
import {
  Badge,
  Checkbox,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  getPaginationRange,
  toIsoDate,
} from "@repo/ui";
import { toast } from "sonner";
import {
  ACTIVITY_PAGE_SIZES,
  DEFAULT_ACTIVITY_PAGE_SIZE,
  type ActivityPageSize,
  type PlayActivityCategory,
  type PlayActivityCounts,
  type PlayActivityItem,
  type PlayActivityRunRow,
} from "@/app/_features/plays/types";
import { mapPlayRunToActivity } from "@/app/_features/plays/utils/map-play-run-to-activity";
import { SourceExternalLink } from "@/app/_features/capture/components/SourceExternalLink";
import { getActivityPage } from "@/app/_features/plays/actions/get-activity-page";
import { undoAutoAppliedAction } from "@/app/_features/plays/actions";
import { cn } from "@repo/utils";
import { PlaysSearchField } from "./PlaysSearchField";
import {
  ActivityDateRangeFilter,
  formatActivityDateRange,
  type ActivityDateRange,
} from "./ActivityDateRangeFilter";
import {
  getSectionColorStyles,
  getSectionIcon,
} from "./PlaybookSectionNav";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const CATEGORY_STYLES: Record<
  PlayActivityCategory,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "Completed",
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  "in-progress": {
    label: "In Progress",
    cls: "bg-flame/15 text-flame",
    icon: Clock,
  },
  "needs-attention": {
    label: "Needs Attention",
    cls: "bg-destructive/10 text-destructive",
    icon: AlertTriangle,
  },
  decided: {
    label: "Decided",
    cls: "bg-muted text-muted-foreground",
    icon: UserCheck,
  },
};

const CATEGORY_OPTIONS: { id: PlayActivityCategory; label: string }[] = [
  { id: "completed", label: "Completed" },
  { id: "in-progress", label: "In Progress" },
  { id: "needs-attention", label: "Needs Attention" },
  { id: "decided", label: "Decided" },
];

export type ActivityFiltersState = {
  categories: PlayActivityCategory[];
  dateRange: ActivityDateRange | null;
};

const EMPTY_ACTIVITY_COUNTS: PlayActivityCounts = {
  completed: 0,
  decided: 0,
  inProgress: 0,
  needsAttention: 0,
};

function countActivityFilters(state: ActivityFiltersState): number {
  return state.categories.length + (state.dateRange ? 1 : 0);
}

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const seconds = Math.round(ms / 100) / 10;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function ActivityTab({
  initialActivity,
  initialTotalCount = 0,
  initialCounts,
}: {
  initialActivity: PlayActivityRunRow[];
  initialTotalCount?: number;
  initialCounts?: PlayActivityCounts;
}) {
  const [activityRuns, setActivityRuns] = useState(initialActivity);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [counts, setCounts] = useState<PlayActivityCounts>(
    initialCounts ?? EMPTY_ACTIVITY_COUNTS,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<ActivityPageSize>(
    DEFAULT_ACTIVITY_PAGE_SIZE,
  );
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [filters, setFilters] = useState<ActivityFiltersState>({
    categories: [],
    dateRange: null,
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activitySource = useMemo(
    () => activityRuns.map(mapPlayRunToActivity),
    [activityRuns],
  );

  // Filtering, search, and pagination all happen server-side. The first
  // page arrives as props, so skip fetching until an input actually changes.
  const lastRequestKey = useRef<string | null>(null);
  useEffect(() => {
    const dateFrom = filters.dateRange
      ? toIsoDate(filters.dateRange.from)
      : undefined;
    const dateTo = filters.dateRange
      ? toIsoDate(filters.dateRange.to)
      : undefined;
    const key = JSON.stringify({
      page,
      pageSize,
      q: debouncedQ.trim(),
      categories: filters.categories,
      dateFrom,
      dateTo,
    });
    if (lastRequestKey.current === null || lastRequestKey.current === key) {
      lastRequestKey.current = key;
      return;
    }
    lastRequestKey.current = key;

    startTransition(async () => {
      try {
        const result = await getActivityPage({
          page,
          pageSize,
          search: debouncedQ.trim() || undefined,
          categories:
            filters.categories.length > 0 ? filters.categories : undefined,
          dateFrom,
          dateTo,
        });
        setActivityRuns(result.runs);
        setTotalCount(result.totalCount);
        setCounts(result.counts);
        // The query clamps out-of-range pages (e.g. after undos shrink the
        // feed) — sync the control with the page actually served.
        setPage(result.page);
      } catch {
        toast.error("Couldn't load activity. Try again.");
      }
    });
  }, [page, pageSize, debouncedQ, filters]);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleUndo = useCallback((runId: string, entryId: string) => {
    setUndoingId(runId);
    startTransition(async () => {
      const result = await undoAutoAppliedAction(entryId);
      setUndoingId(null);
      if (result.success) {
        // The undone run flips to dismissed; drop it from the visible list.
        setActivityRuns((prev) => prev.filter((row) => row.id !== runId));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    });
  }, []);

  // Any filter/search/page-size change restarts at the first page.
  const updateFilters = useCallback((next: ActivityFiltersState) => {
    setFilters(next);
    setPage(1);
  }, []);

  const updateSearch = useCallback((value: string) => {
    setQ(value);
    setPage(1);
  }, []);

  const updatePageSize = useCallback((value: string) => {
    setPageSize(Number(value) as ActivityPageSize);
    setPage(1);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, PlayActivityItem[]>();
    activitySource.forEach((e) => {
      const arr = map.get(e.dayGroup) ?? [];
      arr.push(e);
      map.set(e.dayGroup, arr);
    });
    return Array.from(map.entries());
  }, [activitySource]);

  const totalActions = counts.completed + counts.decided;
  const activeFilterCount = countActivityFilters(filters);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      {/* Trust ledger — horizontal stat strip */}
      <section className="glass-card rounded-3xl p-5">
        <header className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">
              All activity
            </p>
            <h3 className="font-display text-lg tracking-tight mt-0.5">
              {totalActions} actions
            </h3>
          </div>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <CountTile label="Completed" value={counts.completed} tone="emerald" />
          <CountTile label="In Progress" value={counts.inProgress} tone="flame" />
          <CountTile label="Needs Attention" value={counts.needsAttention} tone="destructive" />
          <CountTile label="Decided" value={counts.decided} tone="muted" />
        </div>
      </section>

      {/* Search + filter */}
      <div className="space-y-3">
        <PlaysSearchField
          value={q}
          onChange={updateSearch}
          placeholder="Search activity…"
          filterActive={activeFilterCount > 0}
          filterActiveCount={activeFilterCount}
          filterTitle=""
          filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
          filterContent={
            <ActivityFilterPanel state={filters} onChange={updateFilters} />
          }
          trailingAction={
            <ActivityDateRangeFilter
              value={filters.dateRange}
              onChange={(dateRange) => updateFilters({ ...filters, dateRange })}
            />
          }
        />

        <ActivityActiveFilterBadges state={filters} onChange={updateFilters} />
      </div>

      {/* Day-grouped timeline */}
      {grouped.length === 0 && !isPending ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">No matching activity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust the filters or search.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "space-y-5 transition-opacity",
            isPending && "opacity-60",
          )}
          aria-busy={isPending}
        >
          {grouped.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <header className="px-2 flex items-center gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">
                  {day}
                </p>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </header>
              <ul className="glass-card rounded-3xl divide-y divide-border/40 overflow-hidden">
                {items.map((e) => (
                  <ActivityRow
                    key={e.id}
                    entry={e}
                    isOpen={expanded.has(e.id)}
                    onToggle={() => toggleExpand(e.id)}
                    onUndo={handleUndo}
                    isUndoing={undoingId === e.id}
                  />
                ))}
              </ul>
            </section>
          ))}

          {/* Numbered pagination */}
          {totalCount > 0 && (
            <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
              <p className="text-[11px] text-muted-foreground tabular-nums">
                Page {page} of {totalPages} · {totalCount}{" "}
                {totalCount === 1 ? "action" : "actions"}
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Select
                  value={String(pageSize)}
                  onValueChange={updatePageSize}
                >
                  <SelectTrigger
                    aria-label="Rows per page"
                    className="h-8 w-[104px] rounded-full border-border/60 text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {totalPages > 1 && (
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          aria-disabled={page <= 1}
                          className={cn(
                            page <= 1 && "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                      {paginationRange.map((item, index) =>
                        typeof item === "number" ? (
                          <PaginationItem key={item}>
                            <PaginationLink
                              href="#"
                              isActive={item === page}
                              onClick={(event) => {
                                event.preventDefault();
                                setPage(item);
                              }}
                            >
                              {item}
                            </PaginationLink>
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={`${item}-${index}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ),
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(event) => {
                            event.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                          aria-disabled={page >= totalPages}
                          className={cn(
                            page >= totalPages && "pointer-events-none opacity-50",
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function ActivityRow({
  entry: e,
  isOpen,
  onToggle,
  onUndo,
  isUndoing,
}: {
  entry: PlayActivityItem;
  isOpen: boolean;
  onToggle: () => void;
  onUndo: (runId: string, entryId: string) => void;
  isUndoing: boolean;
}) {
  const categoryStyle = CATEGORY_STYLES[e.category];
  const CategoryIcon = categoryStyle.icon;
  const canUndo = e.undoEntryId != null;

  return (
    <li className="group">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full grid grid-cols-[32px_56px_36px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition text-left"
      >
        <span className="flex items-center justify-center">
          {canUndo ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(ev) => {
                ev.stopPropagation();
                if (!isUndoing && e.undoEntryId) onUndo(e.id, e.undoEntryId);
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.stopPropagation();
                  if (!isUndoing && e.undoEntryId) onUndo(e.id, e.undoEntryId);
                }
              }}
              className={cn(
                "size-7 grid place-items-center rounded-full transition",
                isUndoing
                  ? "text-muted-foreground cursor-wait"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer",
              )}
              title="Undo"
              aria-label="Undo"
            >
              {isUndoing ? (
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
              ) : (
                <RotateCcw className="size-3.5" strokeWidth={2.25} />
              )}
            </span>
          ) : null}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
          {e.time}
        </span>
        {(() => {
          // Playbook runs wear the playbook's section icon + accent (same
          // language as the Playbooks tab cards). Ask Salt and other
          // Salt-executed actions get the aurora sparkles. The plain User
          // avatar is reserved for pure decisions (dismissed) with no
          // execution behind them.
          if (e.playbookSection) {
            const SectionIcon = getSectionIcon(e.playbookSection);
            const styles = getSectionColorStyles(e.playbookSection);
            return (
              <span
                className={cn(
                  "size-8 shrink-0 rounded-xl grid place-items-center",
                  styles.bg,
                )}
              >
                <SectionIcon
                  className={cn("size-3.5", styles.text)}
                  strokeWidth={2.25}
                />
              </span>
            );
          }
          if (e.state === "dismissed") {
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
        })()}
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-tight truncate">
            {e.title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {e.target}
            {e.playbookName
              ? ` · ${e.playbookName}`
              : !e.target && e.channelLabel
                ? e.channelLabel
                : ""}
            {e.sourceUrl ? (
              <>
                {" "}
                ·{" "}
                <SourceExternalLink
                  href={e.sourceUrl}
                  className="inline-flex align-baseline"
                  onClick={(ev) => ev.stopPropagation()}
                />
              </>
            ) : null}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap",
            categoryStyle.cls,
          )}
        >
          <CategoryIcon className="size-3" strokeWidth={2.5} />
          {e.badgeLabel}
        </span>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180 text-foreground",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: APPLE_EASE }}
            className="overflow-hidden"
          >
            <ActivityCardDetail entry={e} onUndo={onUndo} isUndoing={isUndoing} />
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function ActivityCardDetail({
  entry: e,
  onUndo,
  isUndoing,
}: {
  entry: PlayActivityItem;
  onUndo: (runId: string, entryId: string) => void;
  isUndoing: boolean;
}) {
  return (
    <div className="px-4 pb-5 pt-1 pl-[88px] pr-6 space-y-3.5">
      {/* Completed: outcome, value, app, approval, trigger, sources, duration, undo */}
      {e.category === "completed" && (
        <>
          {e.outcome && (
            <DetailRow
              icon={CheckCircle2}
              label="Outcome"
              value={e.outcome}
            />
          )}
          {e.valueLabel && (
            <DetailRow
              icon={Zap}
              label="Value"
              value={
                <>
                  {e.valueLabel}
                  {e.valueEstimated && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-semibold">
                      est.
                    </span>
                  )}
                </>
              }
            />
          )}
          {e.channelLabel && (
            <DetailRow icon={Workflow} label="App" value={e.channelLabel} />
          )}
          {e.approvalLabel && (
            <DetailRow icon={UserCheck} label="Approval" value={e.approvalLabel} />
          )}
          {e.triggerLabel && (
            <DetailRow icon={Target} label="Trigger" value={e.triggerLabel} />
          )}
          {e.durationMs != null && (
            <DetailRow
              icon={Clock}
              label="Runtime"
              value={formatDuration(e.durationMs)}
            />
          )}
          <SourcesRow entry={e} />
          {e.undoEntryId != null && (
            <DetailRow
              icon={Undo2}
              label="Undo"
              value={
                <button
                  type="button"
                  onClick={() => onUndo(e.id, e.undoEntryId as string)}
                  disabled={isUndoing}
                  className="text-xs font-medium text-foreground/80 hover:text-foreground underline disabled:opacity-50 disabled:cursor-wait"
                >
                  {isUndoing ? "Reverting..." : "Revert this action"}
                </button>
              }
            />
          )}
        </>
      )}

      {/* In Progress: what's staged, real next step, ETA, queue link */}
      {e.category === "in-progress" && (
        <>
          <DetailRow
            icon={FileText}
            label="What's staged"
            value={e.outcome ?? "—"}
          />
          <DetailRow
            icon={Target}
            label="Next step"
            value={e.nextStepLabel ?? "—"}
          />
          {e.etaLabel && (
            <DetailRow icon={Clock} label="ETA" value={e.etaLabel} />
          )}
          {e.pausedForApproval && (
            <DetailRow
              icon={ArrowRight}
              label="Queue"
              value={
                <Link
                  href="/plays?tab=queue"
                  className="text-xs font-medium text-foreground/80 hover:text-foreground underline"
                >
                  Review in Queue
                </Link>
              }
            />
          )}
        </>
      )}

      {/* Needs Attention: error/blocked cause, pending step, queue link */}
      {e.category === "needs-attention" && (
        <>
          <DetailRow
            icon={AlertTriangle}
            label={e.state === "blocked" ? "Blocked" : "Error"}
            value={
              <span>
                {e.errorLabel ?? "—"}
                {e.errorDetail && e.errorDetail !== e.errorLabel && (
                  <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                    {e.errorDetail}
                  </span>
                )}
              </span>
            }
          />
          {e.nextStepLabel && (
            <DetailRow icon={Target} label="Next step" value={e.nextStepLabel} />
          )}
          <DetailRow
            icon={ArrowRight}
            label="Queue"
            value={
              <Link
                href="/plays?tab=queue"
                className="text-xs font-medium text-foreground/80 hover:text-foreground underline"
              >
                {e.state === "blocked"
                  ? "Reconnect and resume in Queue"
                  : "Open in Queue"}
              </Link>
            }
          />
          <SourcesRow entry={e} />
        </>
      )}

      {/* Decided: the call you made, what it would have done */}
      {e.category === "decided" && (
        <>
          <DetailRow
            icon={UserCheck}
            label="Your decision"
            value={e.decisionLabel ?? "—"}
          />
          <DetailRow
            icon={FileText}
            label="What it was"
            value={e.outcome ?? "—"}
          />
          {e.triggerLabel && (
            <DetailRow icon={Target} label="Trigger" value={e.triggerLabel} />
          )}
        </>
      )}

      {e.playbookHref && e.playbookName && (
        <DetailRow
          icon={Workflow}
          label="Playbook"
          value={
            <Link
              href={e.playbookHref}
              className="text-xs font-medium text-foreground/80 hover:text-foreground underline"
            >
              {e.playbookName}
            </Link>
          }
        />
      )}

      {e.timeline.length > 0 && <TimelineRow entry={e} />}

      {e.sourceUrl ? (
        <DetailRow
          icon={Workflow}
          label="Source"
          value={<SourceExternalLink href={e.sourceUrl} />}
        />
      ) : null}
    </div>
  );
}

function SourcesRow({ entry: e }: { entry: PlayActivityItem }) {
  if (e.sources.length === 0) return null;
  return (
    <DetailRow
      icon={FileText}
      label="Sources"
      value={
        <div className="flex flex-wrap gap-1.5">
          {e.sources.map((s, i) =>
            s.url ? (
              <a
                key={`${s.label}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80 hover:text-foreground transition"
              >
                {s.label}
              </a>
            ) : (
              <span
                key={`${s.label}-${i}`}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80"
              >
                {s.label}
              </span>
            ),
          )}
        </div>
      }
    />
  );
}

function TimelineRow({ entry: e }: { entry: PlayActivityItem }) {
  return (
    <DetailRow
      icon={History}
      label="Run timeline"
      value={
        <ul className="space-y-1.5">
          {e.timeline.map((t) => (
            <li key={t.id} className="flex items-baseline gap-2">
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-14">
                {t.time}
              </span>
              <span className="text-[12px] text-foreground/85">
                {t.title}
                {t.detail ? (
                  <span className="text-muted-foreground"> — {t.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      }
    />
  );
}

function ActivityFilterPanel({
  state,
  onChange,
}: {
  state: ActivityFiltersState;
  onChange: (state: ActivityFiltersState) => void;
}) {
  const activeCount = state.categories.length;

  function updateCategories(category: PlayActivityCategory, checked: boolean) {
    onChange({
      ...state,
      categories: toggleValue(state.categories, category, checked),
    });
  }

  function clearCategories() {
    onChange({ ...state, categories: [] });
  }

  return (
    <div className="flex flex-col">
      {activeCount > 0 ? (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </p>
          <button
            type="button"
            onClick={clearCategories}
            className="text-xs font-medium text-foreground/80 hover:text-foreground transition"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Filter activity</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Narrow by category — dates live in the Date range picker
          </p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        <div className="p-2">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Category
          </p>
          <div className="mt-1 space-y-0.5">
            {CATEGORY_OPTIONS.map((option) => {
              const checked = state.categories.includes(option.id);
              const catStyle = CATEGORY_STYLES[option.id];
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    className="rounded-[4px]"
                    checked={checked}
                    onCheckedChange={(value) => updateCategories(option.id, value === true)}
                  />
                  <span className="min-w-0 flex-1 flex items-center gap-2">
                    {option.label}
                    <catStyle.icon className="size-3 text-muted-foreground" />
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityActiveFilterBadges({
  state,
  onChange,
}: {
  state: ActivityFiltersState;
  onChange: (state: ActivityFiltersState) => void;
}) {
  const activeCount = countActivityFilters(state);
  if (activeCount === 0) return null;

  function removeCategory(category: PlayActivityCategory) {
    onChange({
      ...state,
      categories: state.categories.filter((item) => item !== category),
    });
  }

  function clearAll() {
    onChange({ categories: [], dateRange: null });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.categories.map((category) => (
        <Badge
          key={`category-${category}`}
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => removeCategory(category)}
        >
          {CATEGORY_STYLES[category].label}
          <X className="size-3" />
        </Badge>
      ))}

      {state.dateRange ? (
        <Badge
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => onChange({ ...state, dateRange: null })}
        >
          {formatActivityDateRange(state.dateRange)}
          <X className="size-3" />
        </Badge>
      ) : null}

      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[20px_120px_1fr] gap-3 items-start">
      <Icon className="size-3.5 text-muted-foreground mt-0.5" strokeWidth={2} />
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold pt-0.5">
        {label}
      </p>
      <div className="text-[12.5px] text-foreground/85 leading-relaxed">{value}</div>
    </div>
  );
}

function CountTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "flame" | "sky" | "muted" | "violet" | "destructive";
}) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    flame: "bg-flame/15 text-flame",
    sky: "bg-sky/15 text-sky",
    muted: "bg-muted text-muted-foreground",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <div className={cn("rounded-2xl p-3.5 flex items-baseline justify-between gap-2", cls)}>
      <p className="font-display text-2xl tracking-tight tabular-nums leading-none">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold opacity-80">
        {label}
      </p>
    </div>
  );
}
