import { Suspense } from "react";
import { Skeleton } from "@repo/ui";
import { InboxPageClient } from "./InboxPageClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inbox | Salt Core",
  description: "Your unified command center for Strategy, Studio, and Serve",
};

function InboxSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* List skeleton */}
      <div className="space-y-6">
        {/* Group 1 */}
        <div>
          <Skeleton className="h-5 w-24 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>

        {/* Group 2 */}
        <div>
          <Skeleton className="h-5 w-20 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>

        {/* Group 3 */}
        <div>
          <Skeleton className="h-5 w-16 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxPageClient />
    </Suspense>
  );
}
