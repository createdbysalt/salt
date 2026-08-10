import { Suspense } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";
import { MemoryGraphPage } from "@/app/_features/connections/components/MemoryGraphPage";
import { MemoryTabs } from "@/app/_features/memory/components/MemoryTabs";
import { FilterTab } from "@/app/_features/memory/components/FilterTab";
import { CustomizeTab } from "@/app/_features/memory/components/CustomizeTab";
import {
  parseCustomizeType,
  parseMemoryTab,
  type MemoryTab,
} from "@/app/_features/memory/memory-tab-routing";
import type { MemoryCustomizeEntityType } from "@/app/_features/memory/customize/default-guidance";
import { listActiveCustomizeEntriesByType } from "@/app/_features/memory/customize/queries";
import { getLearningEvidence } from "@/app/_features/memory/queries/learning-evidence";
import { getHandledWrites } from "@/app/_features/memory/queries/handled-items";
import { getRecordCandidates } from "@/app/_features/memory/queries/record-candidates";
import { getCareThreshold } from "@/app/_features/memory/care/settings";
import { getLearnedWeights } from "@/app/_features/memory/care/actions";
import { resolveMockContentEnabled } from "@/app/_lib/demo/mock-content";
import { createClient } from "@/app/_lib/supabase/server";
import MemoryLoading from "./loading";

async function MemoryGraphSection({ workspaceId }: { workspaceId: string }) {
  const graphData = await getConnectionsGraphData(workspaceId);
  return <MemoryGraphPage initialGraphData={graphData} />;
}

async function MemoryFilterSection({ workspaceId }: { workspaceId: string }) {
  const [evidence, handledWrites, recordCandidates] = await Promise.all([
    getLearningEvidence(workspaceId),
    getHandledWrites(workspaceId),
    getRecordCandidates(workspaceId),
  ]);
  return (
    <FilterTab
      evidence={evidence}
      handledWrites={handledWrites}
      recordCandidates={recordCandidates}
      workspaceId={workspaceId}
    />
  );
}

async function MemoryCustomizeSection({
  workspaceId,
  type,
}: {
  workspaceId: string;
  type: MemoryCustomizeEntityType;
}) {
  const [entriesByType, threshold, learnedWeights] = await Promise.all([
    listActiveCustomizeEntriesByType(workspaceId),
    getCareThreshold(workspaceId),
    getLearnedWeights(workspaceId),
  ]);
  return (
    <CustomizeTab
      workspaceId={workspaceId}
      activeType={type}
      entriesByType={entriesByType}
      initialThreshold={threshold}
      learnedWeights={learnedWeights}
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
      <div className="mx-auto w-full max-w-[1400px] space-y-8 pb-10">
        <MemoryTabs active={tab} />
        {children}
      </div>
    </div>
  );
}

type SearchParams = Promise<{ tab?: string; type?: string }>;

export default async function MemoryRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const tab = parseMemoryTab(params.tab ?? null);
  const customizeType = parseCustomizeType(params.type ?? null);

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
        {tab === "activity" ? (
          <MemoryFilterSection workspaceId={workspace.id} />
        ) : (
          <MemoryCustomizeSection
            workspaceId={workspace.id}
            type={customizeType}
          />
        )}
      </Suspense>
    </MemoryShell>
  );
}
