"use client";

import { Skeleton } from "@repo/ui";

export function CapturePageSkeleton() {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />
      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-8">
        {/* Tabs skeleton */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1">
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>

        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>

        {/* Queue progress skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* Cards skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-3xl" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
