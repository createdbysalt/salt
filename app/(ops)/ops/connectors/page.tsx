import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getComposioHealth } from "@/app/_features/admin/queries";
import { getReviewQueueData } from "@/app/_features/connectors/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectorTabs } from "./_components/ConnectorTabs";
import { ConnectorsOverviewSection } from "./_components/ConnectorsOverviewSection";

export const dynamic = "force-dynamic";

/**
 * Connectors ops — Overview tab: adoption and gate posture at a glance.
 * Verdicts happen in Review queue; probe detail lives in Health.
 */
export default async function ConnectorsOverviewPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const [health, review] = await Promise.all([
    getComposioHealth(),
    getReviewQueueData(),
  ]);

  return (
    <div className="space-y-8">
      <ConnectorTabs active="/ops/connectors" />
      <PlaysSectionHeader title="Connectors" />
      <ConnectorsOverviewSection health={health} review={review} />
    </div>
  );
}
