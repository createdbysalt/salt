import { z } from "zod";
import type { SystemPlaySlug } from "../services/system-plays/types";

/** Memory surfaces that intelligence can propose creating or linking. */
export type MemoryProposalSurface =
  | "people"
  | "orgs"
  | "work"
  | "meetings"
  | "files"
  | "billing"
  | "conversations"
  | "me";

export const MEMORY_PROPOSAL_SURFACES = [
  "people",
  "orgs",
  "work",
  "meetings",
  "files",
  "billing",
  "conversations",
  "me",
] as const satisfies readonly MemoryProposalSurface[];

export const MemoryProposalSchema = z.object({
  surface: z.enum(MEMORY_PROPOSAL_SURFACES),
  action: z.enum(["create", "link", "update"]),
  hint: z.object({
    name: z.string().optional(),
    domain: z.string().optional(),
    datetime: z.string().optional(),
    existing_match_id: z.string().uuid().optional(),
  }),
  confidence: z.number().min(0).max(100),
  reason: z.string(),
  system_play: z.string(),
});

export type MemoryProposal = z.infer<typeof MemoryProposalSchema> & {
  system_play: SystemPlaySlug;
};

export const MIN_MEMORY_PROPOSAL_CONFIDENCE = 70;
export const MAX_MEMORY_PROPOSALS_PER_EMAIL = 3;

export function parseMemoryProposals(raw: unknown): MemoryProposal[] {
  if (!Array.isArray(raw)) return [];
  const parsed: MemoryProposal[] = [];
  for (const item of raw) {
    const result = MemoryProposalSchema.safeParse(item);
    if (result.success) {
      parsed.push(result.data as MemoryProposal);
    }
  }
  return parsed.slice(0, MAX_MEMORY_PROPOSALS_PER_EMAIL);
}

export function filterActionableMemoryProposals(
  proposals: MemoryProposal[]
): MemoryProposal[] {
  return proposals
    .filter((p) => p.confidence >= MIN_MEMORY_PROPOSAL_CONFIDENCE)
    .slice(0, MAX_MEMORY_PROPOSALS_PER_EMAIL);
}

export function memoryProposalFingerprint(proposal: MemoryProposal): string {
  return [
    proposal.surface,
    proposal.action,
    proposal.hint.name ?? "",
    proposal.hint.domain ?? "",
    proposal.hint.datetime ?? "",
    proposal.hint.existing_match_id ?? "",
  ].join("|");
}
