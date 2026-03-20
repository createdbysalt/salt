import { Skeleton } from "@repo/ui";

/**
 * Bridge Inbox Loading State
 *
 * Shows skeleton UI while inbox data is being fetched.
 * Matches the two-column layout of the inbox page.
 */
export default function BridgeInboxLoading() {
  return (
    <div className="flex h-full">
      {/* Sidebar skeleton */}
      <div className="w-[380px] shrink-0 border-r border-[var(--bridge-border-subtle)] bg-[var(--bridge-bg-elevated)]">
        {/* Header */}
        <div className="p-4 space-y-3 border-b border-[var(--bridge-border-subtle)]">
          {/* View toggle */}
          <div className="flex gap-1 p-1 bg-[var(--bridge-bg-surface)] rounded-[var(--bridge-radius-md)]">
            <Skeleton className="flex-1 h-9 rounded-[var(--bridge-radius-sm)]" />
            <Skeleton className="flex-1 h-9 rounded-[var(--bridge-radius-sm)]" />
          </div>
          {/* Search */}
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>

        {/* Item list */}
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-10 rounded-[var(--bridge-radius-md)]" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview panel skeleton */}
      <div className="flex-1 bg-[var(--bridge-bg-surface)] flex flex-col items-center justify-center">
        <Skeleton className="size-16 rounded-full mb-4" />
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}
