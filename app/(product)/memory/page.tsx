import { Suspense } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";
import { MemoryGraphPage } from "@/app/_features/connections/components/MemoryGraphPage";
import { resolveMockContentEnabled } from "@/app/_lib/demo/mock-content";
import { createClient } from "@/app/_lib/supabase/server";
import MemoryLoading from "./loading";

async function MemoryGraphSection({ workspaceId }: { workspaceId: string }) {
  const graphData = await getConnectionsGraphData(workspaceId);
  return <MemoryGraphPage initialGraphData={graphData} />;
}

export default async function MemoryRoute() {
  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isMockAccount = resolveMockContentEnabled({ email: user?.email });

  if (isMockAccount) {
    return <MemoryGraphPage />;
  }

  return (
    <Suspense fallback={<MemoryLoading />}>
      <MemoryGraphSection workspaceId={workspace.id} />
    </Suspense>
  );
}
