"use client";

import { Activity, Signal } from "lucide-react";
import { cn } from "@repo/utils";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

type FactorTone = "good" | "watch" | "risk";

const TONE_DOT: Record<FactorTone, string> = {
  good: "bg-emerald-500",
  watch: "bg-flame",
  risk: "bg-destructive",
};

function factorTone(impact: number): FactorTone {
  if (impact < 0) return impact <= -15 ? "risk" : "watch";
  return "good";
}

function bandLabelClass(band: string): string {
  switch (band) {
    case "Healthy":
      return "text-emerald-600 dark:text-emerald-400";
    case "Watch":
      return "text-flame";
    default:
      return "text-destructive";
  }
}

function HealthRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 28;
  return (
    <div className="relative size-[140px]">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90">
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke="url(#workHealthRingGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${(value / 100) * circumference} ${circumference}`}
        />
        <defs>
          <linearGradient id="workHealthRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.46 0.12 175)" />
            <stop offset="100%" stopColor="oklch(0.80 0.16 70)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-4xl leading-none tabular-nums">{value}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Score
          </p>
        </div>
      </div>
    </div>
  );
}

export function WorkHealthCard({ work }: { work: WorkDetailViewModel }) {
  const health = work.health;

  if (!health) {
    return (
      <section className="glass-card rounded-3xl p-6 lg:p-7">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-[18px]" strokeWidth={1.75} />
            <span className="chip">Work health</span>
          </div>
        </header>
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <Signal className="mx-auto mb-3 size-5 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm font-medium text-foreground">Not enough signal yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Salt is still learning this work. Health will appear after the first score refresh.
          </p>
        </div>
      </section>
    );
  }

  const factors =
    health.factors.length > 0
      ? health.factors.map((factor) => ({
          label: factor.factor,
          detail: factor.reason,
          tone: factorTone(factor.impact),
        }))
      : [
          {
            label: "Delivery status",
            detail: work.status,
            tone: "good" as FactorTone,
          },
        ];

  return (
    <section className="glass-card rounded-3xl p-6 lg:p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-[18px]" strokeWidth={1.75} />
          <span className="chip">Work health</span>
        </div>
      </header>

      <div className="flex flex-col items-center gap-5">
        <div className="grid place-items-center">
          <HealthRing value={health.score} />
          <p className={cn("mt-2 text-sm font-semibold", bandLabelClass(health.band))}>
            {health.band}
          </p>
        </div>

        <div className="w-full border-t border-border/60 pt-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Why this score
          </p>
          <ul className="space-y-2.5">
            {factors.map((factor) => (
              <li key={factor.label} className="flex items-start gap-2.5">
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[factor.tone])}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {factor.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{factor.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
