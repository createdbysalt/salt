/**
 * memoryResolveEvidence - Evidence Resolution Tool
 *
 * Resolves pending evidence (marks it as applied, dismissed, or superseded).
 * Usually called automatically by memoryUpdateField when changes are applied.
 */

import { resolveEvidence as coreResolve } from "@/app/_lib/learning";
import type { ResolveEvidenceInput, ResolveEvidenceResult } from "./types";

/**
 * Resolve pending evidence.
 *
 * Resolution types:
 * - "applied" - Evidence led to a field update
 * - "dismissed" - User explicitly rejected the evidence
 * - "superseded" - Newer evidence replaced this
 */
export async function memoryResolveEvidence(
  input: ResolveEvidenceInput
): Promise<ResolveEvidenceResult> {
  await coreResolve(
    input.workspaceId,
    input.evidenceIds,
    input.resolution,
    input.details
  );

  return {
    resolved: input.evidenceIds.length,
    resolution: input.resolution,
  };
}
