"use client";

import { useMemo, useState } from "react";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { PlaysSearchField } from "@/app/_features/plays/components/PlaysSearchField";
import type { LearningEntityType } from "@/app/_lib/learning";
import {
  FilterStatusPill,
  type FilterStatus,
} from "./FilterStatusPill";
import {
  FilterActiveFilterBadges,
  FilterFilterPanel,
} from "./FilterFilterMenu";
import {
  countFilterFilters,
  EMPTY_FILTER_FILTERS,
  FILTER_ENTITY_TYPE_LABELS,
  FILTER_ENTITY_TYPE_ORDER,
  FILTER_ITEM_KIND_LABELS,
  matchesEntityTypeFilter,
  matchesFilterQuery,
  matchesKindFilter,
  type FilterEntityTypeOption,
  type FilterFiltersState,
  type FilterItemKindFilter,
  type FilterKindOption,
} from "../utils/filter-tab-filters";
import { WatchingSection } from "./WatchingSection";
import { HandledSection } from "./HandledSection";
import type { GroupedLearningEvidence } from "../queries/learning-evidence";
import type {
  AdmissionDecisions,
  AdmissionItem,
} from "../queries/admission-decisions";
import type { HandledWrite } from "../queries/handled-items";
import type { RecordCandidate } from "../queries/record-candidates";

/**
 * Memory → Activity — the transparency surface.
 *
 * One pill, two views (P11: Kept out moved to Sources → Activity):
 * - Watching: what Salt is still gathering confidence on (nudges teach the bar).
 * - Handled: what Salt already applied, with why and one-click rollback.
 *
 * Layout mirrors the Plays queue: header + status pill on one row, search
 * with an item-type / record-type filter popover underneath.
 */

interface FilterTabProps {
  evidence: GroupedLearningEvidence[];
  admissions: AdmissionDecisions;
  handledWrites: HandledWrite[];
  recordCandidates?: RecordCandidate[];
  workspaceId: string;
  onUpdate?: () => void;
}

function admissionSearchTexts(item: AdmissionItem): string[] {
  return [
    item.title ?? "",
    item.fromLabel ?? "",
    item.sourceType.replace(/_/g, " "),
    item.reason ?? "",
  ];
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
  admissions,
  handledWrites,
  recordCandidates = [],
  workspaceId,
  onUpdate,
}: FilterTabProps) {
  const [status, setStatus] = useState<FilterStatus>("watching");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterFiltersState>(
    EMPTY_FILTER_FILTERS,
  );

  const counts: Record<FilterStatus, number> = {
    watching:
      evidence.length + admissions.candidates.length + recordCandidates.length,
    handled: handledWrites.length + admissions.letIn.length,
  };

  const activeFilterCount = countFilterFilters(filters);

  // Kind options differ per view, so kinds reset on switch; record types
  // are meaningful in both and carry over.
  const handleStatusChange = (next: FilterStatus) => {
    setStatus(next);
    setFilters((prev) => ({ ...prev, kinds: [] }));
  };

  const kindOptions: FilterKindOption[] = useMemo(() => {
    const watching: Array<[FilterItemKindFilter, number]> = [
      ["record_update", evidence.length],
      ["new_record", recordCandidates.length],
      ["new_capture", admissions.candidates.length],
    ];
    const handled: Array<[FilterItemKindFilter, number]> = [
      ["applied_change", handledWrites.length],
      ["let_in", admissions.letIn.length],
    ];
    return (status === "watching" ? watching : handled)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => ({ id, label: FILTER_ITEM_KIND_LABELS[id], count }));
  }, [status, evidence.length, recordCandidates.length, admissions, handledWrites.length]);

  const entityTypeOptions: FilterEntityTypeOption[] = useMemo(() => {
    const typeCounts = new Map<LearningEntityType, number>();
    const bump = (type: LearningEntityType) =>
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    if (status === "watching") {
      evidence.forEach((item) => bump(item.entityType));
      recordCandidates.forEach((item) => bump(item.entityType));
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
  }, [status, evidence, recordCandidates, handledWrites]);

  const filtered = useMemo(() => {
    const kinds = filters.kinds;
    const entityTypes = filters.entityTypes;
    return {
      evidence: evidence.filter(
        (item) =>
          matchesKindFilter(kinds, "record_update") &&
          matchesEntityTypeFilter(entityTypes, item.entityType) &&
          matchesFilterQuery(search, evidenceSearchTexts(item)),
      ),
      recordCandidates: recordCandidates.filter(
        (item) =>
          matchesKindFilter(kinds, "new_record") &&
          matchesEntityTypeFilter(entityTypes, item.entityType) &&
          matchesFilterQuery(search, [item.displayName, item.identifier]),
      ),
      candidates: admissions.candidates.filter(
        (item) =>
          matchesKindFilter(kinds, "new_capture") &&
          matchesEntityTypeFilter(entityTypes, null) &&
          matchesFilterQuery(search, admissionSearchTexts(item)),
      ),
      writes: handledWrites.filter(
        (write) =>
          matchesKindFilter(kinds, "applied_change") &&
          matchesEntityTypeFilter(entityTypes, write.entityType) &&
          matchesFilterQuery(search, writeSearchTexts(write)),
      ),
      letIn: admissions.letIn.filter(
        (item) =>
          matchesKindFilter(kinds, "let_in") &&
          matchesEntityTypeFilter(entityTypes, null) &&
          matchesFilterQuery(search, admissionSearchTexts(item)),
      ),
    };
  }, [filters, search, evidence, recordCandidates, admissions, handledWrites]);

  const isNarrowing = search.trim().length > 0 || activeFilterCount > 0;
  const tabHasData =
    status === "watching"
      ? counts.watching > 0
      : counts.handled > 0;
  const filteredEmpty =
    status === "watching"
      ? filtered.evidence.length +
          filtered.recordCandidates.length +
          filtered.candidates.length ===
        0
      : filtered.writes.length + filtered.letIn.length === 0;
  const showNoMatches = isNarrowing && tabHasData && filteredEmpty;

  const clearNarrowing = () => {
    setSearch("");
    setFilters(EMPTY_FILTER_FILTERS);
  };

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
          onChange={handleStatusChange}
          counts={counts}
        />
      </div>

      <div className="space-y-3">
        <PlaysSearchField
          value={search}
          onChange={setSearch}
          placeholder={
            status === "watching"
              ? "Search what Salt is watching"
              : "Search handled changes"
          }
          filterActive={activeFilterCount > 0}
          filterActiveCount={activeFilterCount}
          filterTitle=""
          filterContentClassName="w-72 gap-0 overflow-hidden rounded-2xl border-border/60 p-0"
          filterContent={
            <FilterFilterPanel
              tab={status}
              state={filters}
              onChange={setFilters}
              kindOptions={kindOptions}
              entityTypeOptions={entityTypeOptions}
            />
          }
        />
        <FilterActiveFilterBadges state={filters} onChange={setFilters} />
      </div>

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
          candidates={filtered.candidates}
          recordCandidates={filtered.recordCandidates}
          workspaceId={workspaceId}
          onUpdate={onUpdate}
        />
      ) : (
        <HandledSection
          writes={filtered.writes}
          letIn={filtered.letIn}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
}
