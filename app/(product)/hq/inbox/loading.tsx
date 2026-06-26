import { Skeleton } from "@repo/ui";

export default function InboxLoading() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Inbox items skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg border p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
