"use client";

import React from "react";
import { cn } from "@repo/utils";

export type InvoiceFilter = "all" | "unpaid" | "paid" | "overdue";

type FilterConfig = {
  value: InvoiceFilter;
  label: string;
};

const FILTERS: FilterConfig[] = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

type InvoiceFilterPillsProps = {
  activeFilter: InvoiceFilter;
  onFilterChange: (filter: InvoiceFilter) => void;
  counts: Record<InvoiceFilter, number>;
  className?: string;
};

export function InvoiceFilterPills({
  activeFilter,
  onFilterChange,
  counts,
  className,
}: InvoiceFilterPillsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {FILTERS.map((filter) => {
        const isActive = activeFilter === filter.value;
        const count = counts[filter.value];
        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors border border-transparent",
              isActive
                ? "bg-muted text-foreground border-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {filter.label}
            {count > 0 && (
              <span className="ml-1.5 text-xs tabular-nums opacity-70">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
