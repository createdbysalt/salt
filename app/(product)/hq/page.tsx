import { getTodaysBriefing } from "@/app/_features/hq/briefing/queries";
import { HqDashboardView } from "@/app/_features/hq/components/HqDashboardView";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import {
  getHqBriefingData,
  listHqNeedsYouCards,
} from "@/app/_features/hq/queries";

export default async function HqPage() {
  const [briefing, dailyBriefing, queueCards, sideRail] = await Promise.all([
    getHqBriefingData(),
    getTodaysBriefing(),
    listHqNeedsYouCards(),
    loadHqSideRailData(),
  ]);

  return (
    <HqDashboardView
      briefing={briefing}
      dailyBriefing={dailyBriefing}
      queueCards={queueCards}
      sideRail={sideRail}
    />
  );
}
