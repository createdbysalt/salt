import { Skeleton } from "@repo/ui";

export default function SettingsLoading() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-background px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-10 size-72 rounded-full bg-[color:var(--sky)]/15 blur-3xl" />
        <div className="absolute right-0 top-32 size-80 rounded-full bg-[color:var(--flame)]/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="ring-soft mb-8 rounded-3xl bg-card/80 px-6 py-7 shadow-[var(--shadow-card)]">
          <Skeleton className="mb-3 h-3 w-20 rounded-full" />
          <Skeleton className="mb-3 h-9 w-48 rounded-full" />
          <Skeleton className="h-4 w-full max-w-md rounded-full" />
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28 rounded-full" />
            <div className="ring-soft rounded-3xl border border-border/70 bg-card/80 p-1 shadow-[var(--shadow-card)]">
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-2xl px-5 py-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 rounded-full" />
                      <Skeleton className="h-3 w-56 rounded-full" />
                    </div>
                    <Skeleton className="h-9 w-24 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Skeleton className="h-3 w-24 rounded-full" />
            <div className="ring-soft rounded-3xl border border-border/70 bg-card/80 p-6 shadow-[var(--shadow-card)]">
              <Skeleton className="mb-4 h-5 w-40 rounded-full" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-full" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
