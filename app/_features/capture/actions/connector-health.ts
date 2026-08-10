"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { setCaptureState } from "@/app/_lib/composio/capture-state";
import {
  checkWorkspaceConnectorHealth,
  type WorkspaceHealthReport,
} from "../services/connector-health";

/**
 * Get connector health report for the current workspace.
 * Used by admin/debug UI to diagnose capture issues.
 */
export async function getConnectorHealthReport(): Promise<
  | { success: true; report: WorkspaceHealthReport }
  | { success: false; error: string }
> {
  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  try {
    const report = await checkWorkspaceConnectorHealth(member.workspaceId);
    return { success: true, report };
  } catch (error) {
    console.error("[connector-health] Failed to generate report:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to check connector health",
    };
  }
}

/**
 * Fix a connector that needs attention by registering triggers and enabling capture.
 */
export async function fixConnectorCapture(
  provider: string
): Promise<{ success: true } | { success: false; error: string }> {
  const member = await requireAuthenticatedWorkspaceMember();
  if (!member.ok) {
    return { success: false, error: member.error };
  }

  try {
    // Single write path: registers triggers and flips the flag together.
    const result = await setCaptureState(member.workspaceId, provider, true);
    if (!result.ok) {
      return { success: false, error: result.error };
    }

    revalidatePath("/sources");
    return { success: true };
  } catch (error) {
    console.error("[connector-health] Failed to fix provider:", provider, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fix connector",
    };
  }
}
