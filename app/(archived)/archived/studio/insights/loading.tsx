import { Skeleton } from "@/app/_components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 border rounded-lg space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="p-6 border rounded-lg space-y-4">
            <Skeleton className="h-6 w-32" />
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-16 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
