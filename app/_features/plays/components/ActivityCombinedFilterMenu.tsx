"use client";

import { Checkbox } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  ActivityDateRangePanel,
  type ActivityDateRange,
} from "./ActivityDateRangeFilter";

/**
 * Shared combined filter menu for the activity surfaces (Sources → Activity,
 * Plays → Activity, Memory → Activity): one popover holding checkbox facets
 * plus the date-range picker instead of separate toolbar chips.
 *
 * Rendered inside PlaysSearchField's filterContent slot, which supplies the
 * "Filter" button and active-count badge.
 *
 * Layout: checkbox facets in a left column, the date-range picker to their
 * right — wide and short beats a tall narrow column with a squished calendar.
 */

export interface ActivityFilterFacetOption {
  id: string;
  label: string;
  count?: number;
}

export interface ActivityFilterFacet {
  id: string;
  label: string;
  options: ActivityFilterFacetOption[];
  /** Ids of the currently selected options. */
  selected: string[];
  /** Toggle semantics live with the caller (multi-select or single-select). */
  onToggle: (id: string, checked: boolean) => void;
}

interface ActivityCombinedFilterMenuProps {
  /** Popover header when no filters are active, e.g. "Filter captures". */
  title: string;
  facets: ActivityFilterFacet[];
  dateRange: ActivityDateRange | null;
  onDateRangeChange: (range: ActivityDateRange | null) => void;
  onClearAll: () => void;
}

function filterSectionLabelClass(extra?: string) {
  return cn(
    "px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground",
    extra,
  );
}

export function ActivityCombinedFilterMenu({
  title,
  facets,
  dateRange,
  onDateRangeChange,
  onClearAll,
}: ActivityCombinedFilterMenuProps) {
  const activeCount =
    facets.reduce((sum, facet) => sum + facet.selected.length, 0) +
    (dateRange ? 1 : 0);
  const visibleFacets = facets.filter((facet) => facet.options.length > 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3.5 py-2.5">
        <p className="text-xs font-medium text-foreground">
          {activeCount > 0
            ? `${activeCount} filter${activeCount === 1 ? "" : "s"} active`
            : title}
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-foreground/80 transition hover:text-foreground"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row">
        {visibleFacets.length > 0 && (
          <div className="max-h-[min(60vh,420px)] overflow-y-auto py-1 sm:w-52 sm:shrink-0">
            {visibleFacets.map((facet, index) => (
              <div
                key={facet.id}
                className={cn(
                  index < visibleFacets.length - 1 &&
                    "border-b border-border/60",
                  "px-1.5 py-2.5",
                )}
              >
                <p className={filterSectionLabelClass()}>{facet.label}</p>
                <div className="space-y-0.5">
                  {facet.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60"
                    >
                      <Checkbox
                        className="rounded-[4px]"
                        checked={facet.selected.includes(option.id)}
                        onCheckedChange={(value) =>
                          facet.onToggle(option.id, value === true)
                        }
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {option.count !== undefined && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {option.count}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            visibleFacets.length > 0 &&
              "border-t border-border/60 sm:border-l sm:border-t-0",
          )}
        >
          <p className={filterSectionLabelClass("px-3.5 pt-3")}>Date range</p>
          <ActivityDateRangePanel
            value={dateRange}
            onChange={onDateRangeChange}
            compact
          />
        </div>
      </div>
    </div>
  );
}
