import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, RotateCcw, CheckCircle2, Clock, Zap, X, ChevronDown, Sparkles, Workflow, Target, Calendar, SlidersHorizontal, CalendarClock } from "lucide-react";
import type { ActivityEntryRow } from "@/app/_features/plays/types";
import { mapActivityEntryForUi } from "@/app/_features/plays/utils/map-activity-entry";
import { playerById, TONE_SOFT, type ActivityEntry, type ActivityStatus } from "@/app/_lib/demo/plays-demo-data";
import { cn } from "@repo/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const STATUS_STYLES: Record<ActivityStatus, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  approved: { label: "Approved", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300", icon: CheckCircle2 },
  pending: { label: "Pending", cls: "bg-flame/15 text-flame", icon: Clock },
  "auto-applied": { label: "Auto-applied", cls: "bg-sky/15 text-sky", icon: Zap },
  dismissed: { label: "Dismissed", cls: "bg-muted text-muted-foreground", icon: X },
  scheduled: { label: "Scheduled", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300", icon: CalendarClock },
};

const STATUS_FILTERS: { id: ActivityStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "pending", label: "Pending" },
  { id: "auto-applied", label: "Auto-applied" },
  { id: "dismissed", label: "Dismissed" },
  { id: "scheduled", label: "Scheduled" },
];

type DateFilter = "all" | "Today" | "Yesterday" | "Earlier this week";
const DATE_FILTERS: { id: DateFilter; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "Today", label: "Today" },
  { id: "Yesterday", label: "Yesterday" },
  { id: "Earlier this week", label: "Earlier this week" },
];

