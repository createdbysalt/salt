"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Flame,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { cn } from "@repo/utils";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

// Mock events keyed by day-of-month (May 2026)
const events: Record<number, { time?: string; title: string; sub: string; tone: "flame" | "sky" | "violet" | "muted"; priority?: boolean; auto?: boolean }[]> = {
  26: [
    { time: "2:00pm", title: "Atlas kickoff prep", sub: "Theo Grant · 30 min", tone: "sky" },
    { time: "9:00am", title: "Daily standup synced", sub: "Notion · auto", tone: "muted", auto: true },
  ],
  27: [{ title: "Portal launch readiness due", sub: "Luma Health", tone: "flame", priority: true }],
  28: [
    { time: "9:00am", title: "Payment reminder needs approval", sub: "Brightline Legal · $4,200", tone: "flame", priority: true },
    { title: "Weekly client digest sent", sub: "Automated", tone: "muted", auto: true },
  ],
  29: [{ time: "4:30pm", title: "Internal design review", sub: "Alice Chen · 45 min", tone: "violet" }],
  30: [
    { time: "11:00am", title: "Cedar scope note follow-up", sub: "Brand Refresh", tone: "sky" },
    { title: "Invoices auto-generated", sub: "3 clients · QuickBooks", tone: "muted", auto: true },
  ],
  2: [{ title: "Luma expansion outline", sub: "Referral partner site", tone: "violet" }],
  5: [{ title: "Atlas first-week check-in", sub: "Kickoff review", tone: "sky" }],
  14: [{ title: "Q2 retrospective", sub: "Internal · half day", tone: "violet" }],
};

const toneDot = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
  muted: "bg-muted-foreground/40",
};

// Build calendar grid for May 2026 (starts Friday)
const MONTH = "May";
const YEAR = 2026;
const DAYS_IN_MONTH = 31;
const FIRST_DAY_OFFSET = 5; // Fri
const TODAY = 26;

