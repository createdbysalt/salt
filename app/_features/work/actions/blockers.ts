"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/app/_lib/utils/user-dashboard";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import { verifyWorkOwnership } from "@/app/_features/work/actions/verify-work-ownership";

export async function resolveBlocker(blockerId: string, note?: string) {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("work_blockers")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
      resolution_note: note ?? null,
    })
    .eq("id", blockerId)
    .eq("workspace_id", workspace.id)
    .select("work_id")
    .single();

  if (error) {
    console.error("Failed to resolve blocker:", error);
    throw new Error("Failed to resolve blocker");
  }

  scheduleWorkHealthRecompute(data.work_id as string);
  revalidatePath("/work");
}

export async function dismissBlocker(blockerId: string) {
  const { workspace, supabase, userId } = await getWorkspaceContext();

  const { data, error } = await supabase
    .from("work_blockers")
    .update({
      status: "dismissed",
      resolved_at: new Date().toISOString(),
      resolved_by: userId,
    })
    .eq("id", blockerId)
    .eq("workspace_id", workspace.id)
    .select("work_id")
    .single();

  if (error) {
    console.error("Failed to dismiss blocker:", error);
    throw new Error("Failed to dismiss blocker");
  }

  scheduleWorkHealthRecompute(data.work_id as string);
  revalidatePath("/work");
}

export async function createBlocker(input: {
  workId: string;
  blockerType: string;
  title: string;
  detail?: string;
}) {
  const { workspace, supabase } = await getWorkspaceContext();

  const ownership = await verifyWorkOwnership(supabase, input.workId, workspace.id);
  if (!ownership.ok) {
    throw new Error(ownership.message);
  }

  const { data, error } = await supabase
    .from("work_blockers")
    .insert({
      workspace_id: workspace.id,
      work_id: input.workId,
      blocker_type: input.blockerType,
      title: input.title,
      detail: input.detail ?? null,
      source: "user_flagged",
      confidence: 1.0,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create blocker:", error);
    throw new Error("Failed to create blocker");
  }

  scheduleWorkHealthRecompute(input.workId);
  revalidatePath("/work");
  return data;
}
