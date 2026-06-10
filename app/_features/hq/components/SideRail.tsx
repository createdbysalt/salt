"use client";

import { Calendar, Lightbulb, ArrowUpRight, Flame, TrendingUp } from "lucide-react";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";

const schedule = [
  { time: "10:00", title: "Luma Health: launch readiness", who: "Elena Marquez", dur: "30m", hot: true },
  { time: "14:00", title: "Atlas Coaching: kickoff prep", who: "Theo Grant", dur: "30m", hot: false },
  { time: "16:30", title: "Internal: design crit", who: "Alice Chen", dur: "45m", hot: false },
];

const headsUp = [
  { title: "Luma may be ready for the next project", sub: "Referral partner site, pulled from yesterday's call" },
  { title: "Cedar asking for out-of-scope work", sub: "Two extra landing pages, not in the approved scope" },
  { title: "Gmail, Calendar, Drive, Stripe are organized", sub: "247 emails sorted · 12 docs filed today" },
];

export function SideRail() {
  const mockContent = useMockContent();
  const scheduleItems = mockContent ? schedule : [];
  const headsUpItems = mockContent ? headsUp : [];

  return (
    <aside className="space-y-3">
      {mockContent && (
      <div
        className="glass-card animate-rise relative overflow-hidden rounded-3xl p-5"
        style={{ animationDelay: "200ms" }}
      >
        <div className="flex items-center justify-between">
          <span className="chip">
            <Flame className="size-3 text-flame" /> Momentum
          </span>
          <span className="text-[11px] tabular-nums text-muted-foreground">Week 7</span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-5xl tracking-tight">23</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        <div className="mt-4 flex h-8 gap-1">
          {[0.4, 0.7, 0.5, 0.9, 0.6, 1, 0.8].map((height, index) => (
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
          <TrendingUp className="size-3 text-flame" /> +28% vs last week
        </div>
      </div>
      )}

      <div
        className="glass-card animate-rise rounded-3xl p-5"
        style={{ animationDelay: "280ms" }}
      >
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Today&apos;s schedule</h3>
          </div>
          <span className="chip">{scheduleItems.length}</span>
        </header>
        <ul className="space-y-1">
          {scheduleItems.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">
              Connect calendar to see today&apos;s meetings.
            </li>
          ) : null}
          {scheduleItems.map((item) => (
            <li
              key={`${item.time}-${item.title}`}
              className="group relative -mx-2 flex cursor-pointer gap-4 rounded-xl px-2 py-2.5 transition hover:bg-muted/60"
            >
              <div className="w-12 shrink-0 pt-0.5">
                <p className="text-sm font-semibold tabular-nums">{item.time}</p>
                <p className="text-[10px] text-muted-foreground">{item.dur}</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium leading-tight">{item.title}</p>
                  {item.hot && (
                    <span className="size-1.5 animate-pulse-glow rounded-full bg-flame" />
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{item.who}</p>
              </div>
              <ArrowUpRight className="size-3.5 shrink-0 self-center text-muted-foreground opacity-0 transition group-hover:opacity-100" />
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
          <span className="chip">{headsUpItems.length}</span>
        </header>
        <ul className="space-y-3">
          {headsUpItems.length === 0 ? (
            <li className="text-sm text-muted-foreground">
              Salt will flag what needs attention here.
            </li>
          ) : null}
          {headsUpItems.map((item, index) => (
            <li key={item.title} className="group flex cursor-pointer gap-3">
              <div className="surface-aurora mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg">
                <span className="relative z-10 text-[10px] font-bold tabular-nums text-white">
                  {index + 1}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug group-hover:text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{item.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
