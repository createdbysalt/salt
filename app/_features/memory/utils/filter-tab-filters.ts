import type { LearningEntityType } from "@/app/_lib/learning";

/**
 * Pure filter logic for Memory → Filter (Watching / Handled).
 *
 * Item-kind and record-type filter state plus the search matcher. Kept
 * JSX-free so it stays unit-testable (the Vitest setup has no JSX transform);
 * `components/FilterFilterMenu.tsx` renders the panel and badges on top.
 */

export type WatchingKindFilter = "record_update" | "new_record" | "new_capture";
export type HandledKindFilter = "applied_change" | "let_in";
export type FilterItemKindFilter = WatchingKindFilter | HandledKindFilter;

export type FilterFiltersState = {
  kinds: FilterItemKindFilter[];
  entityTypes: LearningEntityType[];
};

export const EMPTY_FILTER_FILTERS: FilterFiltersState = {
  kinds: [],
  entityTypes: [],
};

export type FilterKindOption = {
  id: FilterItemKindFilter;
  label: string;
  count: number;
};

export type FilterEntityTypeOption = {
  id: LearningEntityType;
  label: string;
  count: number;
};

export const FILTER_ITEM_KIND_LABELS: Record<FilterItemKindFilter, string> = {
  record_update: "Record updates",
  new_record: "New records",
  new_capture: "New captures",
  applied_change: "Applied changes",
  let_in: "Let in",
};

export const FILTER_ENTITY_TYPE_LABELS: Record<LearningEntityType, string> = {
  person: "People",
  organization: "Organizations",
  work: "Projects",
  meeting: "Meetings",
  file: "Files",
  billing: "Billing",
  me: "You",
};

/** Display order for record-type options in the panel. */
export const FILTER_ENTITY_TYPE_ORDER: LearningEntityType[] = [
  "person",
  "organization",
  "work",
  "meeting",
  "file",
  "billing",
  "me",
];

export function countFilterFilters(state: FilterFiltersState): number {
  return state.kinds.length + state.entityTypes.length;
}

export function matchesKindFilter(
  kinds: FilterItemKindFilter[],
  kind: FilterItemKindFilter,
): boolean {
  return kinds.length === 0 || kinds.includes(kind);
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
