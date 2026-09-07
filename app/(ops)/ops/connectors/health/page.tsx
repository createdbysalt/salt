import { notFound } from "next/navigation";
import { Badge } from "@repo/ui";
import { getPlatformAdmin } from "@/app/_lib/admin/platform-admin";
import {
  getCanarySeries,
  getComposioHealth,
} from "@/app/_features/admin/queries";
import { PlaysSectionHeader } from "@/app/_features/plays/components/PlaysSectionHeader";
import { ConnectorTabs } from "../_components/ConnectorTabs";
import { CanaryChart } from "../_components/CanaryChart";
import { ConnectorsHealthSection } from "../_components/ConnectorsHealthSection";

export const dynamic = "force-dynamic";

/**
 * Connectors ops — Health tab: slug canary results and webhook ingress
 * outcomes. ?canary=failed is the shareable triage view.
 */
export default async function ConnectorHealthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getPlatformAdmin();
  if (!admin.ok) {
    notFound();
  }

  const params = await searchParams;
  const canaryFilter = typeof params.canary === "string" ? params.canary : undefined;

  const [health, canarySeries] = await Promise.all([
    getComposioHealth(),
    getCanarySeries(),
  ]);

  return (
    <div className="space-y-8">
      <ConnectorTabs active="/ops/connectors/health" />
      <PlaysSectionHeader title="Connectors" />
      {/*
       * Health is grouped per connector source. Composio machinery (slug
       * canary, webhook ingress) is Composio-specific; native connectors
       * will get their own probe section as a sibling here when they ship.
       */}
      <section aria-label="Composio health" className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Badge variant="outline">Composio</Badge>
          <p className="text-xs text-muted-foreground">
            Slug canary + webhook ingress for Composio-backed connectors.
          </p>
        </div>
        {canarySeries && <CanaryChart data={canarySeries.points} />}
        <ConnectorsHealthSection data={health} canaryFilter={canaryFilter} />
      </section>
    </div>
  );
}
