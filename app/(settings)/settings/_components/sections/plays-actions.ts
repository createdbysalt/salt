"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";

export type WorkspaceTrustLevel = "read_only" | "act_with_approval" | "trust";

// The Memory auto-apply threshold lives with Memory Care
// (`app/_features/memory/care/actions.ts`); this file keeps only connector
// trust settings.

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
  revalidatePath("/memory");
  revalidatePath("/plays"); // Ask Salt tools depend on trust level
}

/* ── Earned autonomy grants ── */

export interface AutonomyGrantItem {
  playbookSlug: string;
  toolSlug: string;
  approvedCount: number;
  grantedAt: string;
}

/**
 * Active earned-autonomy grants for this workspace (Settings → Plays).
 */
export async function getAutonomyGrants(
  workspaceId: string,
): Promise<AutonomyGrantItem[]> {
  const { listAutonomyGrants } = await import(
    "@/app/_features/plays/services/earned-autonomy"
  );
  return listAutonomyGrants(workspaceId);
}

/**
 * Revoke a grant — the step immediately returns to asking for approval.
 */
export async function revokeAutonomyGrant(
  workspaceId: string,
  playbookSlug: string,
  toolSlug: string,
): Promise<void> {
  const { revokeAutonomy } = await import(
    "@/app/_features/plays/services/earned-autonomy"
  );
  await revokeAutonomy(workspaceId, playbookSlug, toolSlug);
  revalidatePath("/settings/plays");
  revalidatePath("/plays");
}
