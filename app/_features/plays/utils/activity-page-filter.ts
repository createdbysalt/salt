import type { PlayActivityCategory, PlayRunState } from "../types";
import { activityCategoryForState } from "./map-play-run-to-activity";

/**
 * Pure filtering/pagination for Plays → Activity phase-1 scan rows.
 *
 * The act-layer allowlist (`isActLayerPlayRun`) depends on the filesystem
 * playbook registry, so it cannot be pushed into SQL. Instead the query
 * scans minimal columns for all visible runs, then applies allowlist +
 * user filters + pagination here — which also makes the total count exact
 * for numbered pagination.
 */

export interface ActivityScanRow {
  id: string;
  state: PlayRunState;
  title: string;
  target_label: string | null;
  recipient_label: string | null;
  ran_at: string | null;
  dismissed_at: string | null;
  updated_at: string;
  source_context: {
    source?: string;
    playbook_slug?: string;
    user_approved_at?: string;
  } | null;
}

export interface ActivityPageFilter {
  search?: string;
  categories?: PlayActivityCategory[];
  /** Inclusive range bounds as local `yyyy-mm-dd` dates. */
  dateFrom?: string;
  dateTo?: string;
}

/** Display/sort timestamp: the moment the run became interesting. */
export function activitySortIso(
  row: Pick<ActivityScanRow, "ran_at" | "dismissed_at" | "updated_at">,
): string {
  return row.ran_at ?? row.dismissed_at ?? row.updated_at;
}

function parseLocalDay(value: string, endOfDay: boolean): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function activityMatchesDateRange(
  iso: string,
  dateFrom?: string,
  dateTo?: string,
): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  const fromMs = dateFrom ? parseLocalDay(dateFrom, false) : null;
  const toMs = dateTo ? parseLocalDay(dateTo, true) : null;
  if (fromMs != null && time < fromMs) return false;
  if (toMs != null && time > toMs) return false;
  return true;
}

export function activityMatchesSearch(
  row: Pick<ActivityScanRow, "title" | "target_label" | "recipient_label">,
  term: string,
  playbookName?: string | null,
): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return true;
  return [row.title, row.target_label, row.recipient_label, playbookName]
    .filter((value): value is string => typeof value === "string")
    .some((value) => value.toLowerCase().includes(normalized));
}

/**
 * Applies category, date-range, and search filters, then sorts newest
 * first. `resolvePlaybookName` lets the caller search playbook display
 * names without this module knowing the registry.
 */
export function filterActivityScanRows<T extends ActivityScanRow>(
  rows: T[],
  filter: ActivityPageFilter,
  resolvePlaybookName: (slug: string) => string | null = () => null,
): T[] {
  const categories = filter.categories ?? [];
  return rows
    .filter((row) => {
      if (categories.length > 0) {
        const category = activityCategoryForState(row.state);
        if (!category || !categories.includes(category)) return false;
      }
      if (!activityMatchesDateRange(activitySortIso(row), filter.dateFrom, filter.dateTo)) {
        return false;
      }
      const slug = row.source_context?.playbook_slug;
      const playbookName = slug ? resolvePlaybookName(slug) : null;
      return activityMatchesSearch(row, filter.search ?? "", playbookName);
    })
    .sort((a, b) => activitySortIso(b).localeCompare(activitySortIso(a)));
}

export interface ActivityPageSlice<T> {
  pageRows: T[];
  totalCount: number;
  /** Requested page clamped into the valid range (1-based). */
  page: number;
}

export function paginateActivityRows<T>(
  rows: T[],
  page: number,
  pageSize: number,
): ActivityPageSlice<T> {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    totalCount,
    page: clampedPage,
  };
}
