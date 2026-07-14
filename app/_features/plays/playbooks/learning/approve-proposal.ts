/**
 * Playbook Improvement Proposals
 *
 * Synthesizes and approves playbook improvement proposals.
 * @deprecated This module is being phased out in favor of v2 playbooks.
 */

export interface ImprovementProposal {
  proposalId: string;
  blueprintSlug: string;
  proposedChanges: Record<string, unknown>;
  reason: string;
  score?: number;
}

export interface ApproveProposalInput {
  proposalId: string;
  reviewerUserId: string;
}

export interface ApproveProposalResult {
  blueprintSlug: string;
  version: number;
}

/**
 * Synthesize an improvement proposal from learning signals.
 * @deprecated V1 learning is deprecated.
 */
export async function synthesizePlaybookImprovementProposal(
  _blueprintSlug: string
): Promise<ImprovementProposal | null> {
  // Stub - v1 improvement proposals are deprecated
  return null;
}

/**
 * Approve an improvement proposal.
 * @deprecated V1 learning is deprecated.
 */
export async function approvePlaybookImprovementProposal(
  _input: ApproveProposalInput
): Promise<ApproveProposalResult> {
  // Stub - v1 improvement proposals are deprecated
  throw new Error("V1 playbook improvements are deprecated");
}
