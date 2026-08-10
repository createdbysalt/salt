"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  getPaginationRange,
} from "@repo/ui";
import { cn } from "@repo/utils";
import {
  MEMORY_ACTIVITY_PAGE_SIZES,
  type MemoryActivityPageSize,
} from "../utils/activity-pagination";

/**
 * Memory → Activity pagination footer — same chrome as Sources → Activity:
 * "Page X of Y · N items", a page-size select, and numbered page links
 * (links appear once there's more than one page).
 */

interface ActivityPaginationProps {
  page: number;
  pageSize: MemoryActivityPageSize;
  totalCount: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: MemoryActivityPageSize) => void;
}

export function ActivityPagination({
  page,
  pageSize,
  totalCount,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: ActivityPaginationProps) {
  if (totalCount === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-between">
      <p className="text-[11px] tabular-nums text-muted-foreground">
        Page {page} of {totalPages} · {totalCount} {itemLabel}
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            onPageSizeChange(Number(value) as MemoryActivityPageSize)
          }
        >
          <SelectTrigger
            aria-label="Rows per page"
            className="h-8 w-[104px] rounded-full border-border/60 text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MEMORY_ACTIVITY_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) onPageChange(page - 1);
                  }}
                  aria-disabled={page <= 1}
                  className={cn(page <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {paginationRange.map((item, index) =>
                typeof item === "number" ? (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href="#"
                      isActive={item === page}
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange(item);
                      }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ) : (
                  <PaginationItem key={`${item}-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < totalPages) onPageChange(page + 1);
                  }}
                  aria-disabled={page >= totalPages}
                  className={cn(
                    page >= totalPages && "pointer-events-none opacity-50",
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
