"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Activity, Signal } from "lucide-react";
import type { Org } from "@/app/_lib/demo/orgs-demo-data";
import { relativeDays, formatMoney, peopleAtOrg } from "@/app/_lib/demo/orgs-demo-data";
import type { OrgHealthResult } from "@/app/_features/orgs/types";
import { bandDisplayLabel } from "@/app/_lib/health/core";
import {
  bandLabelClass,
  normalizeHealthFactors,
  TONE_TEXT,
  type DisplayFactor,
  type FactorTone,
} from "@/app/_lib/health/display";
import { WhyThisScoreSection } from "@/app/_lib/health/WhyThisScoreSection";
import { cn } from "@repo/utils";

const APPLE_EASE = [0.32, 0.72, 0, 1] as const;

function computeDemoHealth(org: Org): {
  score: number;
  label: string;
  trend: number;
  factors: DisplayFactor[];
} {
  const base = org.metrics.health === "good" ? 88 : org.metrics.health === "watch" ? 58 : 32;
  const label = org.metrics.health === "good" ? "Healthy" : org.metrics.health === "watch" ? "Watch" : "At risk";
  const factors: DisplayFactor[] = [];
  const days = Math.max(0, Math.round((Date.now() - new Date(org.lastContactAt).getTime()) / 86400000));
  if (days <= 7) {
    factors.push({ label: "Recent contact", detail: `Last touch ${relativeDays(org.lastContactAt)}`, tone: "good" });
  } else if (days <= 21) {
    factors.push({ label: "Going quiet", detail: `No reply in ${days} days`, tone: "watch" });
  } else {
    factors.push({ label: "Long silence", detail: `${days} days since last touch`, tone: "risk" });
  }
  if (org.metrics.outstandingCents > 0) {
    factors.push({
      label: "Open balance",
      detail: `${formatMoney(org.metrics.outstandingCents)} outstanding`,
      tone: "watch",
    });
  } else {
    factors.push({ label: "Invoices clear", detail: "Nothing overdue", tone: "good" });
  }
  const contacts = peopleAtOrg(org.id);
  if (contacts.length >= 2) {
    factors.push({ label: "Contact coverage", detail: `${contacts.length} people linked`, tone: "good" });
  } else if (contacts.length === 1) {
    factors.push({ label: "Single contact", detail: "Only one person linked", tone: "watch" });
  }
  const trend = org.metrics.health === "good" ? 4 : org.metrics.health === "watch" ? -3 : -8;
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
  };
}

function healthBandToTone(band: OrgHealthResult["band"]): FactorTone {
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
          stroke="url(#orgHealthRingGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${C}` }}
          animate={{ strokeDasharray: `${(value / 100) * C} ${C}` }}
          transition={{ duration: 1.1, ease: APPLE_EASE, delay: 0.2 }}
        />
        <defs>
          <linearGradient id="orgHealthRingGrad" x1="0" y1="0" x2="1" y2="1">
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

export function OrgHealthCard({
  org,
  health = null,
  useDemoHealth = false,
}: {
  org: Org;
  health?: OrgHealthResult | null;
  useDemoHealth?: boolean;
}) {
  const insufficient = !useDemoHealth && (health == null || health.band === "insufficient");

  if (insufficient) {
    return (
      <section className="glass-card rounded-3xl p-6 lg:p-7">
        <header className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="size-[18px]" strokeWidth={1.75} />
            <span className="chip">{health?.label ?? "Account health"}</span>
          </div>
        </header>
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <Signal className="mx-auto mb-3 size-5 text-muted-foreground" strokeWidth={1.75} />
          <p className="text-sm font-medium text-foreground">Not enough signal yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Salt is still learning this account. Health will appear after linked contacts, work, or
            billing activity.
          </p>
        </div>
      </section>
    );
  }

  const demo = useDemoHealth ? computeDemoHealth(org) : null;
  const score = demo?.score ?? health?.score ?? 0;
  const headerLabel = demo ? "Account health" : (health?.label ?? "Account health");
  const bandLabel = demo?.label ?? (health ? bandDisplayLabel(health.band) : "Watch");
  const bandClass = demo
    ? TONE_TEXT[org.metrics.health as FactorTone]
    : bandLabelClass(health?.band ?? "watch");
  const factors =
    demo?.factors ??
    normalizeHealthFactors(health?.factors ?? [], {
      label: headerLabel,
      detail: "Scored from account signals",
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
