import { notFound } from "next/navigation";
import Link from "next/link";
import { getStudioContext } from "@/app/_lib/utils/user-dashboard";
import { getProposalWithClient } from "@/app/_features/proposals/queries";
import { ProposalEditor } from "@/app/_features/proposals/components/ProposalEditor";
import { ProposalHeader } from "./ProposalHeader";

export const dynamic = "force-dynamic";

export default async function ProposalEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getStudioContext();

  // Fetch proposal with client details
  const proposal = await getProposalWithClient(id);

  if (!proposal) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/dashboard/proposals"
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        ← Back to Proposals
      </Link>

      {/* Proposal Header with status and actions */}
      <ProposalHeader proposal={proposal} />

      {/* Editor */}
      <ProposalEditor proposal={proposal} />
    </div>
  );
}
