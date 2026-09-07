import { notFound } from "next/navigation";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import { getReviewQueueData } from "@/app/_features/connectors/admin/queries";
import { ClassificationReviewQueue } from "@/app/_features/connectors/admin/components/ClassificationReviewQueue";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectorTabs } from "../_components/ConnectorTabs";

export const dynamic = "force-dynamic";

/**
 * Connectors ops — Review queue tab: the classification queue
 * (connector-platform Phase 2.6). Every tool awaiting a human risk-class
 * verdict, plus unacknowledged catalog drift events.
 */
export default async function ConnectorReviewPage() {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const data = await getReviewQueueData();
  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <ConnectorTabs active="/ops/connectors/review" />
      <PlaysSectionHeader title="Connectors" />
      <ClassificationReviewQueue data={data} />
    </div>
  );
}
