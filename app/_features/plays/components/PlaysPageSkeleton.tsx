"use client";

import { Skeleton } from "@repo/ui";
import type { PlaysTab } from "@/app/_features/plays/load-plays-page-data";

export function PlaysPageSkeleton({ tab = "queue" }: { tab?: PlaysTab }) {
  if (tab === "playbooks") {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className="mx-auto w-full max-w-[1400px] space-y-8">
          <PlaysTabBarSkeleton />
          <PlaysPlaybooksSkeleton />
        </div>
      </div>
    );
  }

  if (tab === "activity") {
    return (
      <div className="relative min-h-full">
        <div aria-hidden className="salt-ambient-wash" />
        <div className="mx-auto w-full max-w-[1400px] space-y-8">
          <PlaysTabBarSkeleton />
          <PlaysActivitySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />
      <div className="mx-auto w-full max-w-[1400px] space-y-8">
        <PlaysTabBarSkeleton />
        <PlaysQueueSkeleton />
      </div>
    </div>
  );
}

function PlaysTabBarSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-1">
        <Skeleton className="h-10 w-20 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-20 rounded-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
    </div>
  );
}

function PlaysQueueSkeleton() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </>
  );
}

function PlaysPlaybooksSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl rounded-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  );
}

function PlaysActivitySkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-10 w-full max-w-2xl rounded-full" />
      <Skeleton className="h-56 rounded-3xl" />
    </div>
  );
}
