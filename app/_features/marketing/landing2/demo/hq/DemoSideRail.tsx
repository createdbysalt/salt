import { Calendar, Lightbulb, ArrowUpRight, Flame, TrendingUp } from "lucide-react";

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
  return (
    <aside className="space-y-3">
      {/* Streak / momentum card */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-5 animate-rise" style={{ animationDelay: "200ms" }}>
        <div className="flex items-center justify-between">
          <span className="chip"><Flame className="size-3 text-flame" /> Momentum</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">Week 7</span>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="font-display text-5xl tracking-tight">23</span>
          <span className="text-sm text-muted-foreground">day streak</span>
        </div>
        <div className="mt-4 flex gap-1 h-8">
          {[0.4, 0.7, 0.5, 0.9, 0.6, 1, 0.8].map((h, i) => (
            <div key={i} className="flex-1 rounded-md surface-aurora" style={{ opacity: 0.4 + h * 0.6, height: `${h * 100}%`, alignSelf: "flex-end" }} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="size-3 text-flame" /> +28% vs last week
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-3xl glass-card p-5 animate-rise" style={{ animationDelay: "280ms" }}>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Today's schedule</h3>
          </div>
          <span className="chip">3</span>
        </header>
        <ul className="space-y-1">
          {schedule.map((s, i) => (
            <li key={i} className="group relative flex gap-4 py-2.5 rounded-xl px-2 -mx-2 hover:bg-muted/60 transition cursor-pointer">
              <div className="w-12 shrink-0 pt-0.5">
                <p className="text-sm font-semibold tabular-nums">{s.time}</p>
                <p className="text-[10px] text-muted-foreground">{s.dur}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium leading-tight truncate">{s.title}</p>
                  {s.hot && <span className="size-1.5 rounded-full bg-flame animate-pulse-glow" />}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.who}</p>
              </div>
              <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0 self-center" />
            </li>
          ))}
        </ul>
      </div>

      {/* Heads up */}
      <div className="rounded-3xl glass-card p-5 animate-rise" style={{ animationDelay: "360ms" }}>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-[18px]" strokeWidth={1.75} />
            <h3 className="font-semibold tracking-tight">Heads up</h3>
          </div>
          <span className="chip">{headsUp.length}</span>
        </header>
        <ul className="space-y-3">
          {headsUp.map((h, i) => (
            <li key={i} className="group flex gap-3 cursor-pointer">
              <div className="size-7 shrink-0 rounded-lg surface-aurora grid place-items-center mt-0.5">
                <span className="text-[10px] font-bold text-white relative z-10 tabular-nums">{i + 1}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug group-hover:text-foreground">{h.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{h.sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
