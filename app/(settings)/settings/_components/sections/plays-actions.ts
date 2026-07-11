"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";

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
