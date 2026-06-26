"use server";

import { revalidatePath } from "next/cache";
import { getTenantContext } from "@/app/_lib/tenancy";
import { requireWorkspaceMember } from "@/app/_lib/tenancy/guards";
import { createAdminClient } from "@/app/_lib/supabase/admin";
import type { ActionResult } from "@/app/_features/plays/actions";
import { WORK_PROFILE_SLUG } from "@/app/_features/plays/playbooks/profile/apply-work-profile";
import { writeProfileFieldProvenance } from "@/app/_features/plays/playbooks/profile/write-provenance";
import { scheduleWorkHealthRecompute } from "@/app/_features/work/health/recompute";
import type { WorkProfileFieldKey } from "@/app/_features/work/types";

export async function correctWorkProfileField(input: {
  workId: string;
  field: WorkProfileFieldKey;
  value: string;
}): Promise<ActionResult<{ workId: string }>> {
  const { context } = await getTenantContext();
  const workspace = requireWorkspaceMember(context);
  const admin = createAdminClient();

  const { data: work, error: workError } = await admin
    .from("projects")
    .select("id")
    .eq("id", input.workId)
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (workError || !work) {
    return {
      ok: false,
      errorCode: "WORK_NOT_FOUND",
      message: workError?.message ?? "Work item not found",
    };
  }

  const patch: Record<string, string | null> = {};
  if (input.field === "status") patch.status = input.value;
  if (input.field === "project_type") patch.project_type = input.value || null;
  if (input.field === "description") patch.description = input.value || null;
  if (input.field === "deadline") patch.deadline = input.value || null;
  if (input.field === "start_date") patch.start_date = input.value || null;

  const { error } = await admin
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", input.workId)
    .eq("workspace_id", workspace.id);

  if (error) {
    return { ok: false, errorCode: "UPDATE_FAILED", message: error.message };
  }

  await writeProfileFieldProvenance({
    workspaceId: workspace.id,
    entityType: "work",
    entityId: input.workId,
    field: input.field,
    value: input.value,
    source: "manual",
    ruleId: null,
    confidence: 100,
    evidence: { because: "You corrected this field" },
    blueprintSlug: WORK_PROFILE_SLUG,
    blueprintVersion: 1,
    status: "applied",
  });

  scheduleWorkHealthRecompute(input.workId);
  revalidatePath(`/work/${input.workId}`);
  revalidatePath("/work");
  revalidatePath("/plays");

  return { ok: true, data: { workId: input.workId } };
}
