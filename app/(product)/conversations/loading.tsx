import { Skeleton } from "@repo/ui";

export default function ConversationsLoading() {
  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100dvh-4rem-1.25rem)] min-h-0 flex-col lg:-mx-10 lg:-mt-8 lg:h-[calc(100dvh-4rem-2rem)]">
      <div className="flex h-full min-h-0 overflow-hidden bg-card">
        <aside className="hidden h-full w-[300px] shrink-0 flex-col border-r border-border/60 bg-muted/40 lg:flex">
          <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 px-4 pb-3 pt-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-9 w-full rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex-1 space-y-0 p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border-b border-border/40 px-4 py-3">
                <div className="flex gap-2.5">
                  <Skeleton className="size-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-4 py-3">
            <Skeleton className="size-9 rounded-full lg:hidden" />
            <Skeleton className="size-9 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex-1 space-y-4 p-4">
            <Skeleton className="mx-auto h-3 w-24" />
            <Skeleton className="ml-auto h-16 w-[70%] rounded-2xl" />
            <Skeleton className="mr-auto h-12 w-[65%] rounded-2xl" />
            <Skeleton className="mx-auto h-3 w-24" />
            <Skeleton className="mr-auto h-20 w-[75%] rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
