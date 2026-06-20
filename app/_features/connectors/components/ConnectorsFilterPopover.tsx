"use client";

import * as React from "react";
import { LayoutGrid, SlidersHorizontal, Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  getCatalogCategories,
  type ConnectorCategory,
  type ConnectorTab,
} from "@/app/_features/connectors";

const VIEW_FILTERS: { id: ConnectorTab; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "all", label: "All" },
  { id: "connected", label: "Connected" },
  { id: "available", label: "Available" },
];

function categoryLabel(category: ConnectorCategory): string {
  switch (category) {
    case "recommended":
      return "Recommended";
    case "productivity":
      return "Productivity";
    case "scheduling":
      return "Scheduling";
    case "files":
      return "Files";
    case "meetings":
      return "Meetings";
    case "payments":
      return "Payments";
    default:
      return category;
  }
}

type Props = {
  tab: ConnectorTab;
  onTabChange: (tab: ConnectorTab) => void;
  category: ConnectorCategory | "all";
  onCategoryChange: (category: ConnectorCategory | "all") => void;
};

export function ConnectorsFilterPopover({
  tab,
  onTabChange,
  category,
  onCategoryChange,
}: Props) {
  const activeCount =
    (tab !== "discover" ? 1 : 0) + (category !== "all" ? 1 : 0);

  const categoryFilters: { id: ConnectorCategory | "all"; label: string }[] = [
    { id: "all", label: "All categories" },
    ...getCatalogCategories().map((item) => ({
      id: item,
      label: categoryLabel(item),
    })),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-all",
            activeCount > 0
              ? "border-foreground bg-foreground text-background"
              : "border-border/60 bg-card text-foreground/80 hover:border-border",
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          Filter
          {activeCount > 0 && (
            <span className="rounded-md bg-background/20 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-4 rounded-2xl border-border/60 p-4">
        <PopoverSection icon={Sparkles} label="View">
          {VIEW_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              active={tab === option.id}
              onClick={() => onTabChange(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </PopoverSection>
        <PopoverSection icon={LayoutGrid} label="Category">
          {categoryFilters.map((option) => (
            <FilterChip
              key={option.id}
              active={category === option.id}
              onClick={() => onCategoryChange(option.id)}
            >
              {option.label}
            </FilterChip>
          ))}
        </PopoverSection>
      </PopoverContent>
    </Popover>
  );
}

function PopoverSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Sparkles;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={2} />
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[12px] font-medium transition-all",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border/60 bg-card text-foreground/80 hover:border-border",
      )}
    >
      {children}
    </button>
  );
}
