import { SidebarInset, SiteHeader, Skeleton } from "@repo/ui";

export default function BridgeMessagesLoading() {
  return (
    <SidebarInset>
      <SiteHeader />
      <div className="flex flex-1 h-[calc(100vh-var(--header-height)-var(--spacing)*8)]">
        {/* Conversation List Skeleton */}
        <div className="w-full md:w-[320px] shrink-0 border-r flex flex-col">
          {/* Search skeleton */}
          <div className="p-4 border-b">
            <Skeleton className="h-9 w-full rounded-md" />
          </div>

          {/* Conversation items skeleton */}
          <div className="flex-1 overflow-hidden">
            <div className="space-y-1 p-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Message Thread Skeleton (hidden on mobile) */}
        <div className="hidden md:flex flex-1 flex-col">
          {/* Header skeleton */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          {/* Messages skeleton */}
          <div className="flex-1 p-4 space-y-4">
            {/* Left-aligned message */}
            <div className="flex items-end gap-2 max-w-[60%]">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-16 w-48 rounded-2xl rounded-bl-sm" />
            </div>

            {/* Right-aligned message */}
            <div className="flex items-end gap-2 max-w-[60%] ml-auto flex-row-reverse">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-12 w-36 rounded-2xl rounded-br-sm" />
            </div>

            {/* Left-aligned message */}
            <div className="flex items-end gap-2 max-w-[60%]">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <Skeleton className="h-20 w-56 rounded-2xl rounded-bl-sm" />
            </div>
          </div>

          {/* Composer skeleton */}
          <div className="border-t p-4">
            <div className="flex gap-2 items-end">
              <Skeleton className="flex-1 h-11 rounded-md" />
              <Skeleton className="size-10 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
