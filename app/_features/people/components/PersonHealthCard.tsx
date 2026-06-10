"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { relativeDays, formatMoney } from "@/app/_lib/demo/people-demo-data";
import { cn } from "@repo/utils";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

type Factor = { label: string; detail: string; tone: "good" | "watch" | "risk" };

function computeHealth(person: Person): { score: number; label: string; trend: number; factors: Factor[] } {
  const base = person.metrics.health === "good" ? 88 : person.metrics.health === "watch" ? 58 : 32;
  const label =
    person.metrics.health === "good" ? "Healthy" : person.metrics.health === "watch" ? "Watch" : "At risk";

  const factors: Factor[] = [];

  const days = Math.max(0, Math.round((Date.now() - new Date(person.lastContactAt).getTime()) / 86400000));
  if (days <= 7) {
    factors.push({ label: "Recent contact", detail: `Last spoke ${relativeDays(person.lastContactAt)}`, tone: "good" });
  } else if (days <= 21) {
    factors.push({ label: "Going quiet", detail: `No reply in ${days} days`, tone: "watch" });
  } else {
    factors.push({ label: "Long silence", detail: `${days} days since last touch`, tone: "risk" });
  }

  if (person.metrics.outstandingCents > 0) {
    factors.push({
      label: "Open balance",
      detail: `${formatMoney(person.metrics.outstandingCents)} outstanding`,
      tone: "watch",
    });
  } else {
    factors.push({ label: "Invoices clear", detail: "Nothing overdue", tone: "good" });
  }

  if (person.worthAttention) {
    factors.push({
      label: "Flagged thread",
      detail: person.worthAttention.reason.split(".")[0] ?? person.worthAttention.reason,
      tone: "risk",
    });
  } else if (person.signals.some((s) => s.kind === "renewal_risk")) {
    const s = person.signals.find((sig) => sig.kind === "renewal_risk");
    if (s) factors.push({ label: "Renewal coming", detail: s.label, tone: "watch" });
  }

  if (person.metrics.meetingWithinDays != null && person.metrics.meetingWithinDays <= 7) {
    factors.push({
      label: "Meeting soon",
      detail: `Booked in ${person.metrics.meetingWithinDays}d`,
      tone: "good",
    });
  }

  const trend = person.metrics.health === "good" ? 4 : person.metrics.health === "watch" ? -3 : -8;
  return { score: base, label, trend, factors: factors.slice(0, 4) };
}

const TONE_DOT = {
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

const TONE_TEXT = {
  good: "text-emerald-600 dark:text-emerald-400",
  watch: "text-flame",
  risk: "text-destructive",
};

function HealthRing({ value }: { value: number }) {
  const C = 2 * Math.PI * 28;
  return (
    <div className="relative size-[140px]">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <motion.circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="url(#healthRingGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${(value / 100) * C} ${C}` }}
          transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.2 }}
        />
        <defs>
          <linearGradient id="healthRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.12 175)" />
            <stop offset="100%" stopColor="oklch(0.80 0.16 70)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-4xl tabular-nums leading-none">{value}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Score</p>
        </div>
      </div>
    </div>
  );
}

export function PersonHealthCard({ person }: { person: Person }) {
  const { score, label, trend, factors } = computeHealth(person);
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <section className="glass-card rounded-3xl p-6 lg:p-7">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="size-[18px]" strokeWidth={1.75} />
          <span className="chip">Client health</span>
        </div>
        <span
          className={cn(
            "text-[11px] font-semibold flex items-center gap-1",
            trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-flame"
          )}
        >
          <TrendIcon className="size-3" strokeWidth={2.5} /> {trend >= 0 ? "+" : ""}
          {trend}
        </span>
      </header>

      <div className="flex flex-col items-center gap-5">
        <div className="grid place-items-center">
          <HealthRing value={score} />
          <p className={cn("mt-2 text-sm font-semibold", TONE_TEXT[person.metrics.health])}>{label}</p>
        </div>

        <div className="w-full border-t border-border/60 pt-5">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-3">
            Why this score
          </p>
          <ul className="space-y-2.5">
            {factors.map((f) => (
              <li key={f.label} className="flex items-start gap-2.5">
                <span className={cn("mt-1.5 size-1.5 rounded-full shrink-0", TONE_DOT[f.tone])} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{f.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
