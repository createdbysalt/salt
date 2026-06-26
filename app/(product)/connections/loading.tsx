import { Skeleton } from "@repo/ui";

export default function ConnectionsLoading() {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />
      <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-10">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-20 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <Skeleton className="min-h-[640px] h-[calc(100vh-420px)] w-full rounded-2xl" />
      </div>
    </div>
  );
}
