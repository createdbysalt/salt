"use client";

import { Popover, PopoverContent, PopoverTrigger, Checkbox, Badge } from "@repo/ui";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@repo/utils";
import type { PlaybookOriginType } from "../playbooks/queries-v2";
import type { PlaybookSection } from "./PlaybookSectionNav";

export type PlaybookLayerFilter = "learn" | "act";

export type PlaybookSectionFilter = Exclude<PlaybookSection, "all">;

/** User-facing source bucket. Maps detailed origin types into Salt vs yours. */
export type PlaybookSourceFilter = "salt" | "yours";

const SALT_ORIGINS: PlaybookOriginType[] = ["salt_system", "salt_template"];
const YOURS_ORIGINS: PlaybookOriginType[] = ["salt_custom", "custom"];

export function getPlaybookSource(origin: PlaybookOriginType): PlaybookSourceFilter {
  return YOURS_ORIGINS.includes(origin) ? "yours" : "salt";
}

export type PlaybookFiltersState = {
  sections: PlaybookSectionFilter[];
  layers: PlaybookLayerFilter[];
  sources: PlaybookSourceFilter[];
};

export type PlaybookFilterSectionOption = {
  id: PlaybookSectionFilter;
  label: string;
  count: number;
};

export type PlaybookFilterLayerOption = {
  id: PlaybookLayerFilter;
  label: string;
};

export type PlaybookFilterSourceOption = {
  id: PlaybookSourceFilter;
  label: string;
  count: number;
};

export const PLAYBOOK_SOURCE_LABELS: Record<PlaybookSourceFilter, string> = {
  salt: "Salt built-in",
  yours: "Yours",
};

export function isSaltPlaybookOrigin(origin: PlaybookOriginType): boolean {
  return SALT_ORIGINS.includes(origin);
}

export function isYoursPlaybookOrigin(origin: PlaybookOriginType): boolean {
  return YOURS_ORIGINS.includes(origin);
}

const filterSectionLabelClass =
  "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground";

const checkboxClassName = "rounded-[4px]";

export function countPlaybookFilters(state: PlaybookFiltersState): number {
  return state.sections.length + state.layers.length + state.sources.length;
}

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  if (checked) {
    return values.includes(value) ? values : [...values, value];
  }
  return values.filter((item) => item !== value);
}

type PlaybookFilterPanelProps = {
  state: PlaybookFiltersState;
  onChange: (state: PlaybookFiltersState) => void;
  sectionOptions: PlaybookFilterSectionOption[];
  layerOptions: PlaybookFilterLayerOption[];
  sourceOptions: PlaybookFilterSourceOption[];
};

export function PlaybookFilterPanel({
  state,
  onChange,
  sectionOptions,
  layerOptions,
  sourceOptions,
}: PlaybookFilterPanelProps) {
  const activeCount = countPlaybookFilters(state);

  function updateSections(section: PlaybookSectionFilter, checked: boolean) {
    onChange({
      ...state,
      sections: toggleValue(state.sections, section, checked),
    });
  }

  function updateLayers(layer: PlaybookLayerFilter, checked: boolean) {
    onChange({
      ...state,
      layers: toggleValue(state.layers, layer, checked),
    });
  }

  function updateSources(source: PlaybookSourceFilter, checked: boolean) {
    onChange({
      ...state,
      sources: toggleValue(state.sources, source, checked),
    });
  }

  function clearAll() {
    onChange({ sections: [], layers: [], sources: [] });
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
            className="text-xs font-medium text-foreground/80 hover:text-foreground transition"
          >
            Clear all
          </button>
        </div>
      ) : (
        <div className="border-b border-border/60 px-3 py-2.5">
          <p className="text-xs font-medium text-foreground">Filter playbooks</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Combine section, type, and source filters
          </p>
        </div>
      )}

      <div className="max-h-[min(52vh,420px)] overflow-y-auto">
        <div className="border-b border-border/60 p-2">
          <p className={filterSectionLabelClass}>Section</p>
          <div className="mt-1 space-y-0.5">
            {sectionOptions.map((option) => {
              const checked = state.sections.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) =>
                      updateSections(option.id, value === true)
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-b border-border/60 p-2">
          <p className={filterSectionLabelClass}>Type</p>
          <div className="mt-1 space-y-0.5">
            {layerOptions.map((option) => {
              const checked = state.layers.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) =>
                      updateLayers(option.id, value === true)
                    }
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="p-2">
          <p className={filterSectionLabelClass}>Source</p>
          <div className="mt-1 space-y-0.5">
            {sourceOptions.map((option) => {
              const checked = state.sources.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-muted/60 cursor-pointer text-sm"
                >
                  <Checkbox
                    className={checkboxClassName}
                    checked={checked}
                    onCheckedChange={(value) =>
                      updateSources(option.id, value === true)
                    }
                  />
                  <span className="min-w-0 flex-1">{option.label}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {option.count}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

type PlaybookFilterMenuProps = PlaybookFilterPanelProps & {
  triggerClassName?: string;
};

export function PlaybookFilterMenu({
  state,
  onChange,
  sectionOptions,
  layerOptions,
  sourceOptions,
  triggerClassName,
}: PlaybookFilterMenuProps) {
  const activeCount = countPlaybookFilters(state);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter playbooks"
          className={cn(
            "absolute right-1 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-foreground",
            activeCount > 0 && "bg-muted/70 text-foreground",
            triggerClassName
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={2} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 gap-0 overflow-hidden p-0"
      >
        <PlaybookFilterPanel
          state={state}
          onChange={onChange}
          sectionOptions={sectionOptions}
          layerOptions={layerOptions}
          sourceOptions={sourceOptions}
        />
      </PopoverContent>
    </Popover>
  );
}

type PlaybookActiveFilterBadgesProps = {
  state: PlaybookFiltersState;
  onChange: (state: PlaybookFiltersState) => void;
  sectionLabels: Record<PlaybookSectionFilter, string>;
  layerLabels: Record<PlaybookLayerFilter, string>;
  sourceLabels?: Record<PlaybookSourceFilter, string>;
};

export function PlaybookActiveFilterBadges({
  state,
  onChange,
  sectionLabels,
  layerLabels,
  sourceLabels = PLAYBOOK_SOURCE_LABELS,
}: PlaybookActiveFilterBadgesProps) {
  const activeCount = countPlaybookFilters(state);
  if (activeCount === 0) return null;

  function removeSection(section: PlaybookSectionFilter) {
    onChange({
      ...state,
      sections: state.sections.filter((item) => item !== section),
    });
  }

  function removeLayer(layer: PlaybookLayerFilter) {
    onChange({
      ...state,
      layers: state.layers.filter((item) => item !== layer),
    });
  }

  function removeSource(source: PlaybookSourceFilter) {
    onChange({
      ...state,
      sources: state.sources.filter((item) => item !== source),
    });
  }

  function clearAll() {
    onChange({ sections: [], layers: [], sources: [] });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state.sections.map((section) => (
        <Badge
          key={`section-${section}`}
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => removeSection(section)}
        >
          {sectionLabels[section]}
          <X className="size-3" />
        </Badge>
      ))}

      {state.layers.map((layer) => (
        <Badge
          key={`layer-${layer}`}
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => removeLayer(layer)}
        >
          {layerLabels[layer]}
          <X className="size-3" />
        </Badge>
      ))}

      {state.sources.map((source) => (
        <Badge
          key={`source-${source}`}
          variant="secondary"
          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium cursor-pointer hover:bg-secondary/80"
          onClick={() => removeSource(source)}
        >
          {sourceLabels[source]}
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
