"use client";

import { useMemo, useState } from "react";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { PlaysSearchField } from "@/app/_features/plays/components/PlaysSearchField";
import { ActivityCombinedFilterMenu } from "@/app/_features/plays/components/ActivityCombinedFilterMenu";
import type { ActivityDateRange } from "@/app/_features/plays/components/ActivityDateRangeFilter";
import type { LearningEntityType } from "@/app/_lib/learning";
import {
  FilterStatusPill,
  type FilterStatus,
} from "./FilterStatusPill";
import {
  EMPTY_FILTER_FILTERS,
  FILTER_ENTITY_TYPE_LABELS,
  FILTER_ENTITY_TYPE_ORDER,
  matchesDateRange,
  matchesEntityTypeFilter,
  matchesFilterQuery,
  type FilterEntityTypeOption,
  type FilterFiltersState,
} from "../utils/filter-tab-filters";
import { WatchingSection } from "./WatchingSection";
import { HandledSection } from "./HandledSection";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import type { HandledWrite } from "../queries/handled-items";

/**
 * Memory → Activity — the transparency surface.
 *
 * One pill, two views (P11: Kept out moved to Sources → Activity):
 * - Handled (default): what Salt already applied, with why and one-click rollback.
 * - Watching: what Salt is still gathering confidence on (nudges teach the bar).
 *
 * Toolbar mirrors Sources → Activity: search plus a single combined filter
 * popover (record type / date range), numbered pagination per view.
 */

interface FilterTabProps {
  evidence: GroupedLearningEvidence[];
  handledWrites: HandledWrite[];
  workspaceId: string;
  onUpdate?: () => void;
}

function evidenceSearchTexts(item: GroupedLearningEvidence): string[] {
  return [
    item.entityLabel,
    ...item.fields.flatMap((field) => [
      field.fieldPath.replace(/_/g, " "),
      field.proposedValue,
      field.topReason ?? "",
      ...field.sources.map((source) => source.replace(/_/g, " ")),
    ]),
  ];
}

function writeSearchTexts(write: HandledWrite): string[] {
  return [
    write.entityLabel,
    write.fieldLabel,
    write.oldValue ?? "",
    write.newValue,
    write.evidenceSummary,
  ];
}

export function FilterTab({
  evidence,
  handledWrites,
  workspaceId,
  onUpdate,
}: FilterTabProps) {
  const [status, setStatus] = useState<FilterStatus>("handled");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterFiltersState>(
    EMPTY_FILTER_FILTERS,
  );
  const [dateRange, setDateRange] = useState<ActivityDateRange | null>(null);

  const counts: Record<FilterStatus, number> = {
    watching: evidence.length,
    handled: handledWrites.length,
  };

  const activeFilterCount = filters.entityTypes.length + (dateRange ? 1 : 0);

  const entityTypeOptions: FilterEntityTypeOption[] = useMemo(() => {
    const typeCounts = new Map<LearningEntityType, number>();
    const bump = (type: LearningEntityType) =>
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    if (status === "watching") {
      evidence.forEach((item) => bump(item.entityType));
    } else {
      handledWrites.forEach((write) => bump(write.entityType));
    }
    return FILTER_ENTITY_TYPE_ORDER.filter((type) => typeCounts.has(type)).map(
      (type) => ({
        id: type,
        label: FILTER_ENTITY_TYPE_LABELS[type],
        count: typeCounts.get(type) ?? 0,
      }),
    );
  }, [status, evidence, handledWrites]);

  const filtered = useMemo(() => {
    const entityTypes = filters.entityTypes;
    return {
      evidence: evidence.filter(
        (item) =>
          matchesEntityTypeFilter(entityTypes, item.entityType) &&
          matchesDateRange(dateRange, item.latestAt) &&
          matchesFilterQuery(search, evidenceSearchTexts(item)),
      ),
      writes: handledWrites.filter(
        (write) =>
          matchesEntityTypeFilter(entityTypes, write.entityType) &&
          matchesDateRange(dateRange, write.createdAt) &&
          matchesFilterQuery(search, writeSearchTexts(write)),
      ),
    };
  }, [filters, dateRange, search, evidence, handledWrites]);

  const isNarrowing = search.trim().length > 0 || activeFilterCount > 0;
  const tabHasData =
    status === "watching"
      ? counts.watching > 0
      : counts.handled > 0;
  const filteredEmpty =
    status === "watching"
      ? filtered.evidence.length === 0
      : filtered.writes.length === 0;
  const showNoMatches = isNarrowing && tabHasData && filteredEmpty;

  const clearNarrowing = () => {
    setSearch("");
    setFilters(EMPTY_FILTER_FILTERS);
    setDateRange(null);
  };

  // Filter/search changes restart pagination at page 1 inside the sections.
  const resetKey = JSON.stringify({
    status,
    filters,
    q: search.trim(),
    from: dateRange ? dateRange.from.getTime() : null,
    to: dateRange ? dateRange.to.getTime() : null,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PlaysSectionHeader
          eyebrow="The transparency layer"
          title="Activity"
          description="What Salt is watching and what it handled — with the reasoning behind every call."
        />
        <FilterStatusPill
          active={status}
          onChange={setStatus}
          counts={counts}
        />
      </div>

      <PlaysSearchField
        value={search}
        onChange={setSearch}
        placeholder={
          status === "watching"
            ? "Search what Salt is watching"
            : "Search handled changes"
        }
        layout="toolbar-actions"
        showDisplay={false}
        filterActive={activeFilterCount > 0}
        filterActiveCount={activeFilterCount}
        filterAriaLabel="Filter activity"
        filterTitle=""
        filterContentClassName="w-auto gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
        filterContent={
          <ActivityCombinedFilterMenu
            title={status === "watching" ? "Filter watching" : "Filter handled"}
            facets={[
              {
                id: "record-type",
                label: "Record type",
                options: entityTypeOptions,
                selected: filters.entityTypes,
                onToggle: (id, checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    entityTypes: checked
                      ? [...prev.entityTypes, id as LearningEntityType]
                      : prev.entityTypes.filter((type) => type !== id),
                  })),
              },
            ]}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            onClearAll={() => {
              setFilters(EMPTY_FILTER_FILTERS);
              setDateRange(null);
            }}
          />
        }
      />

      {showNoMatches ? (
        <div className="rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            Nothing matches
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Try a different search, or clear the filters to see everything.
          </p>
          <button
            type="button"
            onClick={clearNarrowing}
            className="mt-4 inline-flex h-8 items-center rounded-lg border border-border/60 px-3 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Clear search &amp; filters
          </button>
        </div>
      ) : status === "watching" ? (
        <WatchingSection
          evidence={filtered.evidence}
          workspaceId={workspaceId}
          onUpdate={onUpdate}
          resetKey={resetKey}
        />
      ) : (
        <HandledSection
          writes={filtered.writes}
          onUpdate={onUpdate}
          resetKey={resetKey}
        />
      )}
    </div>
  );
}
