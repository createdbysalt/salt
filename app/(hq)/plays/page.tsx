import { Suspense } from "react";
import {
  listActivityEntries,
  listQueuedPlayRuns,
} from "@/app/_features/plays/queries";
import { getConnectorsPageData } from "@/app/_features/connectors/queries";
import {
  listQueueFindings,
  countFindingsByState,
} from "@/app/_features/capture/queries/intelligence-findings";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { PlaysPageSkeleton } from "@/app/_features/plays/components/PlaysPageSkeleton";
import { mapQueuePlayForUi } from "@/app/_features/plays/utils/map-queue-play";

async function PlaysPageWithData() {
  const [queueViews, activityRows, connectors, needsYouFindings, findingCounts] =
    await Promise.all([
      listQueuedPlayRuns(),
      listActivityEntries(),
      getConnectorsPageData(),
      listQueueFindings("needs_you"),
      countFindingsByState(),
    ]);

  return (
    <PlaysPageClient
      initialQueue={queueViews.map(mapQueuePlayForUi)}
      initialActivity={activityRows}
      connectors={connectors}
      initialFindings={needsYouFindings}
      findingCounts={findingCounts}
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
