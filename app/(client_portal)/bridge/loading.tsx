import { Skeleton } from "@repo/ui";

/**
 * Bridge loading skeleton
 * Simple centered loading state that works with or without sidebar context
 */
export default function BridgeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
