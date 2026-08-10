import type { LearningEntityType } from "@/app/_lib/learning";

/**
 * Pure filter logic for Memory → Filter (Watching / Handled).
 *
 * Record-type filter state plus the search/date matchers.
 * Kept JSX-free so it stays unit-testable (the Vitest setup has no JSX
 * transform); `components/FilterTab.tsx` renders the filter popover on top.
 */

export type FilterFiltersState = {
  entityTypes: LearningEntityType[];
};

export const EMPTY_FILTER_FILTERS: FilterFiltersState = {
  entityTypes: [],
};

export type FilterEntityTypeOption = {
  id: LearningEntityType;
  label: string;
  count: number;
};

export const FILTER_ENTITY_TYPE_LABELS: Record<LearningEntityType, string> = {
  person: "People",
  organization: "Organizations",
  work: "Projects",
  meeting: "Meetings",
  resource: "Resources",
  billing: "Billing",
  me: "You",
};

/** Display order for record-type options in the panel. */
export const FILTER_ENTITY_TYPE_ORDER: LearningEntityType[] = [
  "person",
  "organization",
  "work",
  "meeting",
  "resource",
  "billing",
  "me",
];

export function countFilterFilters(state: FilterFiltersState): number {
  return state.entityTypes.length;
}

/**
 * Captures (admission items) carry no record type, so an active record-type
 * filter excludes them — strict intersection keeps results predictable.
 */
export function matchesEntityTypeFilter(
  entityTypes: LearningEntityType[],
  entityType: LearningEntityType | null,
): boolean {
  return (
    entityTypes.length === 0 ||
    (entityType !== null && entityTypes.includes(entityType))
  );
}

/** Case-insensitive substring match across an item's searchable text. */
export function matchesFilterQuery(
  query: string,
  texts: Array<string | null | undefined>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return texts.some((text) => text?.toLowerCase().includes(q));
}

/** Inclusive local-day range — same contract as the Sources date filter. */
export interface ActivityLocalDateRange {
  from: Date;
  to: Date;
}

/**
 * Matches an ISO timestamp against an inclusive local-day range. Items
 * without a timestamp are excluded while a range is active (strict
 * intersection, same as the record-type filter).
 */
export function matchesDateRange(
  range: ActivityLocalDateRange | null,
  iso: string | null | undefined,
): boolean {
  if (!range) return true;
  if (!iso) return false;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  const from = new Date(range.from);
  from.setHours(0, 0, 0, 0);
  const to = new Date(range.to);
  to.setHours(23, 59, 59, 999);
  return time >= from.getTime() && time <= to.getTime();
}
