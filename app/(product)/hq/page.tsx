import { HqDashboardView } from "@/app/_features/hq/components/HqDashboardView";
import { loadHqSideRailData } from "@/app/_features/hq/load-hq-dashboard-data";
import {
  getHqBriefingData,
  listHqQueuePlays,
} from "@/app/_features/hq/queries";
import { getTenantContext } from "@/app/_lib/tenancy";
import { listReconnectNeeded } from "@/app/_features/connectors/queries";
import { ReconnectBanner } from "@/app/_features/connectors/components/ReconnectBanner";

export default async function HqPage() {
  const { context } = await getTenantContext();
  const workspaceId = context.workspace?.id;

  const [briefing, queuePlays, sideRail, reconnectNeeded] = await Promise.all([
    getHqBriefingData(),
    listHqQueuePlays(),
    loadHqSideRailData(),
    workspaceId ? listReconnectNeeded(workspaceId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      {reconnectNeeded.length > 0 ? (
        <ReconnectBanner items={reconnectNeeded} />
      ) : null}
      <HqDashboardView briefing={briefing} queuePlays={queuePlays} sideRail={sideRail} />
    </div>
  );
}
