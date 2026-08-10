"use server";

import { getTenantContext } from "@/app/_lib/tenancy";
import { getWorkspaceMemberOrNull } from "@/app/_lib/tenancy/guards";
import { searchCaptureHistory } from "../queries";
import type { StreamCaptureSummary } from "../types";

export type SearchCaptureHistoryResult =
  | { success: true; results: StreamCaptureSummary[] }
  | { success: false; error: string };

/**
 * Activity-as-diagnostic (Sources plan 2.9): search the workspace's FULL
 * capture history — including dropped/held rows the stream hides. Each
 * result carries gate_action + gate_reason so the stream can answer
 * "did Salt see this, and what did it do with it?".
 */
export async function searchCaptureHistoryAction(input: {
  query: string;
}): Promise<SearchCaptureHistoryResult> {
  try {
    const { context } = await getTenantContext();
    const workspace = getWorkspaceMemberOrNull(context);

    if (!workspace) {
      return { success: false, error: "Not signed in" };
    }

    const results = await searchCaptureHistory(workspace.id, {
      query: input.query,
    });
    return { success: true, results };
  } catch (error) {
    console.error("[search-capture-history] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
