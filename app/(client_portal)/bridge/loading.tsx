import { Skeleton, SidebarInset } from "@repo/ui";

/**
 * Bridge loading skeleton
 * Matches the authenticated layout structure to prevent layout shift
 */
export default function BridgeLoading() {
  return (
    <>
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex w-[calc(var(--spacing)*72)] flex-col border-r bg-sidebar">
        {/* Header */}
        <div className="p-4">
          <Skeleton className="h-6 w-32" />
        </div>
        {/* Nav items */}
        <div className="flex-1 p-4 space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
        {/* User */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      </aside>
      <SidebarInset>
        {/* Header skeleton */}
        <div className="h-12 border-b flex items-center px-4">
          <Skeleton className="h-6 w-6 md:hidden" />
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-4 md:p-6 space-y-6">
          {/* Cards row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          {/* Chart */}
          <Skeleton className="h-64 rounded-xl" />
          {/* Table */}
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </SidebarInset>
    </>
  );
}
