"use server";

/**
 * Per-connector kept-out report (Connector Rules & Learning, P5).
 *
 * Backs the detail pane's Activity-tab report card: kept-out count, a
 * rule-vs-heuristic breakdown, and sample rows carrying the P4
 * category-dispatched correction actions.
 */

import { z } from "zod";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { getCategoryAdapter } from "@/app/_features/capture/adapters/categories";
import {
  getConnectorKeptOutReport,
  type ConnectorKeptOutReport,
} from "@/app/_features/memory/queries/admission-decisions";

type KeptOutResult =
  | { success: true; data: ConnectorKeptOutReport }
  | { success: false; error: string };

export async function fetchConnectorKeptOut(input: {
  provider: string;
}): Promise<KeptOutResult> {
  const provider = z.string().min(1).safeParse(input.provider);
  if (!provider.success) {
    return { success: false, error: "Invalid request." };
  }

  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  // The adapter resolves the capture-layer source type for this provider
  // (handles aliases like cal → calcom). No adapter = not capture-capable.
  const adapter = await getCategoryAdapter(provider.data);
  if (!adapter) {
    return {
      success: true,
      data: { total: 0, ruleCaused: 0, heuristicCaused: 0, sample: [] },
    };
  }

  const report = await getConnectorKeptOutReport(
    member.workspaceId,
    adapter.sourceType,
  );
  return { success: true, data: report };
}
