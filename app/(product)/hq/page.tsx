import { HqDashboardView } from "@/app/_features/hq/components/HqDashboardView";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import {
  getHqBriefingData,
  listHqQueuePlays,
} from "@/app/_features/hq/queries";

export default async function HqPage() {
  const [briefing, queuePlays, sideRail] = await Promise.all([
    getHqBriefingData(),
    listHqQueuePlays(),
    loadHqSideRailData(),
  ]);

  return (
    <HqDashboardView briefing={briefing} queuePlays={queuePlays} sideRail={sideRail} />
  );
}
