import { HqDashboardView } from "@/app/_features/hq/components/HqDashboardView";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import {
  getHqBriefingData,
  listHqNeedsYouCards,
} from "@/app/_features/hq/queries";

export default async function HqPage() {
  const [briefing, queueCards, sideRail] = await Promise.all([
    getHqBriefingData(),
    listHqNeedsYouCards(),
    loadHqSideRailData(),
  ]);

  return (
    <HqDashboardView briefing={briefing} queueCards={queueCards} sideRail={sideRail} />
  );
}
