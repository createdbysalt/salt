import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";

/**
 * Bridge projects list loading skeleton
 */
export default function BridgeProjectsLoading() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="h-full">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
