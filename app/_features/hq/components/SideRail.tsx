"use client";

import Link from "next/link";
import { Calendar, Lightbulb, ArrowUpRight, Timer, TrendingDown, TrendingUp } from "lucide-react";
import type { HqSideRailData } from "@/app/_features/hq/types";

type Props = {
  data: HqSideRailData;
};

export function SideRail({ data }: Props) {
  const { timeSaved, schedule, headsUp, scheduleContext } = data;

  return (
    <aside className="space-y-3">
      <div
        className="glass-card animate-rise relative overflow-hidden rounded-3xl p-5"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between">
          <span className="chip">
            <Timer className="size-3 text-flame" /> Time saved
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{timeSaved.weekLabel}</span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-5xl tracking-tight">{timeSaved.valueLabel}</span>
          <span className="text-sm text-muted-foreground">back this week</span>
        </div>
        <div className="mt-4 flex h-8 gap-1">
          {timeSaved.weeklyActivity.map((height, index) => (
            <div
              key={index}
              className="surface-aurora flex-1 rounded-md"
              style={{
                opacity: 0.4 + height * 0.6,
                height: `${height * 100}%`,
                alignSelf: "flex-end",
              }}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          {timeSaved.weekOverWeekPct === null ? (
            <span>
              {timeSaved.hasActivity
                ? "Time saved by plays this week"
                : "Approve plays to get time back"}
            </span>
          ) : timeSaved.weekOverWeekPct >= 0 ? (
            <>
              <TrendingUp className="size-3 text-flame" /> +{timeSaved.weekOverWeekPct}% vs last week
            </>
          ) : (
            <>
              <TrendingDown className="size-3 text-muted-foreground" /> {timeSaved.weekOverWeekPct}% vs last week
            </>
          )}
        </div>
      </div>

      <div
        className="glass-card animate-rise rounded-3xl p-5"
        style={{ animationDelay: "280ms" }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Today&apos;s schedule</h3>
          </div>
          <span className="chip">{schedule.length}</span>
        </header>
        <ul className="space-y-1">
          {schedule.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              {scheduleContext.hasCalendarConnected ? (
                <>
                  No meetings on your calendar today.{" "}
                  <Link href="/meetings" className="font-medium text-foreground hover:underline">
                    View all meetings
                  </Link>
                </>
              ) : (
                <>
                  Connect calendar to sync today&apos;s meetings.{" "}
                  <Link
                    href="?settings=connectors"
                    className="font-medium text-foreground hover:underline"
                  >
                    Connect Google Calendar
                  </Link>
                </>
              )}
            </li>
          ) : null}
          {schedule.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group relative -mx-2 flex gap-4 rounded-xl px-2 py-2.5 transition hover:bg-muted/60"
              >
                <div className="w-12 shrink-0 pt-0.5">
                  <p className="text-sm font-semibold tabular-nums">{item.time}</p>
                  <p className="text-[10px] text-muted-foreground">{item.dur}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
                    {item.hot ? (
                      <span className="size-1.5 animate-pulse-glow rounded-full bg-flame" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{item.who}</p>
                </div>
                <ArrowUpRight className="size-3.5 shrink-0 self-center text-muted-foreground opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="glass-card animate-rise rounded-3xl p-5"
        style={{ animationDelay: "360ms" }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Heads up</h3>
          </div>
          <span className="chip">{headsUp.length}</span>
        </header>
        <ul className="space-y-3">
          {headsUp.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Salt will flag what needs attention here.
            </li>
          ) : null}
          {headsUp.map((item, index) => (
            <li key={item.title} className="group flex cursor-pointer gap-3">
              <div className="surface-aurora mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg">
                <span className="relative z-10 text-[10px] font-bold tabular-nums text-white">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link href={item.href} className="block">
                    <p className="text-sm font-medium leading-snug group-hover:text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-medium leading-snug group-hover:text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
