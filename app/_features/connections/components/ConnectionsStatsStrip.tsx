"use client";

import { useMockContent } from "@/app/_features/shell/contexts/DashboardUserContext";
import { MockContentEmptyState } from "@/app/_features/shell/components/MockContentEmptyState";

type Metric = {
  label: string;
  value: string;
  tone?: "good" | "watch" | "risk";
};

const METRICS: Metric[] = [
  { label: "Total connections", value: "1,284" },
  { label: "New this week", value: "+37", tone: "good" },
  { label: "Strongest cluster", value: "Acme Co" },
  { label: "Hidden bridges", value: "6", tone: "watch" },
  { label: "Dormant 30+ days", value: "21", tone: "risk" },
];

export function ConnectionsStatsStrip() {
  const mockContent = useMockContent();

  if (!mockContent) {
    return (
      <MockContentEmptyState
        className="py-10"
        title="No connection stats yet"
        description="As you add people, orgs, and work, Salt will map relationships here."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px rounded-2xl overflow-hidden border border-border/60 bg-border/60">
      {METRICS.map((m) => (
        <div key={m.label} className="bg-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {m.label}
          </p>
          <p
            className={
              "mt-1 text-2xl font-display tracking-tight tabular-nums " +
              (m.tone === "good"
                ? "text-emerald-600 dark:text-emerald-400"
                : m.tone === "watch"
                  ? "text-flame"
                  : m.tone === "risk"
                    ? "text-destructive"
                    : "text-foreground")
            }
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
