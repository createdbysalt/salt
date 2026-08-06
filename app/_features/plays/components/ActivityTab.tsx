"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  Zap,
  X,
  ChevronDown,
  Sparkles,
  Workflow,
  Target,
  Eye,
  Loader2,
  Undo2,
  List,
  FileText,
  User,
  AlertTriangle,
} from "lucide-react";
import { Badge, Checkbox } from "@repo/ui";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import { mapActivityEntryForUi } from "@/app/_features/plays/utils/map-activity-entry";
import {
  type ActivityCategory,
  type ActivityEntry,
} from "@/app/_lib/demo/plays-demo-data";
import { SourceExternalLink } from "@/app/_features/capture/components/SourceExternalLink";
import { loadMoreActivityEntries } from "@/app/_features/plays/actions/load-more-activity";
import { undoAutoAppliedAction } from "@/app/_features/plays/actions";
import { cn } from "@repo/utils";
import { PlaysSearchField } from "./PlaysSearchField";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;
const PAGE_SIZE = 50;

const CATEGORY_STYLES: Record<
  ActivityCategory,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  "salt-acted": {
    label: "Salt Acted",
    cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
    icon: Zap,
  },
  "you-decided": {
    label: "You Decided",
    cls: "bg-muted text-muted-foreground",
    icon: CheckCircle2,
  },
  "in-progress": {
    label: "In Progress",
    cls: "bg-flame/15 text-flame",
    icon: Clock,
  },
  watching: {
    label: "Watching",
    cls: "bg-sky/15 text-sky",
    icon: Eye,
  },
  error: {
    label: "Error",
    cls: "bg-destructive/10 text-destructive",
    icon: AlertTriangle,
  },
};

type DateFilter = "Today" | "Yesterday" | "Earlier this week";

const CATEGORY_OPTIONS: { id: ActivityCategory; label: string }[] = [
  { id: "salt-acted", label: "Salt Acted" },
  { id: "watching", label: "Watching" },
  { id: "you-decided", label: "You Decided" },
  { id: "in-progress", label: "In Progress" },
  { id: "error", label: "Error" },
];

const DATE_OPTIONS: { id: DateFilter; label: string }[] = [
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
];

export type ActivityFiltersState = {
  categories: ActivityCategory[];
  dates: DateFilter[];
};

function countActivityFilters(state: ActivityFiltersState): number {
  return state.categories.length + state.dates.length;
}

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

