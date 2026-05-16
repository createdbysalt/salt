"use client";

import * as React from "react";
import {
  Sparkles,
  Palette,
  Type,
  Square,
  Component as ComponentIcon,
  Zap,
  Network,
  PanelsTopLeft,
  Layers,
} from "lucide-react";
import { cn } from "@repo/utils";
import "./salt-v2.css";
import { ColorsSection } from "./sections/colors";
import { TypographySection } from "./sections/typography";
import { TokensSection } from "./sections/tokens";
import { MotionSection } from "./sections/motion";
import { ComponentsSection } from "./sections/components";
import { InsightsSection } from "./sections/insights";
import { PatternsSection } from "./sections/patterns";
import { OverviewSection } from "./sections/overview";

type Tab =
  | "overview"
  | "colors"
  | "typography"
  | "tokens"
  | "motion"
  | "components"
  | "insights"
  | "patterns";

const TABS: Array<{
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    icon: Sparkles,
    description: "Start here",
  },
  { id: "colors", label: "Colors", icon: Palette, description: "Palette + semantic tokens" },
  {
    id: "typography",
    label: "Typography",
    icon: Type,
    description: "Scale, weights, tracking",
  },
  { id: "tokens", label: "Tokens", icon: Square, description: "Spacing, radius, shadow" },
  { id: "motion", label: "Motion", icon: Zap, description: "Easings + durations" },
  {
    id: "components",
    label: "Components",
    icon: ComponentIcon,
    description: "Primitives showcase",
  },
  {
    id: "insights",
    label: "Insight Cards",
    icon: Network,
    description: "Floating notifications",
  },
  {
    id: "patterns",
    label: "Patterns",
    icon: PanelsTopLeft,
    description: "Composed surfaces",
  },
];

export function DesignSystemSandbox() {
  const [tab, setTab] = React.useState<Tab>("overview");

  return (
    <div
      data-salt-system="v2"
      className="flex h-screen overflow-hidden bg-background text-foreground"
    >
      {/* Left rail */}
      <aside className="w-60 shrink-0 border-r border-border p-4 overflow-y-auto">
        <div className="mb-5">
          <p className="salt-eyebrow mb-2">SALT · v2</p>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex items-center justify-center size-6 rounded-sm bg-primary text-primary-foreground">
              <Layers className="size-3.5" />
            </div>
            <span className="text-sm font-semibold">Design System</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Editorial restraint + operator density. Sandbox scope only —
            tokens won't leak to product.
          </p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "group flex items-start gap-2 px-2.5 py-2 rounded-sm text-left transition-colors duration-100",
                  active
                    ? "bg-foreground text-background"
                    : "text-foreground/75 hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon
                  className={cn(
                    "size-3.5 mt-0.5 shrink-0",
                    active ? "text-background/80" : "text-muted-foreground/70"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{t.label}</p>
                  <p
                    className={cn(
                      "text-[10px] leading-snug",
                      active
                        ? "text-background/60"
                        : "text-muted-foreground/60"
                    )}
                  >
                    {t.description}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-10 py-16">
          {tab === "overview" && <OverviewSection />}
          {tab === "colors" && <ColorsSection />}
          {tab === "typography" && <TypographySection />}
          {tab === "tokens" && <TokensSection />}
          {tab === "motion" && <MotionSection />}
          {tab === "components" && <ComponentsSection />}
          {tab === "insights" && <InsightsSection />}
          {tab === "patterns" && <PatternsSection />}
        </div>
      </main>
    </div>
  );
}
