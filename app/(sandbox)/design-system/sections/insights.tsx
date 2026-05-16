"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowRight,
  X,
  Shield,
  TrendingUp,
  Heart,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@repo/ui";
import { cn } from "@repo/utils";

const AI_COLOR = "#4e58fc";

type InsightKind = "grow" | "protect" | "nurture";

const SAMPLE_INSIGHTS = [
  {
    id: "1",
    kind: "grow" as InsightKind,
    icon: TrendingUp,
    headline: "Beta is ready for a bigger engagement",
    meta: "Brand refresh mentioned 3× · $8k potential",
  },
  {
    id: "2",
    kind: "protect" as InsightKind,
    icon: Shield,
    headline: "Acme renewal needs attention",
    meta: "14 days left · sentiment cooling",
  },
  {
    id: "3",
    kind: "nurture" as InsightKind,
    icon: Heart,
    headline: "Sarah referred 3 clients this year",
    meta: "Last check-in 2 weeks ago",
  },
];

export function InsightsSection() {
  return (
    <div className="space-y-12">
      <header>
        <p className="salt-eyebrow mb-3">Insights</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Subtle suggestions, not loud demands.
        </h1>
        <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
          Insight cards are gentle nudges. They float in quietly, suggest an action,
          and get out of the way. Hover to reveal actions, click to explore.
        </p>
      </header>

      <section>
        <p className="salt-eyebrow mb-3">Insight categories</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Grow, Protect, Nurture — icons do the talking.
        </h2>
        <p className="text-[13px] text-muted-foreground mb-4 max-w-md">
          All insights use neutral styling. Icons differentiate categories, keeping graph relationship colors unambiguous.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["grow", "Grow", TrendingUp, "Expansion opportunities"],
              ["protect", "Protect", Shield, "Needs attention"],
              ["nurture", "Nurture", Heart, "Strengthen connections"],
            ] as const
          ).map(([kind, label, Icon, description]) => {
            const style = kindStyle(kind);
            return (
              <div
                key={kind}
                className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center size-7 rounded-full"
                    style={{ backgroundColor: style.bg, color: style.fg }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-[13px] font-medium">{label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Live preview</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Light, airy, actionable.
        </h2>
        <div className="border border-border bg-card p-6">
          <div className="space-y-2 max-w-md">
            {SAMPLE_INSIGHTS.map((insight, idx) => (
              <InsightRow
                key={insight.id}
                insight={insight}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <p className="salt-eyebrow mb-3">Expanded state</p>
        <h2 className="text-base font-semibold tracking-tight mb-4">
          Click to reveal more context.
        </h2>
        <div className="border border-border bg-card p-6">
          <div className="max-w-md">
            <ExpandedInsight />
          </div>
        </div>
      </section>
    </div>
  );
}

function InsightRow({
  insight,
}: {
  insight: (typeof SAMPLE_INSIGHTS)[number];
}) {
  const Icon = insight.icon;
  const style = kindStyle(insight.kind);
  return (
    <div className="group flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
      <div
        className="flex items-center justify-center size-8 rounded-full shrink-0"
        style={{ backgroundColor: style.bg, color: style.fg }}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-normal leading-tight">
          {insight.headline}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {insight.meta}
        </p>
      </div>
      <button className="text-[11px] text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
        Explore
      </button>
    </div>
  );
}

function ExpandedInsight() {
  const style = kindStyle("protect");
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center size-8 rounded-full shrink-0"
          style={{ backgroundColor: style.bg, color: style.fg }}
        >
          <Shield className="size-3.5" />
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-medium leading-tight">
            Acme renewal needs attention
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            14 days left · $12.5k MRR
          </p>
        </div>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
        Sentiment trending negative in last 3 messages. They asked about a topic you didn't follow up on.
      </p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className="absolute inset-0 ai-gradient-glow-subtle rounded-sm" />
          <button
            type="button"
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-normal bg-card rounded-sm"
            style={{ color: AI_COLOR, margin: "1.5px" }}
          >
            <Zap className="size-3" />
            Draft check-in
          </button>
        </div>
        <button className="px-3 py-1.5 text-[12px] font-normal text-muted-foreground hover:text-foreground transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
}

function kindStyle(_kind: InsightKind): {
  bg: string;
  fg: string;
  hex: string;
} {
  // Monochrome: all insights use neutral styling
  // Icons (TrendingUp, Shield, Heart) differentiate categories
  // This keeps graph relationship colors unambiguous
  return { bg: "#1C191710", fg: "#1C1917", hex: "#1C1917" };
}
