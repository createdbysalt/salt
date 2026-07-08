"use client";

import { Skeleton } from "@repo/ui";

export function ConnectorDetailPaneSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading connector">
      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <Skeleton className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>

        <aside className="space-y-4">
          <Skeleton className="h-36 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </aside>
      </div>
    </div>
  );
}

export function ConnectorActivityListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-2" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-xl px-1 py-2">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 max-w-sm" />
            <Skeleton className="h-3 w-4/5 max-w-md" />
          </div>
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ConnectorsBrowsePaneSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading connectors">
      <header className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
      </header>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>
      <div className="space-y-6">
        {Array.from({ length: 2 }, (_, section) => (
          <div key={section} className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, card) => (
                <Skeleton key={card} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectorsRailSkeleton() {
  return (
    <div
      className="flex h-full flex-col gap-3 rounded-xl border border-border/50 bg-card/30 p-3"
      aria-busy="true"
      aria-label="Loading connector list"
    >
      <Skeleton className="h-9 w-full rounded-full" />
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="mt-auto h-4 w-20" />
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
