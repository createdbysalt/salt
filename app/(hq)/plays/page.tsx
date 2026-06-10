import {
  listActivityEntries,
  listQueuedPlayRuns,
} from "@/app/_features/plays/queries";
import { PlaysPageClient } from "@/app/_features/plays/components/PlaysPageClient";
import { mapQueuePlayForUi } from "@/app/_features/plays/utils/map-queue-play";

export default async function PlaysRoute() {
  const [queueViews, activityRows] = await Promise.all([
    listQueuedPlayRuns(),
    listActivityEntries(),
  ]);

  return (
    <PlaysPageClient
      initialQueue={queueViews.map(mapQueuePlayForUi)}
      initialActivity={activityRows}
    />
  );
}
