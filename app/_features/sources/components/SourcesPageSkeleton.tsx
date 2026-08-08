"use client";

import { Skeleton } from "@repo/ui";
import type { SourcesTab } from "../sources-tab-routing";

export function SourcesPageSkeleton({
  tab = "connectors",
}: {
  tab?: SourcesTab;
}) {
  return (
    <div className="relative min-h-full">
      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <SourcesTabBarSkeleton />
        {tab === "activity" ? <SourcesActivitySkeleton /> : <SourcesConnectorsSkeleton />}
      </div>
    </div>
  );
}

function SourcesTabBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-1">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>
    </div>
  );
}

function SourcesConnectorsSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <Skeleton className="hidden h-96 rounded-2xl lg:block" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </>
  );
}

function SourcesActivitySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-10 w-full max-w-2xl rounded-full" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}
