import { Suspense } from "react";
import {
  listActivityEntries,
  listQueuedPlayRuns,
  listPlaybookBlueprints,
  listPlayTemplates,
} from "@/app/_features/plays/queries";
import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  getCaptureStream,
  getTodayCaptureStats,
  hasCaptures,
} from "@/app/_features/capture/queries";
import {
  listQueueFindings,
  countFindingsByState,
} from "@/app/_features/capture/queries/intelligence-findings";
import { getTenantContext } from "@/app/_lib/tenancy";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { PlaysPageSkeleton } from "@/app/_features/plays/components/PlaysPageSkeleton";
import { mapQueuePlayForUi } from "@/app/_features/plays/utils/map-queue-play";

async function PlaysPageWithData() {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const [
    queueViews,
    activityRows,
    connectors,
    needsYouFindings,
    findingCounts,
    streamCaptures,
    captureStats,
    hasCaptureData,
    blueprints,
    adoptedTemplates,
  ] = await Promise.all([
    listQueuedPlayRuns(),
    listActivityEntries(),
    getConnectorsPageData(),
    listQueueFindings("needs_you"),
    countFindingsByState(),
    workspaceId
      ? getCaptureStream(workspaceId, { limit: 100 })
      : Promise.resolve([]),
    workspaceId ? getTodayCaptureStats(workspaceId) : Promise.resolve(null),
    workspaceId ? hasCaptures(workspaceId) : Promise.resolve(false),
    listPlaybookBlueprints(),
    listPlayTemplates(),
  ]);

  return (
    <PlaysPageClient
      initialQueue={queueViews.map(mapQueuePlayForUi)}
      initialActivity={activityRows}
      connectors={connectors}
      initialFindings={needsYouFindings}
      findingCounts={findingCounts}
      streamCaptures={streamCaptures}
      captureStats={captureStats}
      hasCaptureData={hasCaptureData}
      blueprints={blueprints}
      adoptedTemplates={adoptedTemplates}
    />
  );
}

export default function PlaysRoute() {
  return (
    <Suspense fallback={<PlaysPageSkeleton />}>
      <PlaysPageWithData />
    </Suspense>
  );
}
