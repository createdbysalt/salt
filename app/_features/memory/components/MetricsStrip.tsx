import type { ReactNode } from "react";
import { cn } from "@repo/utils";

export type Metric = {
  label: string;
  value: ReactNode;
  tone?: "default" | "good" | "watch" | "risk";
};

const TONE: Record<NonNullable<Metric["tone"]>, string> = {
  default: "text-foreground",
  good: "text-emerald-600 dark:text-emerald-400",
  watch: "text-flame",
  risk: "text-destructive",
};

export function MetricsStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/60 sm:grid-cols-4">
      {metrics.map((m) => (
        <div key={m.label} className="bg-card p-3 sm:p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {m.label}
          </p>
          <p
            className={cn(
              "mt-1 font-display text-2xl tabular-nums tracking-tight",
              TONE[m.tone ?? "default"]
            )}
          >
            {m.value}
          </p>
        </div>
      ))}
    </div>
  );
}
