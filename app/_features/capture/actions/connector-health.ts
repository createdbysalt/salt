"use server";

import { revalidatePath } from "next/cache";
import { requireAuthenticatedWorkspaceMember } from "@/app/_lib/composio/workspace-auth";
import { enableCaptureTriggers } from "@/app/_lib/composio/trigger-subscriptions";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import { adapterForToolkit } from "../adapters/registry";
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

  const adapter = adapterForToolkit(provider);
  if (!adapter) {
    return { success: false, error: "No capture adapter for this connector" };
  }

  try {
    // Register triggers
    const triggerResult = await enableCaptureTriggers(member.workspaceId, provider);
    if (!triggerResult.ok) {
      return {
        success: false,
        error: triggerResult.error ?? "Failed to register triggers",
      };
    }

    // Enable capture flag
    const admin = createAdminClient();
    await admin
      .from("workspace_integrations")
      .update({ capture_enabled: true })
      .eq("workspace_id", member.workspaceId)
      .eq("provider", provider);

    revalidatePath("/settings/capture");
    return { success: true };
  } catch (error) {
    console.error(`[connector-health] Failed to fix ${provider}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fix connector",
    };
  }
}
