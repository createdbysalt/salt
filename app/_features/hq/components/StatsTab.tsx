"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Flame,
  Sparkles,
  ArrowUpRight,
  Clock,
  CreditCard,
  Target,
  Users,
} from "lucide-react";
import { cn } from "@repo/utils";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

// Revenue sparkline points (last 14 days)
const spark = [4, 8, 6, 12, 10, 16, 14, 20, 18, 24, 22, 28, 26, 32];
const sparkPath = (() => {
  const w = 100, h = 32;
  const max = Math.max(...spark), min = Math.min(...spark);
  const pts = spark.map((v, i) => {
    const x = (i / (spark.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return [x, y] as const;
  });
  return {
    line: pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" "),
    area: pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`)).join(" ") + ` L ${w} ${h} L 0 ${h} Z`,
  };
})();

// Weekly hours stacked bars
const weekHours = [
  { day: "M", hours: [{ tone: "flame", v: 3 }, { tone: "sky", v: 2 }, { tone: "violet", v: 1 }] },
  { day: "T", hours: [{ tone: "flame", v: 4 }, { tone: "sky", v: 3 }, { tone: "violet", v: 1 }] },
  { day: "W", hours: [{ tone: "flame", v: 2 }, { tone: "sky", v: 2 }, { tone: "violet", v: 2 }] },
  { day: "T", hours: [{ tone: "flame", v: 5 }, { tone: "sky", v: 2 }, { tone: "violet", v: 1 }] },
  { day: "F", hours: [{ tone: "flame", v: 3 }, { tone: "sky", v: 1 }, { tone: "violet", v: 2 }] },
];
const maxHours = Math.max(...weekHours.map(d => d.hours.reduce((s, h) => s + h.v, 0)));

const topClients = [
  { name: "Luma Health", value: 4800, share: 38, tone: "flame" as const },
  { name: "Atlas Coaching", value: 3200, share: 26, tone: "sky" as const },
  { name: "Brightline Legal", value: 2400, share: 19, tone: "violet" as const },
  { name: "Cedar Studio", value: 2082, share: 17, tone: "flame" as const },
];

const toneBg = {
  flame: "bg-flame",
  sky: "bg-sky",
  violet: "bg-violet",
};
const toneSoft = {
  flame: "bg-flame/15 text-flame",
  sky: "bg-sky/20 text-[oklch(0.4_0.10_250)] dark:text-[oklch(0.82_0.12_240)]",
  violet: "bg-violet/15 text-[oklch(0.42_0.18_320)] dark:text-[oklch(0.82_0.14_320)]",
};

// Utilization dial
function Ring({ value, label }: { value: number; label: string }) {
  const C = 2 * Math.PI * 28;
  return (
    <div className="relative size-[140px] lg:size-[160px]">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <motion.circle
          cx="32" cy="32" r="28" fill="none"
          stroke="url(#ringGrad)" strokeWidth="6" strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${(value / 100) * C} ${C}` }}
          transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.2 }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.12 175)" />
            <stop offset="100%" stopColor="oklch(0.80 0.16 70)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-4xl lg:text-[2.6rem] tabular-nums leading-none">{value}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function StatsTab() {
  const mockContent = useMockContent();

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="Stats will appear as you work"
        description="Revenue, utilization, and client momentum show up here once Salt has real activity to analyze."
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
          <h2 className="font-display text-4xl lg:text-5xl tracking-tight leading-[0.95]">How the business is moving</h2>
          <p className="mt-2 text-sm text-muted-foreground">Your pulse for May · updated 4m ago</p>
        </div>
        <span className="hidden sm:inline-flex chip shrink-0">
          <Sparkles className="size-3 text-flame" strokeWidth={2.5} /> May 2026
        </span>
      </header>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        {/* Revenue hero — aurora */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-3xl surface-aurora text-white p-6 lg:p-8"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="chip bg-white/15 text-white/90 backdrop-blur">
                <TrendingUp className="size-3" /> Revenue MTD
              </span>
              <span className="chip bg-white/15 text-white/90 backdrop-blur">+18% vs April</span>
            </div>
            <div className="flex items-end gap-6 flex-wrap">
              <p className="font-display text-6xl lg:text-7xl tracking-tight leading-none tabular-nums">$12,482</p>
              <div className="pb-2">
                <p className="text-[11px] uppercase tracking-wider text-white/70 font-medium">Goal $15k</p>
                <p className="font-display text-2xl leading-none mt-1 tabular-nums">83%</p>
              </div>
            </div>
            <div className="mt-5">
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: "83%" }} transition={{ duration: 1.1, delay: 0.3, ease: APPLE_EASE }}
                  className="h-full bg-white/90 rounded-full"
                />
              </div>
              <p className="mt-2 text-[11px] text-white/80">$2,518 to target · 6 days left</p>
            </div>
            <div className="mt-6">
              <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="w-full h-14">
                <defs>
                  <linearGradient id="hsparkFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="white" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="white" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path d={sparkPath.area} fill="url(#hsparkFill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }} />
                <motion.path
                  d={sparkPath.line} fill="none" stroke="white" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.25 }}
                />
              </svg>
            </div>
          </div>
          <div className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full bg-white/20 blur-3xl animate-float" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full bg-flame/40 blur-3xl animate-float" style={{ animationDelay: "-3s" }} />
        </motion.section>

        {/* Utilization ring */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.04, ease: APPLE_EASE }}
          className="col-span-6 lg:col-span-4 glass-card rounded-3xl p-6 flex flex-col"
        >
          <header className="flex items-center justify-between mb-2">
            <span className="chip">Utilization</span>
            <span className="text-[oklch(0.55_0.15_145)] dark:text-[oklch(0.82_0.16_150)] text-[11px] font-semibold flex items-center gap-1">
              <TrendingUp className="size-3" /> +5%
            </span>
          </header>
          <div className="flex-1 grid place-items-center py-3">
            <Ring value={78} label="of target" />
          </div>
          <p className="text-[11px] text-muted-foreground text-center">31 of 40 billable hours</p>
        </motion.section>

        {/* Pipeline */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08, ease: APPLE_EASE }}
          className="col-span-12 sm:col-span-6 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="size-[18px]" strokeWidth={1.75} />
              <span className="chip">Pipeline</span>
            </div>
          </header>
          <p className="font-display text-5xl tracking-tight tabular-nums leading-none">$45k</p>
          <p className="text-[11px] text-muted-foreground mt-1">3 active proposals</p>
          <ul className="mt-4 space-y-2">
            {[
              { name: "Cedar add-on", v: "$18k", stage: "Sent" },
              { name: "Luma expansion", v: "$22k", stage: "Drafting" },
              { name: "New inquiry", v: "$5k", stage: "Discovery" },
            ].map((p) => (
              <li key={p.name} className="flex items-center justify-between text-[12px]">
                <span className="truncate">{p.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-muted-foreground text-[10px] uppercase tracking-wider">{p.stage}</span>
                  <span className="font-medium tabular-nums">{p.v}</span>
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Outstanding */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12, ease: APPLE_EASE }}
          className="col-span-12 sm:col-span-6 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center gap-2 mb-3">
            <CreditCard className="size-[18px]" strokeWidth={1.75} />
            <span className="chip">Outstanding</span>
          </header>
          <p className="font-display text-5xl tracking-tight tabular-nums leading-none">$4.2k</p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px]">
            <Flame className="size-3 text-flame" strokeWidth={2.5} />
            <span className="text-flame font-medium">1 invoice 7 days overdue</span>
          </div>
          <button className="mt-4 w-full text-left rounded-xl bg-muted/60 hover:bg-muted transition p-3 group">
            <p className="text-sm font-medium">Brightline Legal · $4,200</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Clock className="size-3" /> Reminder ready to send <ArrowUpRight className="size-3 ml-auto group-hover:translate-x-0.5 transition" />
            </p>
          </button>
        </motion.section>

        {/* Weekly hours stacked bars */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-7 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">This week's hours</h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-flame" /> Client</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-sky" /> Internal</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-violet" /> Admin</span>
            </div>
          </header>
          <div className="flex items-end gap-3 h-40">
            {weekHours.map((d, i) => {
              const total = d.hours.reduce((s, h) => s + h.v, 0);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col-reverse rounded-lg overflow-hidden" style={{ height: `${(total / maxHours) * 100}%` }}>
                    {d.hours.map((h, j) => (
                      <motion.div
                        key={j}
                        initial={{ height: 0 }}
                        animate={{ height: `${(h.v / total) * 100}%` }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.05 + j * 0.03, ease: APPLE_EASE }}
                        className={cn(toneBg[h.tone as keyof typeof toneBg])}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">{d.day}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground italic">31h logged · 7h more than last week</p>
        </motion.section>

        {/* Top clients */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2, ease: APPLE_EASE }}
          className="col-span-12 lg:col-span-5 glass-card rounded-3xl p-6"
        >
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-[18px]" strokeWidth={1.75} />
              <h3 className="font-semibold tracking-tight">Top clients</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">May</span>
          </header>
          <ul className="space-y-3">
            {topClients.map((c, i) => (
              <li key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="size-5 rounded-md grid place-items-center text-[10px] font-bold tabular-nums bg-muted text-muted-foreground border border-border/60">
                      {i + 1}
                    </span>
                    <span className="font-medium truncate">{c.name}</span>
                  </div>
                  <span className="tabular-nums font-medium">${(c.value / 1000).toFixed(1)}k</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${c.share}%` }}
                    transition={{ duration: 1, delay: 0.25 + i * 0.05, ease: APPLE_EASE }}
                    className="h-full rounded-full"
                    style={{ backgroundImage: "var(--gradient-aurora)" }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* Client pulse — wide footer */}
        <motion.section
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.24, ease: APPLE_EASE }}
          className="col-span-12 rounded-3xl bg-[color-mix(in_oklab,var(--muted)_70%,transparent)] border border-border/50 p-6 lg:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        >
          <div className="flex -space-x-2 shrink-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={`h${i}`} className="size-7 rounded-full bg-[oklch(0.65_0.18_145)] ring-2 ring-background" />
            ))}
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={`a${i}`} className="size-7 rounded-full bg-[oklch(0.78_0.16_75)] ring-2 ring-background" />
            ))}
            <span className="size-7 rounded-full bg-[oklch(0.6_0.22_28)] ring-2 ring-background" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-medium">Client pulse</p>
            <p className="font-display text-xl sm:text-2xl tracking-tight leading-tight mt-1">
              9 active organizations. <span className="text-muted-foreground italic">One requires immediate review.</span>
            </p>
            <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
              <span><span className="text-foreground font-medium">6</span> healthy</span>
              <span><span className="text-foreground font-medium">2</span> needs attention</span>
              <span><span className="text-foreground font-medium">1</span> at risk</span>
            </div>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 transition shrink-0">
            View orgs <ArrowUpRight className="size-4" strokeWidth={2.25} />
          </button>
        </motion.section>
      </div>
    </motion.div>
  );
}