function MiniCalendar({ weekStart, onSelectWeek }: { weekStart: number; onSelectWeek: (start: number) => void }) {
  // Build rows of 7 cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < FIRST_DAY_OFFSET; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">{d}</div>
        ))}
      </div>
      <div className="space-y-0.5">
        {rows.map((row, rowIdx) => {
          const rowFirstDay = row.find((c) => c !== null) as number | undefined;
          const isSelectedRow = rowFirstDay !== undefined && rowFirstDay === weekStart;
          return (
            <div key={rowIdx} className="relative grid grid-cols-7 gap-1">
              {isSelectedRow && (
                <motion.div
                  layoutId="weekPill"
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
                  className="absolute inset-0 rounded-xl bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                />
              )}
              {row.map((d, colIdx) => {
                if (d === null) return <div key={colIdx} className="h-9" />;
                const dayEvents = events[d] ?? [];
                const isToday = d === TODAY;
                return (
                  <button
                    key={colIdx}
                    onClick={() => rowFirstDay !== undefined && onSelectWeek(rowFirstDay)}
                    className={cn(
                      "relative h-9 flex flex-col items-center justify-center text-[13px] rounded-lg transition-colors",
                      !isSelectedRow && "hover:bg-muted/70",
                      isToday && "text-flame font-semibold",
                    )}
                  >
                    <span className={cn("tabular-nums leading-none", isSelectedRow ? "font-semibold text-foreground" : "font-medium")}>{d}</span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e, j) => (
                          <span key={j} className={cn("size-[3px] rounded-full", toneDot[e.tone])} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const horizon = [
  { date: "Jun 2", days: 7, title: "Luma expansion outline", project: "Luma Health" },
  { date: "Jun 5", days: 10, title: "Atlas first-week check-in", project: "Atlas Coaching" },
  { date: "Jun 14", days: 19, title: "Q2 retrospective", project: "Internal" },
];

const byProject = [
  { name: "Luma Health", count: 4, tone: "flame" as const, next: "Tue · launch readiness" },
  { name: "Atlas Coaching", count: 3, tone: "sky" as const, next: "Today · kickoff prep" },
  { name: "Brightline Legal", count: 2, tone: "violet" as const, next: "Wed · payment reminder" },
  { name: "Cedar", count: 2, tone: "flame" as const, next: "Fri · scope note" },
];

const automations = [
  { label: "Daily standup digest", time: "9:00am", icon: Zap },
  { label: "Weekly client digest", time: "Wed 9am", icon: Sparkles },
  { label: "Invoice generation", time: "Fri 11am", icon: CheckCircle2 },
];

// Compute the week-start day-of-month for a given day, based on the
// May 2026 calendar layout (FIRST_DAY_OFFSET = Fri).
function weekStartFor(day: number) {
  const cellIndex = FIRST_DAY_OFFSET + (day - 1);
  const rowStart = cellIndex - (cellIndex % 7);
  return Math.max(1, rowStart - FIRST_DAY_OFFSET + 1);
}

function weekDaysFor(start: number) {
  const cellIndex = FIRST_DAY_OFFSET + (start - 1);
  const days: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = start + i - (cellIndex % 7 === 0 ? 0 : 0); // start IS first non-null day in row
    // build by counting forward from start, but cap at DAYS_IN_MONTH
    const candidate = start + i;
    if (candidate <= DAYS_IN_MONTH) days.push(candidate);
  }
  // Trim leading entries that fall before start (they don't, since start IS first day of row)
  return days.slice(0, 7);
}

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function UpcomingTab() {
  const mockContent = useMockContent();
  const eventSource = mockContent ? events : {};
  const [weekStart, setWeekStart] = useState(weekStartFor(TODAY));
  const weekDays = useMemo(() => weekDaysFor(weekStart), [weekStart]);
  const weekEvents = useMemo(
    () => weekDays.flatMap(d => (eventSource[d] ?? []).map(e => ({ ...e, day: d }))),
    [weekDays, eventSource]
  );
  const monthCount = Object.values(eventSource).flat().length;
  const featured = weekEvents.find(e => e.priority) ?? weekEvents[0];
  const weekRangeLabel = weekDays.length
    ? `${MONTH} ${weekDays[0]} – ${weekDays[weekDays.length - 1]}`
    : MONTH;
  const isCurrentWeek = weekStart === weekStartFor(TODAY);

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="Nothing on the calendar yet"
        description="Connect Google Calendar and Salt will surface upcoming meetings and deadlines here."
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      {/* Header */}
      <header className="flex items-end justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h2 className="font-display text-4xl lg:text-5xl">The road ahead</h2>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">
            {monthCount} items planned across {MONTH} {YEAR}
          </p>
        </div>
        <span className="hidden sm:inline-flex chip shrink-0">
          <CalendarIcon className="size-3 text-flame" strokeWidth={2.5} /> {MONTH} {YEAR}
        </span>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5 auto-rows-[minmax(0,auto)]">
        {/* Calendar — top-left */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-5 lg:row-start-1 glass-card rounded-3xl p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-2xl tracking-tight">{MONTH}</h3>
              <span className="text-sm text-muted-foreground tabular-nums">{YEAR}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="size-8 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="Previous month">
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
              <button
                onClick={() => setWeekStart(weekStartFor(TODAY))}
                className="text-[11px] font-medium px-2.5 py-1 rounded-md hover:bg-muted transition text-muted-foreground"
              >
                This week
              </button>
              <button className="size-8 grid place-items-center rounded-lg hover:bg-muted transition" aria-label="Next month">
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <MiniCalendar weekStart={weekStart} onSelectWeek={setWeekStart} />
        </motion.section>

        {/* Selected week schedule — right column, spans both rows */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.04, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-7 lg:row-start-1 lg:row-span-2 glass-card rounded-3xl p-6 flex flex-col"
        >
          <header className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">
                {isCurrentWeek ? "This week" : "Week of"}
              </p>
              <h3 className="font-display text-2xl tracking-tight mt-0.5">{weekRangeLabel}</h3>
            </div>
            <span className="chip tabular-nums">{weekEvents.length} {weekEvents.length === 1 ? "item" : "items"}</span>
          </header>
          {weekEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <span className="size-10 rounded-full bg-muted grid place-items-center mb-3">
                <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium">A quiet week ahead</p>
              <p className="text-[12px] text-muted-foreground mt-1 max-w-[240px]">Nothing on the calendar. Salt's still working in the background.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40 flex-1 -mx-2">
              {weekDays.map(d => {
                const dayItems = events[d] ?? [];
                if (dayItems.length === 0) return null;
                const cellIndex = FIRST_DAY_OFFSET + (d - 1);
                const dow = DAY_LABEL[cellIndex % 7];
                const isToday = d === TODAY;
                return (
                  <li key={d} className="grid grid-cols-[64px_1fr] gap-3 py-3 px-2">
                    {/* Day column */}
                    <div className="pt-0.5">
                      <p className={cn(
                        "text-[10px] uppercase tracking-[0.16em] font-semibold",
                        isToday ? "text-flame" : "text-muted-foreground"
                      )}>{dow}</p>
                      <p className={cn(
                        "font-display text-2xl tracking-tight leading-none mt-1 tabular-nums",
                        isToday && "text-flame"
                      )}>{d}</p>
                      {isToday && <p className="text-[9px] uppercase tracking-wider text-flame font-semibold mt-1">Today</p>}
                    </div>
                    {/* Events column */}
                    <ul className="space-y-1.5 min-w-0">
                      {dayItems.map((e, i) => (
                        <li key={i} className="group flex items-start gap-2.5 py-1 px-2 -mx-2 rounded-lg hover:bg-muted/60 transition cursor-pointer">
                          <span className={cn("size-1.5 rounded-full mt-2 shrink-0", toneDot[e.tone])} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[13px] font-medium leading-snug truncate">{e.title}</p>
                              {e.priority && <Flame className="size-3 text-flame shrink-0" strokeWidth={2.25} />}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {e.time && <span className="font-semibold tabular-nums text-foreground/70">{e.time}</span>}
                              {e.time && " · "}
                              {e.sub}
                              {e.auto && <span className="ml-1 text-muted-foreground/70">· auto</span>}
                            </p>
                          </div>
                          <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition mt-1 shrink-0" />
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* Featured "Next up" — under the calendar on the left */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08, ease: APPLE_EASE }}
          className={cn(
            "col-span-12 lg:col-span-5 lg:row-start-2 relative overflow-hidden rounded-3xl p-6",
            featured ? "surface-aurora text-white" : "glass-card"
          )}
        >
          {featured ? (
            <>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="chip bg-white/15 text-white/90 backdrop-blur">
                    <Flame className="size-3" /> Next up
                  </span>
                  {featured.time && (
                    <span className="chip bg-white/15 text-white/90 backdrop-blur">
                      <Clock className="size-3" /> {featured.time}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-display text-2xl lg:text-3xl tracking-tight leading-tight">{featured.title}</h3>
                  <p className="mt-2 text-white/85 text-sm">{featured.sub}</p>
                </div>
                <div className="flex gap-2">
                  <button className="h-9 px-4 rounded-full bg-white text-foreground text-sm font-semibold hover-lift">Open</button>
                  <button className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 text-sm font-medium transition">Snooze</button>
                </div>
              </div>
              <div className="pointer-events-none absolute -top-10 -right-10 size-48 rounded-full bg-white/20 blur-3xl animate-float" />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="chip self-start">
                <Sparkles className="size-3 text-flame" strokeWidth={2.5} /> Next up
              </span>
              <div>
                <h3 className="font-display text-2xl lg:text-3xl tracking-tight leading-tight">You're clear for this week</h3>
                <p className="mt-2 text-muted-foreground text-sm">Nothing urgent on deck. Pick a different week to see what's coming.</p>
              </div>
              <button
                onClick={() => setWeekStart(weekStartFor(TODAY))}
                className="self-start h-9 px-4 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 transition"
              >
                Jump to this week
              </button>
            </div>
          )}
        </motion.section>


        {/* Horizon timeline — tall left */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-8 lg:row-span-2 glass-card rounded-3xl p-6 flex flex-col"
        >
          <header className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Target className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">On the horizon</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">next 30 days</span>
          </header>
          <ul className="divide-y divide-border/40 -mx-2 flex-1">
            {horizon.map((h) => (
              <li key={h.date} className="grid grid-cols-[64px_1fr_auto] gap-4 items-center py-3 px-2 rounded-xl hover:bg-muted/40 transition cursor-pointer group">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium">{h.date.split(" ")[0]}</p>
                  <p className="font-display text-2xl tracking-tight leading-none mt-0.5 tabular-nums">{h.date.split(" ")[1]}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{h.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{h.project}</p>
                </div>
                <span className="chip tabular-nums">{h.days}d</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* By project — right top */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-4 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center gap-2 mb-4">
            <Users className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">By project</h3>
          </header>
          <ul className="space-y-2">
            {byProject.map((p) => (
              <li key={p.name} className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl hover:bg-muted/60 transition cursor-pointer">
                <span className={cn("size-2 rounded-full", toneDot[p.tone])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.next}</p>
                </div>
                <span className="chip tabular-nums">{p.count}</span>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Automations card — right bottom */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-4 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center gap-2 mb-4">
            <Zap className="size-[18px] text-violet" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Salt is running</h3>
          </header>
          <ul className="space-y-3">
            {automations.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.label} className="flex items-center gap-3">
                  <span className="size-8 rounded-lg bg-violet/15 grid place-items-center shrink-0">
                    <Icon className="size-3.5 text-violet" strokeWidth={2} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{a.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 pt-4 border-t border-border/50 text-[11px] text-muted-foreground italic">
            3 automations scheduled this week
          </p>
        </motion.section>

      </div>
    </motion.div>
  );
}
