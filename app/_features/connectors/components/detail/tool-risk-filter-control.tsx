"use client";

import { cn } from "@repo/utils";
import { TOOL_RISK_FILTERS, type ToolRiskFilter } from "./tool-risk-filter";

export interface ToolRiskFilterCounts {
  all: number;
  read: number;
  write: number;
}

interface ToolRiskFilterControlProps {
  value: ToolRiskFilter;
  onChange: (value: ToolRiskFilter) => void;
  counts: ToolRiskFilterCounts;
}

export function ToolRiskFilterControl({
  value,
  onChange,
  counts,
}: ToolRiskFilterControlProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter tools by permission type"
      className="inline-flex shrink-0 items-center gap-0.5 self-stretch sm:self-auto"
    >
      {TOOL_RISK_FILTERS.map((option) => {
        const active = value === option.value;
        const count = counts[option.value];

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <span>{option.label}</span>
            <span
              className={cn(
                "tabular-nums text-[11px]",
                active ? "text-muted-foreground" : "text-muted-foreground/70",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export {
  buildToolEmptyMessage,
  buildToolPermissionsSummary,
  buildToolSearchSummary,
  shouldShowToolSection,
  type ToolRiskFilter,
} from "./tool-risk-filter";
