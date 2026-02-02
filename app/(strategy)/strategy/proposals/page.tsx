import { ProposalsPageClient } from "./ProposalsPageClient";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { listProposals } from "@/app/_features/proposals/queries";
import type { ProposalStatus } from "@/app/_features/proposals/types";

export const dynamic = "force-dynamic";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    client?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const { studio } = await getStudioContext();

  // Fetch proposals with filters
  const proposals = await listProposals({
    status: params.status as ProposalStatus | "all" | undefined,
    client_id: params.client,
    search: params.search,
  });

  // Fetch clients for the filter dropdown
  const { createClient } = await import("@/app/_lib/supabase/server");
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("studio_id", studio.id)
    .order("name");

  return (
    <ProposalsPageClient
      proposals={proposals}
      clients={clients || []}
      initialStatus={params.status as ProposalStatus | "all" | undefined}
      initialSearch={params.search}
    />
  );
}
