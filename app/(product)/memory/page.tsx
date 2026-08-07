import { Suspense } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";
import { MemoryGraphPage } from "@/app/_features/connections/components/MemoryGraphPage";
import { MemoryTabs } from "@/app/_features/memory/components/MemoryTabs";
import { FilterTab } from "@/app/_features/memory/components/FilterTab";
import { RulesTab } from "@/app/_features/memory/components/RulesTab";
import { parseMemoryTab, type MemoryTab } from "@/app/_features/memory/memory-tab-routing";
import { getLearningEvidence } from "@/app/_features/memory/queries/learning-evidence";
import { getAdmissionDecisions } from "@/app/_features/memory/queries/admission-decisions";
import { getPlaybooksV2ForWorkspace } from "@/app/_features/plays/playbooks/queries-v2";
import { getKeeperAutonomyThreshold } from "@/app/(settings)/settings/_components/sections/plays-actions";
import { resolveMockContentEnabled } from "@/app/_lib/demo/mock-content";
import { createClient } from "@/app/_lib/supabase/server";
import MemoryLoading from "./loading";

const CARE_CAPABILITY_SLUGS = [
  "memory-records",
  "memory-hygiene",
  "connections",
  "notes",
] as const;

async function MemoryGraphSection({ workspaceId }: { workspaceId: string }) {
  const graphData = await getConnectionsGraphData(workspaceId);
  return <MemoryGraphPage initialGraphData={graphData} />;
}

async function MemoryFilterSection({ workspaceId }: { workspaceId: string }) {
  const [evidence, decisions] = await Promise.all([
    getLearningEvidence(workspaceId),
    getAdmissionDecisions(workspaceId),
  ]);
  return (
    <FilterTab
      evidence={evidence}
      decisions={decisions}
      workspaceId={workspaceId}
    />
  );
}

async function MemoryRulesSection({ workspaceId }: { workspaceId: string }) {
  const [playbooks, threshold] = await Promise.all([
    getPlaybooksV2ForWorkspace(),
    getKeeperAutonomyThreshold(workspaceId).catch(() => 85),
  ]);
  const capabilities = CARE_CAPABILITY_SLUGS.map((slug) => ({
    slug,
    enabled:
      playbooks.playbooks.find((p) => p.slug === slug)?.enabled ?? true,
  }));
  return (
    <RulesTab
      workspaceId={workspaceId}
      capabilities={capabilities}
      initialThreshold={threshold}
    />
  );
}

function MemoryShell({
  tab,
  children,
}: {
  tab: MemoryTab;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full">
      <div aria-hidden className="salt-ambient-wash" />
      <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-10">
        <MemoryTabs active={tab} />
        {children}
      </div>
    </div>
  );
}

type SearchParams = Promise<{ tab?: string }>;

export default async function MemoryRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = parseMemoryTab(params.tab ?? null);

  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isMockAccount = resolveMockContentEnabled({ email: user?.email });

  if (isMockAccount || tab === "map") {
    return (
      <MemoryShell tab={tab}>
        {isMockAccount ? (
          <MemoryGraphPage />
        ) : (
          <Suspense fallback={<MemoryLoading />}>
            <MemoryGraphSection workspaceId={workspace.id} />
          </Suspense>
        )}
      </MemoryShell>
    );
  }

  return (
    <MemoryShell tab={tab}>
      <Suspense fallback={<MemoryLoading />}>
        {tab === "filter" ? (
          <MemoryFilterSection workspaceId={workspace.id} />
        ) : (
          <MemoryRulesSection workspaceId={workspace.id} />
        )}
      </Suspense>
    </MemoryShell>
  );
}
