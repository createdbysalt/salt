"use client";

import { cn } from "@repo/utils";
import { TONE_DOT, type DisplayFactor } from "./display";

export function WhyThisScoreSection({ factors }: { factors: DisplayFactor[] }) {
  if (factors.length === 0) return null;

  return (
    <div className="w-full border-t border-border/60 pt-5">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Why this score
      </p>
      <ul className="space-y-2.5">
        {factors.map((factor, idx) => (
          <li key={`${factor.label}-${idx}`} className="flex items-start gap-2.5">
            <span
              className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", TONE_DOT[factor.tone])}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight text-foreground">{factor.label}</p>
              {factor.detail ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{factor.detail}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
