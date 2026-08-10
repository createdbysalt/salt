/**
 * Client-side numbered pagination for Memory → Activity.
 *
 * Mirrors the Sources → Activity model (page + pageSize with clamping) but
 * runs over the already-loaded lanes — Watching/Handled volumes are bounded
 * server-side, so a second fetch layer would buy nothing. Kept JSX-free so
 * it stays unit-testable; `components/ActivityPagination.tsx` renders on top.
 */

export const MEMORY_ACTIVITY_PAGE_SIZES = [10, 20, 50] as const;
export type MemoryActivityPageSize =
  (typeof MEMORY_ACTIVITY_PAGE_SIZES)[number];
export const DEFAULT_MEMORY_ACTIVITY_PAGE_SIZE: MemoryActivityPageSize = 20;

export interface ActivityPageSlice<T> {
  pageItems: T[];
  /** Clamped page actually served (filters may shrink the set). */
  page: number;
  totalPages: number;
  totalCount: number;
}

export function paginateItems<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): ActivityPageSlice<T> {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (clampedPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    page: clampedPage,
    totalPages,
    totalCount,
  };
}
