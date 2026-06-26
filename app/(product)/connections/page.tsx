import { Suspense } from "react";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";
import { ConnectionsPage } from "@/app/_features/connections/components/ConnectionsPage";
import { resolveMockContentEnabled } from "@/app/_lib/demo/mock-content";
import { createClient } from "@/app/_lib/supabase/server";
import ConnectionsLoading from "./loading";

async function ConnectionsGraphSection({ workspaceId }: { workspaceId: string }) {
  const graphData = await getConnectionsGraphData(workspaceId);
  return <ConnectionsPage initialGraphData={graphData} />;
}

export default async function ConnectionsRoute() {
  const { workspace } = await getWorkspaceContext();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isMockAccount = resolveMockContentEnabled({ email: user?.email });

  if (isMockAccount) {
    return <ConnectionsPage />;
  }

  return (
    <Suspense fallback={<ConnectionsLoading />}>
      <ConnectionsGraphSection workspaceId={workspace.id} />
    </Suspense>
  );
}