export function ActivityTab({
  initialActivity,
}: {
  initialActivity: ActivityEntryRow[];
}) {
  const activitySource = useMemo(
    () => initialActivity.map(mapActivityEntryForUi),
    [initialActivity],
  );
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const entries = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activitySource
      .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
      .filter((e) => (dateFilter === "all" ? true : e.dayGroup === dateFilter))
      .filter((e) =>
        !term ? true : e.title.toLowerCase().includes(term) || e.target.toLowerCase().includes(term)
      );
  }, [q, statusFilter, dateFilter, activitySource]);

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
      approved: today.filter((e) => e.status === "approved").length,
      pending: today.filter((e) => e.status === "pending").length,
      auto: today.filter((e) => e.status === "auto-applied").length,
      dismissed: today.filter((e) => e.status === "dismissed").length,
      scheduled: today.filter((e) => e.status === "scheduled").length,
      total: today.length,
    };
  }, [activitySource]);

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
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold">Today's trust ledger</p>
            <h3 className="font-display text-lg tracking-tight mt-0.5">{counts.total} actions today</h3>
          </div>
          <p className="text-[11px] text-muted-foreground max-w-[280px] text-right hidden md:block">
            Click any row to see the trigger, sources, outcome, and what Salt learned.
          </p>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          <CountTile label="Approved" value={counts.approved} tone="emerald" />
          <CountTile label="Pending" value={counts.pending} tone="flame" />
          <CountTile label="Auto-applied" value={counts.auto} tone="sky" />
          <CountTile label="Dismissed" value={counts.dismissed} tone="muted" />
          <CountTile label="Scheduled" value={counts.scheduled} tone="violet" />
        </div>
      </section>

      {/* Search + filter bar — matches Playbooks layout */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activity…"
            className="w-full h-9 pl-10 pr-4 rounded-full bg-card border border-border/60 hover:border-border focus:outline-none focus:ring-4 focus:ring-foreground/5 text-sm transition"
          />
        </div>
        <div className="ml-auto">
          <ActivityFilterPopover
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            onDateFilter={setDateFilter}
          />
        </div>
      </div>

      {/* Day-grouped timeline */}
      {grouped.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center">
          <p className="font-display text-2xl tracking-tight">No matching activity</p>
          <p className="text-sm text-muted-foreground mt-1">Adjust the filters or search.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <header className="px-2 flex items-center gap-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{day}</p>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] text-muted-foreground tabular-nums">{items.length}</span>
              </header>
              <ul className="glass-card rounded-3xl divide-y divide-border/40 overflow-hidden">
                {items.map((e) => {
                  const player = playerById(e.playerId);
                  const PlayerIcon = player.icon;
                  const status = STATUS_STYLES[e.status];
                  const StatusIcon = status.icon;
                  const isOpen = expanded.has(e.id);
                  const canUndo = e.status === "auto-applied" || e.status === "approved";

                  return (
                    <li key={e.id} className="group">
                      <button
                        type="button"
                        onClick={() => toggleExpand(e.id)}
                        aria-expanded={isOpen}
                        className="w-full grid grid-cols-[32px_56px_36px_1fr_auto_20px] items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition text-left"
                      >
                        <span className="flex items-center justify-center">
                          {canUndo ? (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(ev) => ev.stopPropagation()}
                              className="size-7 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
                              title="Undo"
                              aria-label="Undo"
                            >
                              <RotateCcw className="size-3.5" strokeWidth={2.25} />
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{e.time}</span>
                        <span className={cn("size-8 rounded-xl grid place-items-center", TONE_SOFT[player.tone])}>
                          <PlayerIcon className="size-3.5" strokeWidth={2.25} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium leading-tight truncate">{e.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {e.target} · <span className="font-medium">{e.playbook}</span> · by {player.name}
                          </p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap", status.cls)}>
                          <StatusIcon className="size-3" strokeWidth={2.5} />
                          {status.label}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-4 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-180 text-foreground"
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
                            <div className="px-4 pb-5 pt-1 pl-[88px] pr-6 space-y-3.5">
                              <DetailRow icon={Target} label="Trigger" value={e.trigger ?? "—"} />
                              <DetailRow
                                icon={Workflow}
                                label="Sources used"
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
                              <DetailRow icon={CheckCircle2} label="Outcome" value={e.outcome ?? "—"} />
                              <DetailRow
                                icon={Sparkles}
                                label="What Salt learned"
                                value={e.learned && e.learned !== "—" ? e.learned : "Nothing yet — still pending."}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ActivityFilterPopover({
  statusFilter,
  onStatusFilter,
  dateFilter,
  onDateFilter,
}: {
  statusFilter: ActivityStatus | "all";
  onStatusFilter: (s: ActivityStatus | "all") => void;
  dateFilter: DateFilter;
  onDateFilter: (d: DateFilter) => void;
}) {
  const activeCount = (statusFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium border transition-all shrink-0",
            activeCount > 0
              ? "bg-foreground text-background border-foreground"
              : "bg-card text-foreground/80 border-border/60 hover:border-border"
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 && (
            <span className="text-[11px] font-semibold tabular-nums bg-background/20 rounded-md px-1.5 py-0.5">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 rounded-2xl border-border/60 space-y-4">
        <PopoverSection icon={Sparkles} label="Status">
          {STATUS_FILTERS.map((o) => (
            <FilterChip key={o.id} active={statusFilter === o.id} onClick={() => onStatusFilter(o.id)}>
              {o.label}
            </FilterChip>
          ))}
        </PopoverSection>
        <PopoverSection icon={Calendar} label="Date">
          {DATE_FILTERS.map((o) => (
            <FilterChip key={o.id} active={dateFilter === o.id} onClick={() => onDateFilter(o.id)}>
              {o.label}
            </FilterChip>
          ))}
        </PopoverSection>
      </PopoverContent>
    </Popover>
  );
}

function PopoverSection({ icon: Icon, label, children }: { icon: typeof CheckCircle2; label: string; children: React.ReactNode }) {
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

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-[12px] font-medium border transition-all",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card text-foreground/80 border-border/60 hover:border-border"
      )}
    >
      {children}
    </button>
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
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-semibold pt-0.5">{label}</p>
      <div className="text-[12.5px] text-foreground/85 leading-relaxed">{value}</div>
    </div>
  );
}

function CountTile({ label, value, tone }: { label: string; value: number; tone: "emerald" | "flame" | "sky" | "muted" | "violet" }) {
  const cls = {
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    flame: "bg-flame/15 text-flame",
    sky: "bg-sky/15 text-sky",
    muted: "bg-muted text-muted-foreground",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  }[tone];
  return (
    <div className={cn("rounded-2xl p-3.5 flex items-baseline justify-between gap-2", cls)}>
      <p className="font-display text-2xl tracking-tight tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold opacity-80">{label}</p>
    </div>
  );
}
