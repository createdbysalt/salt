"use client";

import type { ReactNode } from "react";
import { Badge, Checkbox } from "@repo/ui";
import { X } from "lucide-react";
import { cn } from "@repo/utils";
import type { QueueSectionFilter } from "../utils/queue-section";

export type QueueTab = "needs_you" | "auto_handled" | "learning";

export type QueueItemKindFilter = "finding" | "prepared_play";

export type QueueFiltersState = {
  sections: QueueSectionFilter[];
  itemKinds: QueueItemKindFilter[];
};

export const EMPTY_QUEUE_FILTERS: QueueFiltersState = {
  sections: [],
  itemKinds: [],
};

export type QueueSectionOption = {
  id: QueueSectionFilter;
  label: string;
  count: number;
};

export type QueueItemKindOption = {
  id: QueueItemKindFilter;
  label: string;
  count: number;
};

const filterSectionLabelClass =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

const checkboxClassName = "rounded-[4px]";

export const QUEUE_ITEM_KIND_LABELS: Record<QueueItemKindFilter, string> = {
  finding: "Scan signals",
  prepared_play: "Prepared plays",
};

const PANEL_COPY: Record<QueueTab, { title: string; description: string }> = {
  needs_you: {
    title: "Filter queue",
    description: "Combine section and item type filters",
  },
  auto_handled: {
    title: "Filter auto-handled",
    description: "Filter by playbook section",
  },
  learning: {
    title: "Filter watching",
    description: "Filter by playbook section",
  },
};

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

export function countQueueFilters(state: QueueFiltersState, tab: QueueTab): number {
  let count = state.sections.length;
  if (tab === "needs_you") {
    count += state.itemKinds.length;
  }
  return count;
}

export function matchesItemKindFilter(
  kinds: QueueItemKindFilter[],
  kind: QueueItemKindFilter,
): boolean {
  return kinds.length === 0 || kinds.includes(kind);
}

type QueueFilterPanelProps = {
  tab: QueueTab;
  state: QueueFiltersState;
  onChange: (state: QueueFiltersState) => void;
  sectionOptions: QueueSectionOption[];
  itemKindOptions?: QueueItemKindOption[];
};

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

export function QueueFilterPanel({
  tab,
  state,
  onChange,
  sectionOptions,
  itemKindOptions = [],
}: QueueFilterPanelProps) {
  const activeCount = countQueueFilters(state, tab);
  const copy = PANEL_COPY[tab];

  function updateSections(section: QueueSectionFilter, checked: boolean) {
    onChange({
      ...state,
      sections: toggleValue(state.sections, section, checked),
    });
  }

  function updateItemKinds(kind: QueueItemKindFilter, checked: boolean) {
    onChange({
      ...state,
      itemKinds: toggleValue(state.itemKinds, kind, checked),
    });
  }

  function clearAll() {
    onChange(EMPTY_QUEUE_FILTERS);
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
        {sectionOptions.length > 0 ? (
          <FilterSection label="Section" bordered={tab === "needs_you" && itemKindOptions.length > 0}>
            {sectionOptions.map((option) => {
              const checked = state.sections.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) => updateSections(option.id, value === true)}
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

        {tab === "needs_you" && itemKindOptions.length > 0 ? (
          <FilterSection label="Item type" bordered={false}>
            {itemKindOptions.map((option) => {
              const checked = state.itemKinds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) => updateItemKinds(option.id, value === true)}
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

type QueueActiveFilterBadgesProps = {
  tab: QueueTab;
  state: QueueFiltersState;
  onChange: (state: QueueFiltersState) => void;
  sectionLabels: Record<QueueSectionFilter, string>;
};

export function QueueActiveFilterBadges({
  tab,
  state,
  onChange,
  sectionLabels,
}: QueueActiveFilterBadgesProps) {
  const activeCount = countQueueFilters(state, tab);
  if (activeCount === 0) return null;

  function removeSection(section: QueueSectionFilter) {
    onChange({
      ...state,
      sections: state.sections.filter((item) => item !== section),
    });
  }

  function removeItemKind(kind: QueueItemKindFilter) {
    onChange({
      ...state,
      itemKinds: state.itemKinds.filter((item) => item !== kind),
    });
  }

  function clearAll() {
    onChange(EMPTY_QUEUE_FILTERS);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.sections.map((section) => (
        <Badge
          key={`section-${section}`}
          variant="secondary"
          className="h-7 cursor-pointer gap-1 rounded-full px-2.5 text-xs font-medium hover:bg-secondary/80"
          onClick={() => removeSection(section)}
        >
          {sectionLabels[section]}
          <X className="size-3" />
        </Badge>
      ))}

      {tab === "needs_you" &&
        state.itemKinds.map((kind) => (
          <Badge
            key={`kind-${kind}`}
            variant="secondary"
            className="h-7 cursor-pointer gap-1 rounded-full px-2.5 text-xs font-medium hover:bg-secondary/80"
            onClick={() => removeItemKind(kind)}
          >
            {QUEUE_ITEM_KIND_LABELS[kind]}
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
