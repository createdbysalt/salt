"use client";

import { Button } from "@/app/_components/ui/button";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Error boundary for Branding page
 * Provides recovery options without full page reload
 */
export default function BrandingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>

      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md mb-6">
        We couldn&apos;t load your branding settings. This might be a temporary issue.
      </p>

      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="text-xs text-destructive bg-destructive/5 rounded-lg p-4 mb-6 max-w-md overflow-auto">
          {error.message}
        </pre>
      )}

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/serve">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Serve
          </Link>
        </Button>
        <Button onClick={reset}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
