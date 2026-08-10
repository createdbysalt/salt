import { Skeleton } from "@repo/ui";

function HqTabsSkeleton() {
  return (
    <div className="-mx-1 max-w-full overflow-x-auto pb-0.5">
      <div className="inline-flex min-w-max items-center rounded-full border border-border/60 bg-muted/70 p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:border-border dark:bg-background/60">
        <Skeleton className="h-9 w-24 rounded-full bg-card" />
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
    </div>
  );
}

function BriefingHeroSkeleton() {
  return (
    <section className="surface-aurora relative overflow-hidden rounded-3xl p-6 text-white lg:p-8">
      <div className="relative z-10 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-28 rounded-full bg-white/20" />
          <Skeleton className="h-7 w-36 rounded-full bg-white/20" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 w-full max-w-2xl bg-white/20 lg:h-16" />
          <Skeleton className="h-5 w-full max-w-xl bg-white/20" />
          <Skeleton className="h-5 w-2/3 bg-white/20" />
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Skeleton className="h-10 w-32 rounded-full bg-white/20" />
          <Skeleton className="h-10 w-28 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="pointer-events-none absolute -top-12 -right-12 size-64 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 size-56 rounded-full bg-flame/30 blur-3xl" />
    </section>
  );
}

function PlayQueueSkeleton() {
  return (
    <section className="glass-card rounded-3xl p-5 lg:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-border/50 bg-card/70 p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SideRailSkeleton() {
  return (
    <aside className="space-y-4">
      <section className="glass-card rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="glass-card rounded-3xl p-5">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </section>
    </aside>
  );
}

export default function HqLoading() {
  return (
    <div className="relative min-h-full">
      <div className="mx-auto w-full max-w-[1400px]">
        <HqTabsSkeleton />

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px] lg:gap-6">
          <div className="min-w-0 space-y-6">
            <BriefingHeroSkeleton />
            <PlayQueueSkeleton />
          </div>
          <div className="min-w-0">
            <SideRailSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