export function ActivityTab({
  initialActivity,
  initialTotalCount = 0,
}: {
  initialActivity: ActivityEntryRow[];
  initialTotalCount?: number;
}) {
  const [activityRows, setActivityRows] = useState(initialActivity);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isPending, startTransition] = useTransition();

  const activitySource = useMemo(
    () => activityRows.map(mapActivityEntryForUi),
    [activityRows],
  );
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<ActivityFiltersState>({
    categories: [],
    dates: [],
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleUndo = useCallback((entryId: string) => {
    setUndoingId(entryId);
    startTransition(async () => {
      const result = await undoAutoAppliedAction(entryId);
      setUndoingId(null);
      if (result.success) {
        // Remove the undone entry from the list
        setActivityRows((prev) => prev.filter((row) => row.id !== entryId));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    });
  }, []);

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activitySource
      .filter((e) =>
        filters.categories.length === 0 ? true : filters.categories.includes(e.category),
      )
      .filter((e) =>
        filters.dates.length === 0 ? true : filters.dates.includes(e.dayGroup as DateFilter),
      )
      .filter((e) =>
        !term
          ? true
          : e.title.toLowerCase().includes(term) ||
            e.target.toLowerCase().includes(term),
      );
  }, [q, filters, activitySource]);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.dayGroup) ?? [];
      arr.push(e);
      map.set(e.dayGroup, arr);
    });
    return Array.from(map.entries());
  }, [entries]);

  const counts = useMemo(() => {
    const today = activitySource.filter((e) => e.dayGroup === "Today");
    return {
      saltActed: today.filter((e) => e.category === "salt-acted").length,
      youDecided: today.filter((e) => e.category === "you-decided").length,
      inProgress: today.filter((e) => e.category === "in-progress").length,
      watching: today.filter((e) => e.category === "watching").length,
      error: today.filter((e) => e.category === "error").length,
      total: today.length,
    };
  }, [activitySource]);

  const activeFilterCount = countActivityFilters(filters);
  const hasMore = activityRows.length < totalCount;

  const handleLoadMore = useCallback(() => {
    startTransition(async () => {
      const result = await loadMoreActivityEntries(activityRows.length, PAGE_SIZE);
      setActivityRows((prev) => [...prev, ...result.entries]);
      setTotalCount(result.totalCount);
    });
  }, [activityRows.length]);

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
              Today's activity
            </p>
            <h3 className="font-display text-lg tracking-tight mt-0.5">
              {counts.total} actions today
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground max-w-[280px] text-right hidden md:block">
            Click any row to see details about what happened.
          </p>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <CountTile label="Salt Acted" value={counts.saltActed} tone="emerald" />
          <CountTile label="Watching" value={counts.watching} tone="sky" />
          <CountTile label="You Decided" value={counts.youDecided} tone="muted" />
          <CountTile label="In Progress" value={counts.inProgress} tone="flame" />
          <CountTile label="Error" value={counts.error} tone="destructive" />
        </div>
      </section>

      {/* Search + filter */}
      <div className="space-y-3">
        <PlaysSearchField
          value={q}
          onChange={setQ}
          placeholder="Search activity…"
          filterActive={activeFilterCount > 0}
          filterActiveCount={activeFilterCount}
          filterTitle=""
          filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
          filterContent={
            <ActivityFilterPanel state={filters} onChange={setFilters} />
          }
        />

        <ActivityActiveFilterBadges state={filters} onChange={setFilters} />
      </div>

      {/* Day-grouped timeline */}
      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">No matching activity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust the filters or search.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
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

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isPending}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-border/60 bg-card text-sm font-medium text-foreground/80 hover:border-border hover:text-foreground transition disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>Load more ({totalCount - activityRows.length} remaining)</>
                )}
              </button>
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
  entry: ActivityEntry;
  isOpen: boolean;
  onToggle: () => void;
  onUndo: (entryId: string) => void;
  isUndoing: boolean;
}) {
  const categoryStyle = CATEGORY_STYLES[e.category];
  const CategoryIcon = categoryStyle.icon;
  const isActionCategory = e.category === "salt-acted" || e.category === "you-decided";
  const canUndo = isActionCategory && e.reversible !== false;
  const isUserAction = e.category === "you-decided";

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
                if (!isUndoing) onUndo(e.id);
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.stopPropagation();
                  if (!isUndoing) onUndo(e.id);
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
        {isUserAction ? (
          <span className="size-8 shrink-0 rounded-xl grid place-items-center bg-muted text-foreground">
            <User className="size-3.5" strokeWidth={2.25} />
          </span>
        ) : (
          <span className="surface-aurora grid size-8 shrink-0 place-items-center rounded-xl">
            <Sparkles className="relative z-10 size-3.5 text-white" strokeWidth={2.5} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-tight truncate">
            {e.title}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {e.target}
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
          {categoryStyle.label}
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
  entry: ActivityEntry;
  onUndo: (entryId: string) => void;
  isUndoing: boolean;
}) {
  return (
    <div className="px-4 pb-5 pt-1 pl-[88px] pr-6 space-y-3.5">
      {/* Salt Acted: Why confident, What happened, Sources, Undo (if reversible) */}
      {e.category === "salt-acted" && (
        <>
          <DetailRow
            icon={Sparkles}
            label="Why confident"
            value={e.confidenceReason ?? "Similar actions approved before"}
          />
          <DetailRow
            icon={CheckCircle2}
            label="What happened"
            value={e.outcome ?? "—"}
          />
          <DetailRow
            icon={FileText}
            label="Sources"
            value={
              e.sources && e.sources.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.sources.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          {e.reversible !== false && (
            <DetailRow
              icon={Undo2}
              label="Undo"
              value={
                <button
                  type="button"
                  onClick={() => onUndo(e.id)}
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

      {/* You Decided: Your decision, What shipped, Sources, Undo (if reversible) */}
      {e.category === "you-decided" && (
        <>
          <DetailRow
            icon={CheckCircle2}
            label="Your decision"
            value={e.status === "dismissed" ? "Dismissed" : "Approved"}
          />
          <DetailRow
            icon={Workflow}
            label="What shipped"
            value={e.outcome ?? "—"}
          />
          <DetailRow
            icon={FileText}
            label="Sources"
            value={
              e.sources && e.sources.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.sources.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                "—"
              )
            }
          />
          {e.reversible !== false && (
            <DetailRow
              icon={Undo2}
              label="Undo"
              value={
                <button
                  type="button"
                  onClick={() => onUndo(e.id)}
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

      {/* In Progress: What's staged, Next step, ETA */}
      {e.category === "in-progress" && (
        <>
          <DetailRow
            icon={Clock}
            label="What's staged"
            value={e.outcome ?? "Draft ready for review"}
          />
          <DetailRow
            icon={Target}
            label="Next step"
            value="Review and approve"
          />
          <DetailRow
            icon={Clock}
            label="ETA"
            value={e.eta ?? "Waiting on you"}
          />
        </>
      )}

      {/* Watching: Evidence so far, Confidence, Threshold, Signals */}
      {e.category === "watching" && (
        <>
          <DetailRow
            icon={Eye}
            label="Evidence so far"
            value={e.evidenceSummary ?? "Gathering signals..."}
          />
          <DetailRow
            icon={Sparkles}
            label="Confidence"
            value={
              e.confidencePercent !== undefined
                ? `${e.confidencePercent}%`
                : "Building confidence..."
            }
          />
          <DetailRow
            icon={Target}
            label="Threshold"
            value={
              e.confidenceThreshold !== undefined
                ? `${e.confidenceThreshold}% to auto-act`
                : "—"
            }
          />
          <DetailRow
            icon={List}
            label="Signals"
            value={
              e.signals && e.signals.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {e.signals.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[11px] text-foreground/80"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                "Gathering..."
              )
            }
          />
        </>
      )}

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

function ActivityFilterPanel({
  state,
  onChange,
}: {
  state: ActivityFiltersState;
  onChange: (state: ActivityFiltersState) => void;
}) {
  const activeCount = countActivityFilters(state);

  function updateCategories(category: ActivityCategory, checked: boolean) {
    onChange({
      ...state,
      categories: toggleValue(state.categories, category, checked),
    });
  }

  function updateDates(date: DateFilter, checked: boolean) {
    onChange({
      ...state,
      dates: toggleValue(state.dates, date, checked),
    });
  }

  function clearAll() {
    onChange({ categories: [], dates: [] });
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
            onClick={clearAll}
            className="text-xs font-medium text-foreground/80 hover:text-foreground transition"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Filter activity</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Combine category and date filters
          </p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        <div className="border-b border-border/60 p-2">
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

        <div className="p-2">
          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Date
          </p>
          <div className="mt-1 space-y-0.5">
            {DATE_OPTIONS.map((option) => {
              const checked = state.dates.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    className="rounded-[4px]"
                    checked={checked}
                    onCheckedChange={(value) => updateDates(option.id, value === true)}
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
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

  function removeCategory(category: ActivityCategory) {
    onChange({
      ...state,
      categories: state.categories.filter((item) => item !== category),
    });
  }

  function removeDate(date: DateFilter) {
    onChange({
      ...state,
      dates: state.dates.filter((item) => item !== date),
    });
  }

  function clearAll() {
    onChange({ categories: [], dates: [] });
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

      {state.dates.map((date) => (
        <Badge
          key={`date-${date}`}
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => removeDate(date)}
        >
          {date}
          <X className="size-3" />
        </Badge>
      ))}

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
