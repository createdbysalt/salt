import { TrendingUp } from "lucide-react";

/**
 * Sales Home - Coming Soon
 */
export default function SalesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <TrendingUp className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Sales</h1>
          <p className="text-muted-foreground max-w-md">
            Pipeline management, proposals, and pitches. Coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
