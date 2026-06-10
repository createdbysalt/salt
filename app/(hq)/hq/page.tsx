import { HqDashboardView } from "@/app/_features/hq/components/HqDashboardView";
import {
  getHqBriefingData,
  listHqQueuePlays,
} from "@/app/_features/hq/queries";

export default async function HqPage() {
  const [briefing, queuePlays] = await Promise.all([
    getHqBriefingData(),
    listHqQueuePlays(),
  ]);

  return (
    <HqDashboardView briefing={briefing} queuePlays={queuePlays} />
  );
}
