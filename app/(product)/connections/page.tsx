import { cookies } from "next/headers";
import { createClient } from "@/app/_lib/supabase/server";
import { getVerifiedWorkspaceMembership } from "@/app/_lib/tenancy/workspace-membership";
import { getConnectionsGraphData } from "@/app/_features/connections/queries";
import { ConnectionsPage } from "@/app/_features/connections/components/ConnectionsPage";
import { resolveMockContentEnabled } from "@/app/_lib/demo/mock-content";

export default async function ConnectionsRoute() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return <ConnectionsPage />;
  }

  // Check if this is a mock content account
  const isMockAccount = resolveMockContentEnabled({ email: user.email });

  // For mock accounts, don't fetch real data (they use demo data)
  if (isMockAccount) {
    return <ConnectionsPage />;
  }

  // Get workspace membership
  const membership = await getVerifiedWorkspaceMembership(user.id, supabase);

  if (!membership) {
    return <ConnectionsPage />;
  }

  // Fetch real graph data for non-mock accounts
  const graphData = await getConnectionsGraphData(membership.id);

  return <ConnectionsPage initialGraphData={graphData} />;
}
