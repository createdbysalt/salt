"use client";

import { Activity, Signal } from "lucide-react";
import { cn } from "@repo/utils";
import type { HealthFactor } from "@/app/_lib/health/core";
import { bandLabelClass, normalizeHealthFactors } from "@/app/_lib/health/display";
import { WhyThisScoreSection } from "@/app/_lib/health/WhyThisScoreSection";
import type { WorkDetailViewModel } from "@/app/_features/work/types";

interface LegacyFactor {
  factor: string;
  impact: number;
  reason: string;
}

function isLegacyFactor(factor: unknown): factor is LegacyFactor {
  return (
    typeof factor === "object" &&
    factor !== null &&
    "impact" in factor &&
    "factor" in factor
  );
}

function isV2Factor(factor: unknown): factor is HealthFactor {
  return (
    typeof factor === "object" &&
    factor !== null &&
    "direction" in factor &&
    "label" in factor
  );
}

function normalizeFactors(
  factors: unknown[],
  status?: string,
) {
  if (factors.length === 0) {
    return normalizeHealthFactors([], {
      label: "Delivery status",
      detail: status ?? "Active",
      tone: "good",
    });
  }

  const mapped = factors.map((factor) => {
    if (isV2Factor(factor)) {
      return {
        key: factor.key,
        label: factor.label,
        subScore: factor.subScore,
        weight: factor.weight,
        direction: factor.direction,
        detail: factor.detail,
      } satisfies HealthFactor;
    }
    if (isLegacyFactor(factor)) {
      return {
        key: factor.factor,
        label: factor.factor,
        subScore: factor.impact < 0 ? 25 : 90,
        weight: 1,
        direction:
          factor.impact < 0
            ? factor.impact <= -15
              ? ("negative" as const)
              : ("neutral" as const)
            : ("positive" as const),
        detail: factor.reason,
      } satisfies HealthFactor;
    }
    return {
      key: "unknown",
      label: "Unknown factor",
      subScore: 50,
      weight: 1,
      direction: "neutral" as const,
      detail: undefined,
    } satisfies HealthFactor;
  });

  return normalizeHealthFactors(mapped);
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

  const normalizedFactors = normalizeFactors(health.factors, work.status);
  const displayLabel =
    "label" in health && typeof health.label === "string"
      ? health.label
      : "Work health";

  return (
    <section className="glass-card rounded-3xl p-6 lg:p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-[18px]" strokeWidth={1.75} />
          <span className="chip">{displayLabel}</span>
        </div>
      </header>

      <div className="flex flex-col items-center gap-5">
        <div className="grid place-items-center">
          <HealthRing value={health.score} />
          <p className={cn("mt-2 text-sm font-semibold", bandLabelClass(health.band))}>
            {health.band}
          </p>
        </div>

        <WhyThisScoreSection factors={normalizedFactors} />
      </div>
    </section>
  );
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
