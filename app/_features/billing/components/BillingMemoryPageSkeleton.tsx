import { Skeleton } from "@repo/ui";
import { memoryListShellClass } from "@/app/_features/memory/utils/memory-layout";

function BillingTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="flex flex-col gap-3 border-b border-border/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-9 w-full max-w-sm rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="border-b border-border/60 px-4 py-3">
        <div className="grid grid-cols-[2rem_1.4fr_1fr_1fr_0.8fr_0.8fr_0.8fr] gap-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="border-b border-border/60 px-4 py-4 last:border-b-0">
          <div className="grid items-center gap-4 lg:grid-cols-[2rem_1.4fr_1fr_1fr_0.8fr_0.8fr_0.8fr]">
            <Skeleton className="size-4 rounded" />
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 shrink-0 rounded-xl" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BillingMemoryPageSkeleton() {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />

      <div className={memoryListShellClass}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-52" />
            <Skeleton className="h-4 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-full" />
          </div>
        </div>

        <div className="inline-flex rounded-full border border-border/60 bg-card p-1">
          <Skeleton className="h-8 w-28 rounded-full bg-foreground/20" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <BillingTableSkeleton />
      </div>
    </div>
  );
}
