import { Skeleton } from "@repo/ui"

export default function BridgeSettingsLoading() {
  return (
    <div className="flex flex-1 flex-col p-6 md:p-10">
      <div className="mx-auto w-full max-w-2xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  )
}
