"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";

export type WorkspaceTrustLevel = "read_only" | "act_with_approval" | "trust";

/**
 * Get the keeper autonomy threshold for a workspace.
 * Default is 85 if not set.
 */
export async function getKeeperAutonomyThreshold(
  workspaceId: string,
): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("keeper_auto_execute_threshold")
    .eq("id", workspaceId)
    .single();

  if (error) throw error;

  return data?.keeper_auto_execute_threshold ?? 85;
}

/**
 * Update the keeper autonomy threshold for a workspace.
 * Value must be between 50 and 100.
 */
export async function updateKeeperAutonomyThreshold(
  workspaceId: string,
  threshold: number,
): Promise<void> {
  if (threshold < 50 || threshold > 100) {
    throw new Error("Threshold must be between 50 and 100");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("workspaces")
    .update({ keeper_auto_execute_threshold: threshold })
    .eq("id", workspaceId);

  if (error) throw error;

  revalidatePath("/settings/plays");
  revalidatePath("/me");
}

/**
 * Get the workspace trust level for connectors.
 * Default is "read_only" if not set.
 */
export async function getWorkspaceTrustLevel(
  workspaceId: string,
): Promise<WorkspaceTrustLevel> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspaces")
    .select("trust_level")
    .eq("id", workspaceId)
    .single();

  if (error) throw error;

  const level = data?.trust_level;
  if (level === "act_with_approval" || level === "trust") {
    return level;
  }
  return "read_only";
}

/**
 * Update the workspace trust level for connectors.
 */
export async function updateWorkspaceTrustLevel(
  workspaceId: string,
  trustLevel: WorkspaceTrustLevel,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspaces")
    .update({ trust_level: trustLevel })
    .eq("id", workspaceId);

  if (error) throw error;

  revalidatePath("/settings/plays");
  revalidatePath("/settings"); // Connector modal reads trust from settingsByConnector
  revalidatePath("/connections");
  revalidatePath("/plays"); // Ask Salt tools depend on trust level
}
