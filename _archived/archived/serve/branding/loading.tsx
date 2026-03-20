import { Skeleton } from "@/app/_components/ui/skeleton";

/**
 * Loading skeleton for Branding page
 * Matches the layout: header, tabs, and card sections
 */
export default function BrandingLoading() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>

        {/* Card sections */}
        <div className="space-y-6">
          {/* Logo Card */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-80" />
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-[200px]" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-20 w-[200px]" />
              </div>
            </div>
          </div>

          {/* Favicon Card */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-16 w-16" />
          </div>

          {/* Colors Card */}
          <div className="rounded-lg border p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-10 rounded" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-20 rounded-md" />
            </div>
          </div>

          {/* Footer Card */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex justify-end gap-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
