"use client";

import type { ReactNode } from "react";
import { Search, Settings2, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@repo/ui";
import { cn } from "@repo/utils";

const searchInputClassName =
  "h-9 w-full rounded-full border border-border/60 bg-background pl-10 text-sm outline-none transition hover:border-border focus:ring-4 focus:ring-foreground/5";

export const playsToolbarMenuButtonClass =
  "inline-flex items-center gap-1.5 h-9 shrink-0 rounded-full border border-border/60 bg-card px-3 text-sm text-foreground/80 hover:border-border transition";

type PlaysSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel?: string;
  className?: string;
  layout?: "inline-filter" | "toolbar-actions";
  filterActive?: boolean;
  filterActiveCount?: number;
  filterAriaLabel?: string;
  filterTitle?: string;
  /** When omitted, no filter button/popover is rendered. */
  filterContent?: ReactNode;
  filterContentClassName?: string;
  displayContent?: ReactNode;
  displayContentClassName?: string;
  showDisplay?: boolean;
  /** @deprecated Use layout="toolbar-actions" with displayContent instead. */
  trailingAction?: ReactNode;
};

export function PlaysSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  layout = "inline-filter",
  filterActive = false,
  filterActiveCount,
  filterAriaLabel = "Filter",
  filterTitle = "Filter",
  filterContent,
  filterContentClassName = "w-72 px-4 py-3 rounded-2xl border-border/60",
  displayContent,
  displayContentClassName = "w-56 gap-0 overflow-hidden rounded-2xl border-border/60 p-0",
  showDisplay = true,
  trailingAction,
}: PlaysSearchFieldProps) {
  const useToolbarActions = layout === "toolbar-actions";
  const activeCount = filterActiveCount ?? (filterActive ? 1 : 0);

  const filterPopover = filterContent ? (
    <Popover>
      <PopoverTrigger asChild>
        {useToolbarActions ? (
          <button type="button" className={playsToolbarMenuButtonClass}>
            <SlidersHorizontal className="size-4" strokeWidth={2} />
            Filter
            {activeCount > 0 ? (
              <span className="ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                {activeCount}
              </span>
            ) : null}
          </button>
        ) : (
          <button
            type="button"
            aria-label={filterAriaLabel}
            className={cn(
              "absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
              filterActive && "bg-muted/70 text-foreground",
            )}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className={filterContentClassName}>
        {filterTitle ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {filterTitle}
          </p>
        ) : null}
        <div className="space-y-2">{filterContent}</div>
      </PopoverContent>
    </Popover>
  ) : null;

  const displayButton = (
    <button type="button" className={playsToolbarMenuButtonClass}>
      <Settings2 className="size-4" strokeWidth={2} />
      Display
    </button>
  );

  const displayPopover =
    useToolbarActions && showDisplay ? (
      displayContent ? (
        <Popover>
          <PopoverTrigger asChild>{displayButton}</PopoverTrigger>
          <PopoverContent align="end" className={displayContentClassName}>
            {displayContent}
          </PopoverContent>
        </Popover>
      ) : (
        displayButton
      )
    ) : null;

  const searchField = (
    <div
      className={cn(
        "relative w-full min-w-[280px]",
        useToolbarActions ? "sm:max-w-2xl sm:flex-1" : "max-w-2xl flex-1",
      )}
    >
      <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          searchInputClassName,
          useToolbarActions || !filterContent ? "pr-4" : "pr-11",
        )}
      />
      {!useToolbarActions ? filterPopover : null}
    </div>
  );

  if (useToolbarActions) {
    return (
      <div className={cn("flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", className)}>
        <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
          {searchField}
          <div className="flex items-center gap-2">
            {displayPopover}
            {filterPopover}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      {searchField}
      {trailingAction}
    </div>
  );
}
