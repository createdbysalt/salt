import { notFound } from "next/navigation";
import { getProposalByPublicId } from "@/app/_features/proposals/queries";
import { trackProposalView } from "@/app/_features/proposals/actions";
import { PROPOSAL_STATUS, ProposalStatus } from "@/app/_features/proposals/types";
import { getSEOTags } from "@/app/_lib/seo";
import { ProposalViewer } from "./ProposalViewer";

interface Props {
  params: Promise<{ proposalId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { proposalId } = await params;
  const proposal = await getProposalByPublicId(proposalId);

  if (!proposal) {
    return getSEOTags({ title: "Proposal Not Found" });
  }

  return getSEOTags({
    title: `${proposal.title} - Proposal`,
    description: `View and sign proposal for ${proposal.client.name}`,
    canonicalUrlRelative: `/proposal/${proposalId}`,
  });
}

export default async function PublicProposalPage({ params }: Props) {
  const { proposalId } = await params;

  // Fetch proposal by public_id
  const proposal = await getProposalByPublicId(proposalId);

  if (!proposal) {
    notFound();
  }

  // Check if proposal is in a viewable state
  const viewableStatuses: ProposalStatus[] = [
    PROPOSAL_STATUS.SENT,
    PROPOSAL_STATUS.VIEWED,
    PROPOSAL_STATUS.ACCEPTED,
    PROPOSAL_STATUS.DECLINED,
    PROPOSAL_STATUS.EXPIRED,
  ];

  if (!viewableStatuses.includes(proposal.status)) {
    // Draft proposals shouldn't be publicly accessible
    notFound();
  }

  // Track the view (async, don't block rendering)
  trackProposalView(proposalId);

  // Check if proposal is expired
  const isExpired =
    proposal.status === PROPOSAL_STATUS.EXPIRED ||
    Boolean(proposal.expires_at && new Date(proposal.expires_at) < new Date());

  // Check if already signed
  const isSigned = proposal.status === PROPOSAL_STATUS.ACCEPTED;

  // Check if declined
  const isDeclined = proposal.status === PROPOSAL_STATUS.DECLINED;

  return (
    <ProposalViewer
      proposal={proposal}
      isExpired={isExpired}
      isSigned={isSigned}
      isDeclined={isDeclined}
    />
  );
}
