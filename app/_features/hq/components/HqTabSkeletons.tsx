"use client";

import { Skeleton } from "@repo/ui";

function SkeletonHeader({ titleWidth = "default" }: { titleWidth?: "default" | "wide" }) {
  return (
    <header className="flex items-end justify-between gap-4 px-1 pt-1">
      <div className="min-w-0 space-y-2">
        <Skeleton className={titleWidth === "wide" ? "h-10 w-96 max-w-full lg:h-12" : "h-10 w-72 max-w-full lg:h-12"} />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="hidden h-7 w-32 shrink-0 rounded-full sm:block" />
    </header>
  );
}

function CardHeaderSkeleton({ withMeta = false }: { withMeta?: boolean }) {
  return (
    <header className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="size-[18px] rounded-md" />
        <Skeleton className="h-4 w-28" />
      </div>
      {withMeta ? <Skeleton className="h-4 w-16" /> : null}
    </header>
  );
}

function ListRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="-mx-2 divide-y divide-border/40">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-2 py-3">
          <Skeleton className="size-2 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-12 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function StatsTabSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonHeader titleWidth="wide" />

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <section className="surface-aurora relative col-span-12 overflow-hidden rounded-3xl p-6 lg:col-span-8 lg:p-8">
          <div className="relative z-10">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-32 rounded-full bg-white/20" />
              <Skeleton className="h-7 w-36 rounded-full bg-white/20" />
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <Skeleton className="h-16 w-64 rounded-2xl bg-white/20 lg:h-20" />
              <div className="space-y-2 pb-2">
                <Skeleton className="h-3 w-24 bg-white/20" />
                <Skeleton className="h-8 w-20 bg-white/20" />
              </div>
            </div>
            <Skeleton className="mt-6 h-14 w-full rounded-2xl bg-white/20" />
          </div>
          <div className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full bg-flame/30 blur-3xl" />
        </section>

        <section className="glass-card col-span-6 rounded-3xl p-6 lg:col-span-4">
          <Skeleton className="mb-4 h-6 w-24 rounded-full" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 sm:col-span-6">
          <CardHeaderSkeleton />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="mt-2 h-3 w-40" />
          <ListRowsSkeleton rows={2} />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 sm:col-span-6">
          <CardHeaderSkeleton />
          <Skeleton className="h-12 w-32" />
          <Skeleton className="mt-3 h-4 w-48" />
          <Skeleton className="mt-4 h-16 w-full rounded-xl" />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-7">
          <CardHeaderSkeleton />
          <Skeleton className="h-24 w-full rounded-xl" />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-5">
          <CardHeaderSkeleton withMeta />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="col-span-12 flex flex-col items-start gap-5 rounded-3xl border border-border/50 bg-[color-mix(in_oklab,var(--muted)_70%,transparent)] p-6 sm:flex-row sm:items-center lg:p-7">
          <div className="flex shrink-0 -space-x-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="size-7 rounded-full ring-2 ring-background" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-full max-w-xl" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-28 shrink-0 rounded-full" />
        </section>
      </div>
    </div>
  );
}

function MiniCalendarSkeleton() {
  return (
    <div className="w-full">
      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="mx-auto h-3 w-3" />
        ))}
      </div>
      <div className="space-y-0.5">
        {Array.from({ length: 5 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-9 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UpcomingTabSkeleton() {
  return (
    <div className="space-y-5">
      <SkeletonHeader />

      <div className="grid auto-rows-[minmax(0,auto)] grid-cols-12 gap-4 lg:gap-5">
        <section className="glass-card col-span-12 rounded-3xl p-5 lg:col-span-5 lg:row-start-1">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
          <MiniCalendarSkeleton />
        </section>

        <section className="glass-card col-span-12 flex flex-col rounded-3xl p-6 lg:col-span-7 lg:row-span-2 lg:row-start-1">
          <header className="mb-5 flex items-center justify-between border-b border-border/50 pb-4">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-40" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </header>
          <div className="-mx-2 divide-y divide-border/40">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[64px_1fr] gap-3 px-2 py-3">
                <div className="space-y-2 pt-0.5">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-7 w-8" />
                </div>
                <ListRowsSkeleton rows={1} />
              </div>
            ))}
          </div>
        </section>

        <section className="surface-aurora relative col-span-12 overflow-hidden rounded-3xl p-6 lg:col-span-5 lg:row-start-2">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-full bg-white/20" />
              <Skeleton className="h-7 w-20 rounded-full bg-white/20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-56 bg-white/20" />
              <Skeleton className="h-4 w-full bg-white/20" />
              <Skeleton className="h-4 w-2/3 bg-white/20" />
            </div>
          </div>
          <div className="pointer-events-none absolute -top-10 -right-10 size-48 rounded-full bg-white/20 blur-3xl" />
        </section>

        <section className="glass-card col-span-12 flex flex-col rounded-3xl p-6 lg:col-span-8 lg:row-span-2">
          <CardHeaderSkeleton withMeta />
          <ListRowsSkeleton rows={4} />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-4">
          <CardHeaderSkeleton />
          <ListRowsSkeleton rows={3} />
        </section>

        <section className="glass-card col-span-12 rounded-3xl p-6 lg:col-span-4">
          <CardHeaderSkeleton />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="size-8 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-9 w-full rounded-xl" />
        </section>
      </div>
    </div>
  );
}
