import { Suspense } from "react";
import { getTenantContext } from "@/app/_lib/tenancy";
import { getPendingCaptures, getCaptureStream, getTodayCaptureStats, hasCaptures } from "@/app/_features/capture/queries";
import { CapturePage } from "@/app/_features/capture/components/CapturePage";
import { CapturePageSkeleton } from "@/app/_features/capture/components/CapturePageSkeleton";

async function CapturePageWithData() {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;
  if (!workspaceId) {
    return <CapturePage pendingCaptures={[]} streamCaptures={[]} stats={null} hasRealData={false} />;
  }

  const [pendingCaptures, streamCaptures, stats, hasData] = await Promise.all([
    getPendingCaptures(workspaceId, { limit: 50 }),
    getCaptureStream(workspaceId, { limit: 100 }),
    getTodayCaptureStats(workspaceId),
    hasCaptures(workspaceId),
  ]);

  return (
    <CapturePage
      pendingCaptures={pendingCaptures}
      streamCaptures={streamCaptures}
      stats={stats}
      hasRealData={hasData}
    />
  );
}

export default function CaptureRoute() {
  return (
    <Suspense fallback={<CapturePageSkeleton />}>
      <CapturePageWithData />
    </Suspense>
  );
}
