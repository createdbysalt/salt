import { Skeleton } from "@repo/ui";

export default function ConversationsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-12 py-8">
      {/* PageBanner skeleton — matches hero size */}
      <div className="mb-6">
        {/* Eyebrow */}
        <Skeleton className="h-3 w-36 mb-3" />
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-9 w-28" />
        </div>
        {/* Subtitle */}
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-6 mb-6 border-b border-border pb-3">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-none border border-border bg-card p-4">
            <div className="flex gap-3">
              <Skeleton className="size-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-sm" />
                </div>
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-20 w-full rounded-sm" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-16 rounded-sm" />
                  <Skeleton className="h-8 w-20 rounded-sm" />
                  <Skeleton className="h-8 w-32 rounded-sm ml-auto" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
