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
import { mapQueuePlayForUi } from "@/app/_features/plays/utils/map-queue-play";

export default async function PlaysRoute() {
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
