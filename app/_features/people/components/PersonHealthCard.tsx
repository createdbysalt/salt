"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Signal } from "lucide-react";
import type { Person } from "@/app/_lib/demo/people-demo-data";
import { relativeDays, formatMoney } from "@/app/_lib/demo/people-demo-data";
import type { RelationshipHealthResult } from "@/app/_features/people/health/types";
import { bandDisplayLabel } from "@/app/_features/people/health/relationship-health";
import { bandLabelClass, normalizeHealthFactors, TONE_TEXT, type DisplayFactor, type FactorTone } from "@/app/_lib/health/display";
import { WhyThisScoreSection } from "@/app/_lib/health/WhyThisScoreSection";
import { cn } from "@repo/utils";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

function computeDemoHealth(person: Person): {
  score: number;
  label: string;
  trend: number;
  factors: DisplayFactor[];
  headerLabel: string;
} {
  const base = person.metrics.health === "good" ? 88 : person.metrics.health === "watch" ? 58 : 32;
  const label =
    person.metrics.health === "good" ? "Healthy" : person.metrics.health === "watch" ? "Watch" : "At risk";

  const factors: DisplayFactor[] = [];

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
  return {
    score: base,
    label,
    trend,
    factors: normalizeHealthFactors(
      factors.map((factor, index) => ({
        key: `demo-${index}`,
        label: factor.label,
        subScore: factor.tone === "good" ? 90 : factor.tone === "watch" ? 55 : 25,
        weight: 1,
        direction: factor.tone === "good" ? "positive" : factor.tone === "risk" ? "negative" : "neutral",
        detail: factor.detail,
      })),
    ),
    headerLabel: "Client health",
  };
}

function healthBandToTone(band: RelationshipHealthResult["band"]): FactorTone {
  if (band === "healthy") return "good";
  if (band === "watch") return "watch";
  return "risk";
}

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
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">Score</p>
        </div>
      </div>
    </div>
  );
}

export function PersonHealthCard({
  person,
  health = null,
  useDemoHealth = false,
}: {
  person: Person;
  health?: RelationshipHealthResult | null;
  useDemoHealth?: boolean;
}) {
  const insufficient =
    !useDemoHealth && (health == null || health.band === "insufficient");

  if (insufficient) {
    return (
      <section className="glass-card rounded-3xl p-6 lg:p-7">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-[18px]" strokeWidth={1.75} />
            <span className="chip">{health?.label ?? "Relationship health"}</span>
          </div>
        </header>
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <Signal className="mx-auto mb-3 size-5 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm font-medium text-foreground">Not enough signal yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Salt is still learning this relationship. Health will appear after recent conversations,
            work, or billing activity.
          </p>
        </div>
      </section>
    );
  }

  const demo = useDemoHealth ? computeDemoHealth(person) : null;
  const score = demo?.score ?? health?.score ?? 0;
  const headerLabel = demo?.headerLabel ?? health?.label ?? "Relationship health";
  const bandLabel = demo?.label ?? (health ? bandDisplayLabel(health.band) : "Watch");
  const bandClass = demo
    ? TONE_TEXT[person.metrics.health as FactorTone]
    : bandLabelClass(health?.band ?? "watch");
  const factors =
    demo?.factors ??
    normalizeHealthFactors(health?.factors ?? [], {
      label: headerLabel,
      detail: "Scored from relationship signals",
      tone: healthBandToTone(health?.band ?? "watch"),
    });
  const trend = demo?.trend ?? 0;
  const showTrend = useDemoHealth;
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown;

  return (
    <section className="glass-card rounded-3xl p-6 lg:p-7">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="size-[18px]" strokeWidth={1.75} />
          <span className="chip">{headerLabel}</span>
        </div>
        {showTrend ? (
          <span
            className={cn(
              "flex items-center gap-1 text-[11px] font-semibold",
              trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-flame",
            )}
          >
            <TrendIcon className="size-3" strokeWidth={2.5} /> {trend >= 0 ? "+" : ""}
            {trend}
          </span>
        ) : null}
      </header>

      <div className="flex flex-col items-center gap-5">
        <div className="grid place-items-center">
          <HealthRing value={score} />
          <p className={cn("mt-2 text-sm font-semibold", bandClass)}>{bandLabel}</p>
        </div>

        <WhyThisScoreSection factors={factors} />
      </div>
    </section>
  );
}
