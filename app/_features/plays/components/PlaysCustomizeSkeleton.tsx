"use client";

import { Skeleton } from "@repo/ui";
import { cn } from "@repo/utils";
import {
  ConnectorsBrowsePaneSkeleton,
  ConnectorsRailSkeleton,
} from "@/app/_features/connectors/components/detail/ConnectorDetailPaneSkeleton";
import { connectorsPaneSurfaceClassName } from "@/app/_features/connectors/components/detail/ConnectorsRail";

export function PlaysCustomizeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading customize">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex gap-1 rounded-full border border-border/60 bg-muted/50 p-1">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <aside className="hidden lg:block">
          <div className="sticky top-4 h-[calc(100vh-14rem)] min-h-64">
            <ConnectorsRailSkeleton />
          </div>
        </aside>
        <div className={cn("min-w-0 p-5 lg:p-6", connectorsPaneSurfaceClassName)}>
          <ConnectorsBrowsePaneSkeleton />
        </div>
      </div>
    </div>
  );
}
