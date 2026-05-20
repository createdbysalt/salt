import { Skeleton } from "@repo/ui";

export default function PlaysLoading() {
  return (
    <div className="w-full px-16 py-8">
      {/* PageBanner skeleton — matches hero size */}
      <div className="mb-6">
        {/* Eyebrow */}
        <Skeleton className="h-3 w-28 mb-3" />
        {/* Title row with action button */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-24 rounded-sm" />
        </div>
        {/* Subtitle */}
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-6 mb-6 border-b border-border pb-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>

      {/* Filter chips skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-7 w-24 rounded-sm" />
        <Skeleton className="h-7 w-28 rounded-sm" />
        <Skeleton className="h-7 w-20 rounded-sm" />
      </div>

      {/* Card skeleton */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {/* Card header */}
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-sm" />
        </div>

        {/* Card content */}
        <div className="space-y-2 py-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[75%]" />
        </div>

        {/* Card actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-8 w-20 rounded-sm" />
          <Skeleton className="h-8 w-16 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
        </div>
      </div>

      {/* Up next skeleton */}
      <div className="mt-6">
        <Skeleton className="h-4 w-16 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
