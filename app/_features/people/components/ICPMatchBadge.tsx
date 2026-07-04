"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui";
import { cn } from "@repo/utils";
import type { ContactICPMatch, ICPMatchSignals } from "@/app/_features/me/types";

type ICPMatchBadgeProps = {
  match: ContactICPMatch;
  onConfirm?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
};

export function ICPMatchBadge({
  match,
  onConfirm,
  onDismiss,
  compact = false,
}: ICPMatchBadgeProps) {
  const [hovering, setHovering] = useState(false);
  const isProposed = match.status === "proposed";
  const isConfirmed = match.status === "confirmed";

  const signalLabels: Record<string, string> = {
    industry: "Industry match",
    budget: "Budget fit",
    engagement: "High engagement",
    outcome: "Successful outcomes",
    response_time: "Fast responder",
    meeting: "Had meetings",
    success: "Project success",
    referral: "Given referrals",
  };

  const formatSignals = (signals: ICPMatchSignals): string[] => {
    return Object.entries(signals)
      .filter(([_, value]) => value && value > 0)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 4)
      .map(([key, value]) => `${signalLabels[key] ?? key}: +${value}pts`);
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-default transition-colors",
                isProposed
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
              )}
            >
              {isProposed ? (
                <Sparkles className="size-2.5" />
              ) : (
                <Check className="size-2.5" />
              )}
              {match.matchScore}%
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{match.icpSegmentName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatSignals(match.matchSignals).join(" · ")}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip open={hovering}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all cursor-default",
              isProposed
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
            )}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
          >
            {isProposed ? (
              <Sparkles className="size-3" />
            ) : (
              <Check className="size-3" />
            )}
            <span>
              ICP: {match.icpSegmentName} ({match.matchScore}%)
            </span>

            {/* Inline actions for proposed matches */}
            {isProposed && onConfirm && onDismiss && (
              <div className="flex items-center gap-0.5 ml-1 border-l border-primary/30 pl-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                  aria-label="Dismiss match"
                >
                  <X className="size-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConfirm();
                  }}
                  className="p-0.5 rounded hover:bg-primary/20 transition-colors"
                  aria-label="Confirm match"
                >
                  <Check className="size-3" />
                </button>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs">
          <div className="space-y-2">
            <div>
              <p className="font-medium text-sm">{match.icpSegmentName}</p>
              <p className="text-xs text-muted-foreground">
                {isProposed ? "Salt thinks this contact matches" : "Confirmed ICP match"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Match signals
              </p>
              <div className="flex flex-wrap gap-1">
                {formatSignals(match.matchSignals).map((signal, i) => (
                  <span
                    key={i}
                    className="rounded bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Render multiple ICP matches stacked */
export function ICPMatchBadges({
  matches,
  onConfirm,
  onDismiss,
  max = 2,
}: {
  matches: ContactICPMatch[];
  onConfirm?: (matchId: string) => void;
  onDismiss?: (matchId: string) => void;
  max?: number;
}) {
  if (matches.length === 0) return null;

  const visible = matches.slice(0, max);
  const overflow = matches.length - max;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((match) => (
        <ICPMatchBadge
          key={match.id}
          match={match}
          onConfirm={onConfirm ? () => onConfirm(match.id) : undefined}
          onDismiss={onDismiss ? () => onDismiss(match.id) : undefined}
          compact={matches.length > 1}
        />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-muted-foreground">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
