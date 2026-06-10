"use client";

import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@repo/utils";
import type { Path } from "@/app/_lib/demo/connections-paths-data";

export function PathRow({ path }: { path: Path }) {
  return (
    <article className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 hover:border-border transition flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-display text-base leading-snug tracking-tight text-foreground">
            {path.headline}
          </h4>
          {path.hopCount ? (
            <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {path.hopCount} hop{path.hopCount === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
      </header>

      <ol className="space-y-1.5">
        {path.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-1 size-1.5 rounded-full bg-foreground/40 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-foreground leading-snug">{s.label}</p>
              <p className="text-xs text-muted-foreground leading-snug">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-sm text-muted-foreground leading-relaxed">
        <span className="text-foreground/80 font-medium">Why it matters · </span>
        {path.whyItMatters}
      </p>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3 text-flame" strokeWidth={2.25} />
            <span className="font-medium text-foreground/70">{path.confidence}</span>
          </span>
          <span aria-hidden>·</span>
          <span className={cn("inline-flex items-center gap-1.5", path.isStale && "text-destructive")}>
            <Clock className="size-3" />
            {path.freshness}
          </span>
        </div>
        <button
          onClick={() => toast.success(path.actionLabel)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:bg-foreground/90 transition"
        >
          {path.actionLabel}
          <ArrowRight className="size-3" strokeWidth={2.5} />
        </button>
      </div>
    </article>
  );
}
