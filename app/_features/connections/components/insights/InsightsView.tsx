"use client";

import { useMemo, useState } from "react";
import { cn } from "@repo/utils";
import { CATEGORY_META, INSIGHTS, type InsightCategory } from "@/app/_lib/demo/connections-insights-data";
import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";
import { InsightCard } from "./InsightCard";

type Filter = "all" | InsightCategory;
type Sort = "severity" | "freshness" | "confidence";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "risk", label: CATEGORY_META.risk.label },
  { id: "opportunity", label: CATEGORY_META.opportunity.label },
  { id: "missing_context", label: CATEGORY_META.missing_context.label },
  { id: "warm_path", label: CATEGORY_META.warm_path.label },
  { id: "stale", label: CATEGORY_META.stale.label },
];

const SEVERITY_WEIGHT = { high: 3, medium: 2, low: 1 } as const;
const CONFIDENCE_WEIGHT: Record<string, number> = {
  "strong signal": 4,
  "pattern repeated across sources": 3,
  "needs review": 2,
  "based on limited context": 1,
};

export function InsightsView() {
  const mockContent = useMockContent();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("severity");

  const list = useMemo(() => {
    if (!mockContent) return [];
    const filtered = filter === "all" ? INSIGHTS : INSIGHTS.filter((i) => i.category === filter);
    return [...filtered].sort((a, b) => {
      if (sort === "severity") return SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
      if (sort === "confidence")
        return (CONFIDENCE_WEIGHT[b.confidence] ?? 0) - (CONFIDENCE_WEIGHT[a.confidence] ?? 0);
      // freshness: stale last, otherwise leave order (mock)
      return (a.isStale ? 1 : 0) - (b.isStale ? 1 : 0);
    });
  }, [filter, sort, mockContent]);

  if (!mockContent) {
    return (
      <MockContentEmptyState
        title="No connection insights yet"
        description="Salt will surface risks, opportunities, and warm paths as your graph fills in."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Salt · graph reading
          </p>
          <h2 className="font-display text-2xl tracking-tight mt-1">Insights</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Patterns Salt sees across your relationship graph. Each one carries evidence, confidence, and a next step.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wider text-[10px] font-medium">Sort</span>
          {(["severity", "freshness", "confidence"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "px-2.5 py-1 rounded-full border transition capitalize",
                sort === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => {
          const count = f.id === "all" ? INSIGHTS.length : INSIGHTS.filter((i) => i.category === f.id).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card border-border/60 text-muted-foreground hover:text-foreground hover:border-border",
              )}
            >
              {f.label}
              <span className={cn("tabular-nums", active ? "text-background/70" : "text-muted-foreground/70")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {list.map((i) => (
          <InsightCard key={i.id} insight={i} />
        ))}
      </div>
    </div>
  );
}
