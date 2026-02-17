import { Skeleton } from "@/app/_components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/app/_components/ui/card";

/**
 * Bridge overview loading skeleton
 * Matches the layout of the BridgeOverview component
 */
export default function BridgeLoading() {
  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Project Cards */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Activity Feed */}
      <section className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <Skeleton className="h-8 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-6 flex flex-col items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
