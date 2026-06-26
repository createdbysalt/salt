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
import {
  daysInMonth,
  firstDayOffset,
  weekDaysForStart,
  weekStartForDay,
} from "@/app/_features/hq/hq-dashboard-utils";
import type { HqCalendarEvent, HqEventTone, HqUpcomingData } from "@/app/_features/hq/types";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

const toneDot: Record<HqEventTone, string> = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
  muted: "bg-muted-foreground/40",
};

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MiniCalendar({
  year,
  month,
  todayDay,
  eventsByDay,
  weekStart,
  onSelectWeek,
}: {
  year: number;
  month: number;
  todayDay: number;
  eventsByDay: Record<number, HqCalendarEvent[]>;
  weekStart: number;
  onSelectWeek: (start: number) => void;
}) {
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="w-full">
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div
            key={index}
            className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="space-y-0.5">
        {rows.map((row, rowIdx) => {
          const rowFirstDay = row.find((cell) => cell !== null) as number | undefined;
          const isSelectedRow = rowFirstDay !== undefined && rowFirstDay === weekStart;
          return (
            <div key={rowIdx} className="relative grid grid-cols-7 gap-1">
              {isSelectedRow ? (
                <motion.div
                  layoutId="weekPill"
                  transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.7 }}
                  className="absolute inset-0 rounded-xl bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] ring-1 ring-[color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                />
              ) : null}
              {row.map((day, colIdx) => {
                if (day === null) return <div key={colIdx} className="h-9" />;
                const dayEvents = eventsByDay[day] ?? [];
                const isToday = day === todayDay;
                return (
                  <button
                    key={colIdx}
                    type="button"
                    onClick={() => rowFirstDay !== undefined && onSelectWeek(rowFirstDay)}
                    className={cn(
                      "relative flex h-9 flex-col items-center justify-center rounded-lg text-[13px] transition-colors",
                      !isSelectedRow && "hover:bg-muted/70",
                      isToday && "font-semibold text-flame",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular-nums leading-none",
                        isSelectedRow ? "font-semibold text-foreground" : "font-medium",
                      )}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 ? (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((event, index) => (
                          <span key={index} className={cn("size-[3px] rounded-full", toneDot[event.tone])} />
                        ))}
                      </div>
                    ) : null}
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

type Props = {
  data: HqUpcomingData;
};

export function UpcomingTab({ data }: Props) {
  const { year, month, monthName, todayDay, eventsByDay, monthEventCount, horizon, byProject, automations } =
    data;
  const [weekStart, setWeekStart] = useState(weekStartForDay(year, month, todayDay));
  const weekDays = useMemo(() => weekDaysForStart(year, month, weekStart), [year, month, weekStart]);
  const weekEvents = useMemo(
    () => weekDays.flatMap((day) => (eventsByDay[day] ?? []).map((event) => ({ ...event, day }))),
    [weekDays, eventsByDay],
  );
  const featured = weekEvents.find((event) => event.priority) ?? weekEvents[0];
  const weekRangeLabel =
    weekDays.length > 0 ? `${monthName} ${weekDays[0]} – ${weekDays[weekDays.length - 1]}` : monthName;
  const isCurrentWeek = weekStart === weekStartForDay(year, month, todayDay);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: APPLE_EASE }}
      className="space-y-5"
    >
      <header className="flex items-end justify-between gap-4 px-1 pt-1">
        <div className="min-w-0">
          <h2 className="font-display text-4xl lg:text-5xl">The road ahead</h2>
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            {monthEventCount} items planned across {monthName} {year}
          </p>
        </div>
        <span className="chip hidden shrink-0 sm:inline-flex">
          <CalendarIcon className="size-3 text-flame" strokeWidth={2.5} /> {monthName} {year}
        </span>
      </header>

      <div className="grid auto-rows-[minmax(0,auto)] grid-cols-12 gap-4 lg:gap-5">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-5 lg:col-span-5 lg:row-start-1"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-2xl tracking-tight">{monthName}</h3>
              <span className="text-sm tabular-nums text-muted-foreground">{year}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
                aria-label="Previous month"
                disabled
              >
                <ChevronLeft className="size-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setWeekStart(weekStartForDay(year, month, todayDay))}
                className="rounded-md px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted"
              >
                This week
              </button>
              <button
                type="button"
                className="grid size-8 place-items-center rounded-lg transition hover:bg-muted"
                aria-label="Next month"
                disabled
              >
                <ChevronRight className="size-4" strokeWidth={2} />
              </button>
            </div>
          </div>
          <MiniCalendar
            year={year}
            month={month}
            todayDay={todayDay}
            eventsByDay={eventsByDay}
            weekStart={weekStart}
            onSelectWeek={setWeekStart}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04, ease: APPLE_EASE }}
          className="glass-card col-span-12 flex flex-col rounded-3xl p-6 lg:col-span-7 lg:row-span-2 lg:row-start-1"
        >
          <header className="mb-5 flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {isCurrentWeek ? "This week" : "Week of"}
              </p>
              <h3 className="mt-0.5 font-display text-2xl tracking-tight">{weekRangeLabel}</h3>
            </div>
            <span className="chip tabular-nums">
              {weekEvents.length} {weekEvents.length === 1 ? "item" : "items"}
            </span>
          </header>
          {weekEvents.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <span className="mb-3 grid size-10 place-items-center rounded-full bg-muted">
                <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <p className="text-sm font-medium">A quiet week ahead</p>
              <p className="mt-1 max-w-[240px] text-[12px] text-muted-foreground">
                Nothing on the calendar. Salt&apos;s still working in the background.
              </p>
            </div>
          ) : (
            <ul className="-mx-2 flex-1 divide-y divide-border/40">
              {weekDays.map((day) => {
                const dayItems = eventsByDay[day] ?? [];
                if (dayItems.length === 0) return null;
                const offset = firstDayOffset(year, month);
                const dow = DAY_LABEL[(offset + day - 1) % 7];
                const isToday = day === todayDay;
                return (
                  <li key={day} className="grid grid-cols-[64px_1fr] gap-3 px-2 py-3">
                    <div className="pt-0.5">
                      <p
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-[0.16em]",
                          isToday ? "text-flame" : "text-muted-foreground",
                        )}
                      >
                        {dow}
                      </p>
                      <p
                        className={cn(
                          "mt-1 font-display text-2xl tabular-nums leading-none tracking-tight",
                          isToday && "text-flame",
                        )}
                      >
                        {day}
                      </p>
                      {isToday ? (
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-flame">
                          Today
                        </p>
                      ) : null}
                    </div>
                    <ul className="min-w-0 space-y-1.5">
                      {dayItems.map((event, index) => (
                        <li
                          key={`${day}-${index}`}
                          className="group -mx-2 flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1 transition hover:bg-muted/60"
                        >
                          <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", toneDot[event.tone])} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[13px] font-medium leading-snug">{event.title}</p>
                              {event.priority ? (
                                <Flame className="size-3 shrink-0 text-flame" strokeWidth={2.25} />
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {event.time ? (
                                <span className="font-semibold tabular-nums text-foreground/70">{event.time}</span>
                              ) : null}
                              {event.time ? " · " : null}
                              {event.sub}
                              {event.auto ? (
                                <span className="ml-1 text-muted-foreground/70">· auto</span>
                              ) : null}
                            </p>
                          </div>
                          <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08, ease: APPLE_EASE }}
          className={cn(
            "relative col-span-12 overflow-hidden rounded-3xl p-6 lg:col-span-5 lg:row-start-2",
            featured ? "surface-aurora text-white" : "glass-card",
          )}
        >
          {featured ? (
            <>
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="chip bg-white/15 text-white/90 backdrop-blur">
                    <Flame className="size-3" /> Next up
                  </span>
                  {featured.time ? (
                    <span className="chip bg-white/15 text-white/90 backdrop-blur">
                      <Clock className="size-3" /> {featured.time}
                    </span>
                  ) : null}
                </div>
                <div>
                  <h3 className="font-display text-2xl leading-tight tracking-tight lg:text-3xl">
                    {featured.title}
                  </h3>
                  <p className="mt-2 text-sm text-white/85">{featured.sub}</p>
                </div>
              </div>
              <div className="pointer-events-none absolute -top-10 -right-10 size-48 animate-float rounded-full bg-white/20 blur-3xl" />
            </>
          ) : (
            <div className="flex flex-col gap-4">
              <span className="chip self-start">
                <Sparkles className="size-3 text-flame" strokeWidth={2.5} /> Next up
              </span>
              <div>
                <h3 className="font-display text-2xl leading-tight tracking-tight lg:text-3xl">
                  You&apos;re clear for this week
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nothing urgent on deck. Pick a different week to see what&apos;s coming.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWeekStart(weekStartForDay(year, month, todayDay))}
                className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
              >
                Jump to this week
              </button>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16, ease: APPLE_EASE }}
          className="glass-card col-span-12 flex flex-col rounded-3xl p-6 lg:col-span-8 lg:row-span-2"
        >
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">On the horizon</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">next 30 days</span>
          </header>
          {horizon.length > 0 ? (
            <ul className="-mx-2 flex-1 divide-y divide-border/40">
              {horizon.map((item) => (
                <li
                  key={`${item.dateLabel}-${item.title}`}
                  className="grid cursor-pointer grid-cols-[64px_1fr_auto] items-center gap-4 rounded-xl px-2 py-3 transition hover:bg-muted/40"
                >
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {item.monthLabel}
                    </p>
                    <p className="mt-0.5 font-display text-2xl tabular-nums leading-none tracking-tight">
                      {item.dayLabel}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{item.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{item.project}</p>
                  </div>
                  <span className="chip tabular-nums">{item.daysUntil}d</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Milestones and meetings in the next 30 days will show up here.
            </p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-4"
        >
          <header className="mb-4 flex items-center gap-2">
            <Users className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">By project</h3>
          </header>
          {byProject.length > 0 ? (
            <ul className="space-y-2">
              {byProject.map((project) => (
                <li
                  key={project.name}
                  className="group -mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-muted/60"
                >
                  <span className={cn("size-2 rounded-full", toneDot[project.tone])} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium leading-tight">{project.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{project.next}</p>
                  </div>
                  <span className="chip tabular-nums">{project.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Upcoming work grouped by client or project.</p>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: APPLE_EASE }}
          className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-4"
        >
          <header className="mb-4 flex items-center gap-2">
            <Zap className="size-[18px] text-violet" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Salt is running</h3>
          </header>
          {automations.length > 0 ? (
            <>
              <ul className="space-y-3">
                {automations.map((automation) => (
                  <li key={automation.label} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet/15">
                      <CheckCircle2 className="size-3.5 text-violet" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{automation.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{automation.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-border/50 pt-4 text-[11px] italic text-muted-foreground">
                {automations.length} automation{automations.length === 1 ? "" : "s"} scheduled this week
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Scheduled plays and automations will appear here once Salt has them queued.
            </p>
          )}
        </motion.section>
      </div>
    </motion.div>
  );
}
