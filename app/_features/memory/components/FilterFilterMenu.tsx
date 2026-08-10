"use client";

import type { ReactNode } from "react";
import { Badge, Checkbox } from "@repo/ui";
import { X } from "lucide-react";
import { cn } from "@repo/utils";
import type { LearningEntityType } from "@/app/_lib/learning";
import type { FilterStatus } from "./FilterStatusPill";
import {
  countFilterFilters,
  EMPTY_FILTER_FILTERS,
  FILTER_ENTITY_TYPE_LABELS,
  FILTER_ITEM_KIND_LABELS,
  type FilterEntityTypeOption,
  type FilterFiltersState,
  type FilterItemKindFilter,
  type FilterKindOption,
} from "../utils/filter-tab-filters";

/**
 * Memory → Filter toolbar filters — checkbox popover panel and active-filter
 * badges for the Watching / Handled transparency views.
 *
 * Mirrors the Plays QueueFilterMenu pattern; the pure state helpers live in
 * `utils/filter-tab-filters.ts` so they stay unit-testable.
 */

const PANEL_COPY: Record<FilterStatus, { title: string; description: string }> = {
  watching: {
    title: "Filter watching",
    description: "Combine item type and record type filters",
  },
  handled: {
    title: "Filter handled",
    description: "Combine item type and record type filters",
  },
};

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

const filterSectionLabelClass =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

const checkboxClassName = "rounded-[4px]";

function FilterSection({
  label,
  children,
  bordered = true,
}: {
  label: string;
  children: ReactNode;
  bordered?: boolean;
}) {
  return (
    <div className={cn(bordered && "border-b border-border/60", "p-2")}>
      <p className={filterSectionLabelClass}>{label}</p>
      <div className="mt-1 space-y-0.5">{children}</div>
    </div>
  );
}

type FilterFilterPanelProps = {
  tab: FilterStatus;
  state: FilterFiltersState;
  onChange: (state: FilterFiltersState) => void;
  kindOptions: FilterKindOption[];
  entityTypeOptions: FilterEntityTypeOption[];
};

export function FilterFilterPanel({
  tab,
  state,
  onChange,
  kindOptions,
  entityTypeOptions,
}: FilterFilterPanelProps) {
  const activeCount = countFilterFilters(state);
  const copy = PANEL_COPY[tab];

  function updateKinds(kind: FilterItemKindFilter, checked: boolean) {
    onChange({ ...state, kinds: toggleValue(state.kinds, kind, checked) });
  }

  function updateEntityTypes(entityType: LearningEntityType, checked: boolean) {
    onChange({
      ...state,
      entityTypes: toggleValue(state.entityTypes, entityType, checked),
    });
  }

  function clearAll() {
    onChange(EMPTY_FILTER_FILTERS);
  }

  return (
    <div className="flex flex-col">
      {activeCount > 0 ? (
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            {activeCount} filter{activeCount === 1 ? "" : "s"} active
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-medium text-foreground/80 transition hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">{copy.title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{copy.description}</p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        {kindOptions.length > 0 ? (
          <FilterSection label="Item type" bordered={entityTypeOptions.length > 0}>
            {kindOptions.map((option) => {
              const checked = state.kinds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) => updateKinds(option.id, value === true)}
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </label>
              );
            })}
          </FilterSection>
        ) : null}

        {entityTypeOptions.length > 0 ? (
          <FilterSection label="Record type" bordered={false}>
            {entityTypeOptions.map((option) => {
              const checked = state.entityTypes.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) =>
                      updateEntityTypes(option.id, value === true)
                    }
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </label>
              );
            })}
          </FilterSection>
        ) : null}
      </div>
    </div>
  );
}

type FilterActiveFilterBadgesProps = {
  state: FilterFiltersState;
  onChange: (state: FilterFiltersState) => void;
};

export function FilterActiveFilterBadges({
  state,
  onChange,
}: FilterActiveFilterBadgesProps) {
  const activeCount = countFilterFilters(state);
  if (activeCount === 0) return null;

  function removeKind(kind: FilterItemKindFilter) {
    onChange({ ...state, kinds: state.kinds.filter((item) => item !== kind) });
  }

  function removeEntityType(entityType: LearningEntityType) {
    onChange({
      ...state,
      entityTypes: state.entityTypes.filter((item) => item !== entityType),
    });
  }

  function clearAll() {
    onChange(EMPTY_FILTER_FILTERS);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.kinds.map((kind) => (
        <Badge
          key={`kind-${kind}`}
          variant="secondary"
          className="h-7 cursor-pointer gap-1 rounded-full px-2.5 text-xs font-medium hover:bg-secondary/80"
          onClick={() => removeKind(kind)}
        >
          {FILTER_ITEM_KIND_LABELS[kind]}
          <X className="size-3" />
        </Badge>
      ))}

      {state.entityTypes.map((entityType) => (
        <Badge
          key={`entity-${entityType}`}
          variant="secondary"
          className="h-7 cursor-pointer gap-1 rounded-full px-2.5 text-xs font-medium hover:bg-secondary/80"
          onClick={() => removeEntityType(entityType)}
        >
          {FILTER_ENTITY_TYPE_LABELS[entityType]}
          <X className="size-3" />
        </Badge>
      ))}

      <button
        type="button"
        onClick={clearAll}
        className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
