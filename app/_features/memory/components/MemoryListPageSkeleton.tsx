import { Skeleton } from "@repo/ui";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";

export function MemoryListPageSkeleton() {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />
      <div className={memoryListShellClass}>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full max-w-md rounded-full" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-3">
            <Skeleton className="h-4 w-full" />
          </div>
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-3 border-b border-border/60 px-4 py-4 last:border-b-0"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
