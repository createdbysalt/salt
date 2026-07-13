"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/app/_lib/supabase/server";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";

interface AcceptLearningEvidenceInput {
  workspaceId: string;
  fieldPath: string;
  proposedValue: string;
  evidenceIds: string[];
}

interface DismissLearningEvidenceInput {
  workspaceId: string;
  evidenceIds: string[];
}

export async function acceptLearningEvidence(
  input: AcceptLearningEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "applied",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("Failed to accept learning evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/plays");
  return { success: true };
}

export async function dismissLearningEvidence(
  input: DismissLearningEvidenceInput
): Promise<{ success: boolean; error?: string }> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const userId = context.userId;

  if (workspace.id !== input.workspaceId) {
    return { success: false, error: "Workspace mismatch" };
  }

  if (!userId) {
    return { success: false, error: "Sign in required" };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("entity_evidence")
    .update({
      resolved_at: now,
      resolution: "dismissed",
    })
    .in("id", input.evidenceIds)
    .eq("workspace_id", workspace.id);

  if (error) {
    console.error("Failed to dismiss learning evidence:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/plays");
  return { success: true };
}
